// Inicialização
$("#modal").addEventListener("close", () => render());
// Se algo inesperado acontecer, mostra o motivo na tela (ajuda a diagnosticar com um print)
window.addEventListener("error", (e) => toast("Algo deu errado: " + (e.message || "erro desconhecido")));
window.addEventListener("unhandledrejection", (e) =>
  toast("Algo deu errado: " + (e.reason?.message || e.reason)),
);
// Volta para onde estava quando o celular recarrega a página (vale por 30 minutos)
const SPOT = KEY + "-tela";
try {
  const s = JSON.parse(localStorage.getItem(SPOT));
  if (s && Date.now() - s.at < 30 * 60 * 1000 && ["overview", "tasks", "income", "settings"].includes(s.page)) {
    page = s.page;
    if (categories.includes(s.cat)) cat = s.cat;
    if (["fontes", "entradas", "cartoes"].includes(s.incomePart)) incomePart = s.incomePart;
  }
} catch {}
addEventListener("pagehide", () => {
  try {
    localStorage.setItem(SPOT, JSON.stringify({ page, cat, incomePart, at: Date.now() }));
  } catch {}
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden)
    try {
      localStorage.setItem(SPOT, JSON.stringify({ page, cat, incomePart, at: Date.now() }));
    } catch {}
});
// Menu recolhido (só ícones) no computador, lembrado neste aparelho
function toggleNav(force) {
  const on = force ?? !document.body.classList.contains("nav-collapsed"),
    b = $(".navtoggle");
  document.body.classList.toggle("nav-collapsed", on);
  b.setAttribute("aria-label", on ? "Expandir menu" : "Recolher menu");
  b.title = b.getAttribute("aria-label");
  if (force === undefined)
    try {
      localStorage.setItem(KEY + "-menu", on ? "1" : "0");
    } catch {}
  placePill();
}
try {
  if (localStorage.getItem(KEY + "-menu") === "1") toggleNav(true);
} catch {}
render();
refreshRate();
setInterval(() => refreshRate(), 60 * 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (
    !document.hidden &&
    (!data.rateFetchedAt || Date.now() - new Date(data.rateFetchedAt).getTime() > 60 * 60 * 1000)
  )
    refreshRate();
});
// Fecha o menu "⋯" das pendências ao clicar fora dele
document.addEventListener("click", (e) => {
  document
    .querySelectorAll("details.rowmenu[open], details.morefilters[open]")
    .forEach((d) => !d.contains(e.target) && (d.open = false));
});
// Dica ⓘ: abre e fecha com um toque (no celular nem sempre há "passar o mouse")
document.addEventListener("click", (e) => {
  const t = e.target.closest(".tip");
  document.querySelectorAll(".tip.show").forEach((x) => {
    if (x !== t) {
      x.classList.remove("show");
      x.setAttribute("aria-expanded", "false");
    }
  });
  if (t) {
    e.preventDefault();
    const open = !t.classList.contains("show");
    t.classList.toggle("show", open);
    t.setAttribute("aria-expanded", String(open));
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll(".tip.show").forEach((t) => {
    t.classList.remove("show");
    t.setAttribute("aria-expanded", "false");
  });
});
