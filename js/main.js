// Inicialização
$("#modal").addEventListener("close", () => render());
// Se algo inesperado acontecer, mostra o motivo na tela (ajuda a diagnosticar com um print)
window.addEventListener("error", (e) => toast("Algo deu errado: " + (e.message || "erro desconhecido")));
window.addEventListener("unhandledrejection", (e) =>
  toast("Algo deu errado: " + (e.reason?.message || e.reason)),
);
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
  document.querySelectorAll(".tip.show").forEach((x) => x !== t && x.classList.remove("show"));
  if (t) {
    e.preventDefault();
    t.classList.toggle("show");
  }
});
