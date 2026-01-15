/* SPLASH SCREEN (PHASED) */
document.body.classList.add("is-loading");

window.addEventListener("load", () => {
  const splash = document.getElementById("splash");
  const app = document.getElementById("app");

  if (app) app.setAttribute("aria-hidden", "true");

  const splashNetwork = initSplashNetwork();

  try {
    enableScrollHeader();
    initScrollReveal();
    const bgReady = initBackgroundNetwork();

    const waitForFonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.all([waitForFonts, bgReady]).then(() => {
      try { buildConnectors(); updateConnectorPositions(); } catch (e) {}
    }).catch(() => {
      try { buildConnectors(); updateConnectorPositions(); } catch (e) {}
    });
  } catch (err) {
    // non-fatal: if any init isn't available yet, continue and let
    // the later initialization handle it.
  }

  // tampilkan splash then reveal app while splash fades
  setTimeout(() => {
    splash?.classList.add("is-hidden");

    // reveal function: wait for fonts to settle to avoid FOUT layout shift
    const revealApp = () => {
      // reveal app only after we've pre-initialized layout
      document.body.classList.add("ready");
      if (app) app.removeAttribute("aria-hidden");

      // mulai fade network
      splashNetwork.fadeOut();

      // setelah animasi exit: stop network loops and remove splash
      setTimeout(() => {
        try { splashNetwork.stop && splashNetwork.stop(); } catch (e) {}

        document.body.classList.remove("is-loading");

        // remove splash element from DOM to avoid z-index/layout interference
        splash?.remove();

        // ensure layout/scrollbar/paint have settled then recalc connectors
        requestAnimationFrame(() => requestAnimationFrame(() => {
          try { updateConnectorPositions(); } catch (e) {}
        }));

        // some inits are better run after the splash is fully gone
        try { initSkillTreeAnimation(); } catch (e) {}
      }, 600);
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(revealApp);
    } else {
      revealApp();
    }
  }, 1800);
});


/* SPLASH NETWORK (INTRO) */
function initSplashNetwork() {
  const canvas = document.getElementById("splash-network");

  // fallback aman (anti crash)
  if (!canvas) {
    return {
      fadeOut() {},
      stop() {}
    };
  }

  const ctx = canvas.getContext("2d");

  let running = true;
  let rafId = null;

  let phase = "free";
  let startTime = performance.now();

  let fadingOut = false;
  let fadeStart = null;

  const FADE_DURATION = 600;

  const NODE_COUNT = 42;
  const BASE_DIST = 190;
  const LOGO_RADIUS = 70;

  let centerPull = 0.0008;

  const center = { x: 0, y: 0 };
  let w = 0, h = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;

    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);

    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    center.x = window.innerWidth / 2;
    center.y = window.innerHeight / 2;
  }

  window.addEventListener("resize", resize);
  resize();

  const nodes = Array.from({ length: NODE_COUNT }, () => ({
    x: center.x + (Math.random() - 0.5) * 260,
    y: center.y + (Math.random() - 0.5) * 260,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2
  }));

  function loop() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = performance.now();
    const elapsed = now - startTime;

    if (elapsed > 600 && phase === "free") phase = "converge";
    if (elapsed > 1400 && phase === "converge") phase = "settle";

    if (phase === "converge") {
      centerPull = Math.min(centerPull + 0.00008, 0.0022);
    }

    if (phase === "settle") {
      centerPull = 0.0035;
    }

    let alpha = 1;

    if (fadingOut) {
      if (!fadeStart) fadeStart = now;
      const t = (now - fadeStart) / FADE_DURATION;
      alpha = Math.max(0, 1 - t);
      centerPull *= 0.92;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // physics
    for (const n of nodes) {
      const dxC = n.x - center.x;
      const dyC = n.y - center.y;
      const distC = Math.hypot(dxC, dyC);

      if (phase === "settle" && distC < LOGO_RADIUS) {
        n.vx += dxC * 0.02;
        n.vy += dyC * 0.02;
        n.vx *= 0.8;
        n.vy *= 0.8;
      }

      n.vx += (center.x - n.x) * centerPull;
      n.vy += (center.y - n.y) * centerPull;

      n.x += n.vx;
      n.y += n.vy;

      const damping = phase === "settle" ? 0.88 : 0.96;
      n.vx *= damping;
      n.vy *= damping;
    }

    // lines
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);

        if (d < BASE_DIST) {
          const k = 1 - d / BASE_DIST;
          ctx.strokeStyle = `rgba(255,255,255,${0.15 + k * 0.25})`;
          ctx.lineWidth = 0.6 + k * 1.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes
    ctx.fillStyle = "#2e9d94";
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    rafId = requestAnimationFrame(loop);
  }

  loop();

  return {
    fadeOut() {
      fadingOut = true;
    },
    stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
}


/* HEADER SCROLL */
const header = document.querySelector(".header");

function enableScrollHeader() {
  if (!header) return;

  window.addEventListener("scroll", () => {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  });
}



