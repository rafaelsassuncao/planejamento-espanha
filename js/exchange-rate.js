// Cotação EUR/BRL (AwesomeAPI)
let rateLoading = false,
  rateError = "";
function refreshRateDisplay() {
  if (!$("#modal").open && (page === "overview" || page === "settings")) render();
}

function rateInfo() {
  return (
    (rateLoading
      ? "Consultando cotação…"
      : rateError ||
        (data.rateAt
          ? "Cotação de " +
            new Date(data.rateAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) +
            " • AwesomeAPI (venda)"
          : "Aguardando cotação automática; valor inicial de referência.")) +
    "<br>Câmbio comercial de referência, sem taxas. Em dias sem negociação, usamos a última cotação disponível."
  );
}
async function refreshRate(manual = false) {
  if (rateLoading) return;
  rateLoading = true;
  rateError = "";
  refreshRateDisplay();
  try {
    const response = await fetch("https://economia.awesomeapi.com.br/json/last/EUR-BRL", {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error();
    const q = (await response.json()).EURBRL;
    const value = Number(q.ask),
      time = Number(q.timestamp) * 1000;
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(time) || time <= 0) throw Error();
    data.rate = value;
    data.rateAt = new Date(time).toISOString();
    data.rateFetchedAt = new Date().toISOString();
    save();
    if (manual) toast("Cotação atualizada");
  } catch {
    rateError =
      "Não foi possível consultar agora. " +
      (data.rateAt
        ? "Mantida a cotação de " +
          new Date(data.rateAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
        : "Usando o valor inicial de referência; tente atualizar novamente.");
  } finally {
    rateLoading = false;
    refreshRateDisplay();
  }
}
