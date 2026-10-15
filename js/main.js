// Inicialização
$("#modal").addEventListener("close", () => render());
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
