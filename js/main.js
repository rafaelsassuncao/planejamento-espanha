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