const photo = document.querySelector(".photo-img");
if (photo && !("ontouchstart" in window)) {
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;

  const strength = 6; // <= JANGAN LEBIH DARI 8
  const ease = 0.1;

  window.addEventListener("mousemove", (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * strength * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * strength * 2;
    targetX = x;
    targetY = y;
  });

  function animate() {
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    photo.style.transform =
      `translate3d(${currentX}px, ${currentY}px, 0)`;

    requestAnimationFrame(animate);
  }

  animate();
}

/* SKILL TREE – CONNECTOR ENGINE*/
const connectorMap = new Map();

function buildConnectors() {
  const tree = document.querySelector(".skill-tree");
  const svg = tree?.querySelector(".connectors");
  if (!tree || !svg) return;

  svg.innerHTML = "";
  connectorMap.clear();

  const nodes = Array.from(tree.querySelectorAll(".node"));
  const rect = tree.getBoundingClientRect();

  nodes.forEach(node => {
    const parentSkill = node.dataset.req;
    if (!parentSkill) return;

    const parent = tree.querySelector(
      `.node[data-skill="${parentSkill}"]`
    );
    if (!parent) return;

    const line = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );

    line.dataset.child = node.dataset.skill;
    line.dataset.parent = parentSkill;

    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#2e9d94";

    line.setAttribute("stroke", accent);
    line.setAttribute("stroke-opacity", "0.35");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");

    svg.appendChild(line);
    connectorMap.set(node.dataset.skill, line);
  });

  updateConnectorPositions();
}

/*UPDATE CONNECTOR POSITIONS*/
function updateConnectorPositions() {
  const tree = document.querySelector(".skill-tree");
  if (!tree) return;

  const rect = tree.getBoundingClientRect();

  connectorMap.forEach((line, skill) => {
    const child = tree.querySelector(`.node[data-skill="${skill}"]`);
    const parent = tree.querySelector(
      `.node[data-skill="${line.dataset.parent}"]`
    );
    if (!child || !parent) return;

    const cRect = child.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();

    line.setAttribute(
      "x1",
      pRect.left + pRect.width / 2 - rect.left
    );
    line.setAttribute(
      "y1",
      pRect.top + pRect.height / 2 - rect.top
    );
    line.setAttribute(
      "x2",
      cRect.left + cRect.width / 2 - rect.left
    );
    line.setAttribute(
      "y2",
      cRect.top + cRect.height / 2 - rect.top
    );
  });
}

/* SKILL TREE – SEQUENTIAL FLOW*/
async function animateSkillTree() {
  const tree = document.querySelector(".skill-tree");
  if (!tree) return;

  const nodes = Array.from(tree.querySelectorAll(".node"))
    .sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));

  // reset
  nodes.forEach(n => n.classList.remove("visible"));
  connectorMap.forEach(line => line.classList.remove("draw"));

  buildConnectors();

  for (const node of nodes) {
    const parentSkill = node.dataset.req;

    // 1️⃣ DRAW LINE FIRST
    if (parentSkill) {
      const line = connectorMap.get(node.dataset.skill);
      if (line) {
        requestAnimationFrame(() => line.classList.add("draw"));
        await new Promise(r => setTimeout(r, 160));
      }
    }

    // 2️⃣ THEN SHOW NODE
    node.classList.add("visible");
    await new Promise(r => setTimeout(r, 50));
  }
}

/* INIT SKILL TREE ON VIEW*/
function initSkillTreeAnimation() {
  const tree = document.querySelector(".skill-tree");
  if (!tree) return;

  let played = false;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !played) {
          played = true;
          animateSkillTree();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.4 }
  );

  observer.observe(tree);
}

window.addEventListener("load", initSkillTreeAnimation);
window.addEventListener("resize", updateConnectorPositions);

/*SCROLL REVEAL*/
function initScrollReveal() {
  const reveals = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -80px 0px"
    }
  );

  reveals.forEach(el => observer.observe(el));
}



/* BACKGROUND NETWORK */
function initBackgroundNetwork() {
  const canvas = document.getElementById("bg-network");
  if (!canvas) return Promise.resolve();

  const ctx = canvas.getContext("2d");
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  resize();

  const nodes = Array.from({ length: 80 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4
  }));

  const mouse = { x: w / 2, y: h / 2 };
  window.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  let firstDraw = false;

  const ready = new Promise(resolve => {
    function loop() {
      ctx.clearRect(0, 0, w, h);

      nodes.forEach((n, i) => {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);

        if (d < 160) {
          const f = (1 - d / 160) * 0.08;
          n.vx += dx * f;
          n.vy += dy * f;
        }

        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.98;
        n.vy *= 0.98;

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dist = Math.hypot(n.x - m.x, n.y - m.y);
          if (dist < 140) {
            ctx.strokeStyle = `rgba(46,157,148,${1 - dist / 140})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#2e9d94";
        ctx.fill();
      });

      if (!firstDraw) {
        firstDraw = true;
        resolve();
      }

      requestAnimationFrame(loop);
    }

    loop();
  });

  return ready;
}
