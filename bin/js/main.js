/* =====================
   SPLASH SCREEN
   ===================== */
window.addEventListener("load", () => {
  setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) splash.style.display = "none";
  }, 2000);
});

/* =====================
   SCROLL REVEAL
   ===================== */
const reveals = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

reveals.forEach(el => revealObserver.observe(el));

/* =====================
   SKILL TREE – CONNECTOR ENGINE (ONCE)
   ===================== */
let connectorMap = new Map();

function buildConnectors() {
  const tree = document.querySelector(".skill-tree");
  const svg = tree?.querySelector(".connectors");
  if (!tree || !svg) return;

  svg.innerHTML = "";
  connectorMap.clear();

  const nodes = Array.from(tree.querySelectorAll(".node"));
  const rect = tree.getBoundingClientRect();

  nodes.forEach(node => {
    const req = node.dataset.req;
    if (!req) return;

    const parent = tree.querySelector(`.node[data-skill="${req}"]`);
    if (!parent) return;

    const nRect = node.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();

    const line = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );

    line.dataset.child = node.dataset.skill;
    line.dataset.parent = req;

    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#2e9d94";

    line.setAttribute("stroke", accent);
    line.setAttribute("stroke-opacity", "0.45");
    line.setAttribute("stroke-width", "3.5");
    line.setAttribute("stroke-linecap", "round");

    svg.appendChild(line);
    connectorMap.set(node.dataset.skill, line);
  });

  updateConnectorPositions();
}

/* =====================
   CONNECTOR POSITION UPDATE (NO RESET)
   ===================== */
function updateConnectorPositions() {
  const tree = document.querySelector(".skill-tree");
  if (!tree) return;

  const rect = tree.getBoundingClientRect();

  connectorMap.forEach((line, skill) => {
    const node = tree.querySelector(`.node[data-skill="${skill}"]`);
    const parent = tree.querySelector(
      `.node[data-skill="${line.dataset.parent}"]`
    );
    if (!node || !parent) return;

    const nRect = node.getBoundingClientRect();
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
      nRect.left + nRect.width / 2 - rect.left
    );
    line.setAttribute(
      "y2",
      nRect.top + nRect.height / 2 - rect.top
    );
  });
}

/* =====================
   SKILL TREE – SEQUENTIAL ANIMATION
   ===================== */
async function animateSkillTree() {
  const tree = document.querySelector(".skill-tree");
  if (!tree) return;

  const nodes = Array.from(tree.querySelectorAll(".node"))
    .sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));

  // reset state
  nodes.forEach(n => n.classList.remove("visible"));
  connectorMap.forEach(line => line.classList.remove("draw"));

  buildConnectors();

  for (const node of nodes) {
    node.classList.add("visible");
    await new Promise(r => setTimeout(r, 140));

    const line = connectorMap.get(node.dataset.skill);
    if (line) {
      requestAnimationFrame(() => line.classList.add("draw"));
      await new Promise(r => setTimeout(r, 520));
    }
  }
}

/* =====================
   SKILL TREE – INIT ON VIEW (ONCE)
   ===================== */
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
    { threshold: 0.35 }
  );

  observer.observe(tree);
}

window.addEventListener("load", initSkillTreeAnimation);

/* =====================
   RESIZE – RECALCULATE ONLY
   ===================== */
window.addEventListener("resize", () => {
  updateConnectorPositions();
});

/* =====================
   MODAL
   ===================== */
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const closeBtn = modal?.querySelector(".close");

const projectData = {
  sip: `
    <h4>SIP Inventory System</h4>
    <p><strong>Role:</strong> Full-stack Developer</p>
    <p>Designed database schema and implemented lending workflows.</p>
    <ul>
      <li>Inventory tracking</li>
      <li>Status validation</li>
      <li>Admin controls</li>
    </ul>
  `
};

document.querySelectorAll(".detail-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    modalBody.innerHTML = projectData[btn.dataset.project];
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    closeBtn?.focus();
  });
});

function closeModal() {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

closeBtn?.addEventListener("click", closeModal);
modal?.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

/* =====================
   THEME TOGGLE
   ===================== */
(function setupThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      toggle.setAttribute("aria-pressed", "true");
      toggle.textContent = "🌙";
    } else {
      document.documentElement.removeAttribute("data-theme");
      toggle.setAttribute("aria-pressed", "false");
      toggle.textContent = "🌓";
    }
  }

  const stored = localStorage.getItem("theme");
  if (stored) applyTheme(stored);
  else if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    applyTheme("dark");
  }

  toggle.addEventListener("click", () => {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("theme", next);
  });
})();
