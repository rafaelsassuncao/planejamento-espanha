// Movimentos: entrada da página em cascata, valores que contam, brilho que segue o mouse e "concluir" animado
const calm = matchMedia("(prefers-reduced-motion: reduce)");
let shownPage = null;

// Ao trocar de página, os blocos sobem em cascata e os valores dos cartões contam até o total
const baseRender = render;
render = function () {
  baseRender();
  if (page === shownPage) return;
  shownPage = page;
  if (calm.matches) return;
  const app = $("#app");
  app.classList.remove("entering");
  void app.offsetWidth;
  app.classList.add("entering");
  clearTimeout(app.enterTimer);
  app.enterTimer = setTimeout(() => app.classList.remove("entering"), 1700);
  document.querySelectorAll(".card.kpi .amount").forEach(countUp);
};

// Conta de zero até o valor mostrado, mantendo o mesmo formato (R$ 1.234,56)
function countUp(el) {
  const final = el.textContent,
    m = final.match(/\d[\d.]*,\d{2}/);
  if (!m || el.children.length) return;
  const end = Number(m[0].replace(/\./g, "").replace(",", ".")),
    t0 = performance.now(),
    T = 1300,
    fmt = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const step = (t) => {
    if (!el.isConnected) return;
    const p = Math.min(1, (t - t0) / T),
      e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    el.textContent = p === 1 ? final : final.replace(m[0], fmt(end * e));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Brilho suave que acompanha o mouse sobre os cartões
document.addEventListener(
  "pointermove",
  (e) => {
    if (e.pointerType !== "mouse") return;
    const c = e.target.closest?.(".card, .panel, .sumcard, .folder");
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", e.clientX - r.left + "px");
    c.style.setProperty("--my", e.clientY - r.top + "px");
  },
  { passive: true },
);

// Concluir: o círculo estoura em verde e a linha sai deslizando antes de a lista atualizar
document.addEventListener(
  "click",
  (e) => {
    const b = e.target.closest(".donebtn");
    if (!b || b.classList.contains("on") || calm.matches) return;
    if (b.dataset.animated) return delete b.dataset.animated;
    e.stopPropagation();
    e.preventDefault();
    b.classList.add("popping");
    b.closest(".checkrow, .nextrow")?.classList.add("leaving");
    setTimeout(() => {
      b.dataset.animated = "1";
      b.click();
    }, 560);
  },
  true,
);
