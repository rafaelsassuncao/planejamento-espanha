// Cálculos: previsão de custos, pagamentos, reservas por fonte, prazos e pasta do Consulado
const NEAR_DAYS = 7;
const isCost = (t) => t.kind === "cost",
  toBRL = (amount, currency) => amount * (currency === "EUR" ? data.rate : 1),
  bought = (t) => sum(t.purchases.map((p) => num(p.qty))),
  paidCur = (t) => sum(t.payments.map((p) => num(p.amount))),
  // Valor real desembolsado em reais, com a cotação registrada em cada pagamento
  paidBRL = (t) => sum(t.payments.map((p) => num(p.brl))),
  paySplit = (p) => (p.split?.length ? p.split : [{ sourceId: "", brl: num(p.brl) }]),
  validSource = (id) => (data.sources.some((s) => s.id === id) ? id : ""),
  sourceName = (id) => data.sources.find((s) => s.id === id)?.name || "Fonte não definida",
  eur = (brlValue) => money(brlValue / data.rate, "EUR");

// Previsão na moeda original: parte já conhecida e se ainda há valor a definir
function forecast(t) {
  if (!isCost(t)) return { known: 0, unknown: false };
  if (t.multi) {
    const real = sum(t.purchases.map((p) => num(p.value))),
      rest = Math.max(0, t.qty - bought(t));
    // Compras feitas entram pelo valor real; só as unidades restantes usam a estimativa
    return {
      known: real + (t.priceKnown ? rest * num(t.unitPrice) : 0),
      unknown: rest > 0 && !t.priceKnown,
    };
  }
  return t.priceKnown ? { known: t.value, unknown: false } : { known: 0, unknown: true };
}
// O que ainda falta pagar da parte orçada, convertido pela cotação atual
const outstandingCur = (t) => Math.max(0, forecast(t).known - paidCur(t)),
  outstandingBRL = (t) => toBRL(outstandingCur(t), t.currency);

function payStatus(t) {
  if (!isCost(t)) return { label: "Sem custo", cls: "muted" };
  const f = forecast(t),
    p = paidCur(t);
  if (t.legacyPaid && !p) return { label: "Pago (valor não registrado)", cls: "done" };
  if (!f.unknown && f.known > 0 && p >= f.known - 0.005) return { label: "Pago", cls: "done" };
  if (p > 0) return { label: "Parcialmente pago", cls: "warn" };
  if (f.unknown) return { label: "Valor a definir", cls: "muted" };
  return { label: "A pagar", cls: "" };
}

// Itens da pasta sem prazo próprio seguem o prazo geral da pasta
const inFolder = (t) => data.folder && t.category === data.folder.category,
  dueDate = (t) => t.date || (inFolder(t) && data.folder.deadline) || "";
function dueStatus(t) {
  const s = dueDate(t);
  if (!s) return null;
  if (t.status === "Concluído") return { key: "done", label: "Concluído", cls: "done" };
  const n = daysUntil(s);
  if (n < 0) return { key: "late", label: `Atrasado há ${-n} dia${n === -1 ? "" : "s"}`, cls: "late" };
  if (n === 0) return { key: "today", label: "Vence hoje", cls: "warn" };
  if (n <= NEAR_DAYS) return { key: "near", label: `Vence em ${n} dia${n === 1 ? "" : "s"}`, cls: "warn" };
  return { key: "ok", label: "Dentro do prazo", cls: "" };
}

// Reserva por fonte para o que falta pagar desta despesa; o que já foi pago não é reservado de novo
function reserves(t) {
  const out = {};
  let rest = isCost(t) ? outstandingBRL(t) : 0;
  for (const a of t.alloc) {
    if (rest <= 0.005) break;
    let r = rest;
    if (a.brl !== null && a.brl !== "") {
      const paidFrom = sum(
        t.payments
          .flatMap(paySplit)
          .filter((s) => s.sourceId === a.sourceId)
          .map((s) => num(s.brl)),
      );
      r = Math.min(rest, Math.max(0, num(a.brl) - paidFrom));
    }
    out[a.sourceId] = (out[a.sourceId] || 0) + r;
    rest -= r;
  }
  if (rest > 0.005) out[""] = (out[""] || 0) + rest;
  return out;
}

// Saldos por fonte; skipTask/skipPayment ignoram um registro em edição para validar a alteração
function sourceStats(skipTask, skipPayment) {
  const st = {},
    get = (id) => (st[validSource(id)] ??= { received: 0, expected: 0, used: 0, reserved: 0 });
  data.sources.forEach((s) => get(s.id));
  get("");
  data.income.forEach((i) => (get(i.sourceId)[i.received ? "received" : "expected"] += num(i.value)));
  data.tasks.forEach((t) => {
    t.payments
      .filter((p) => p.id !== skipPayment)
      .flatMap(paySplit)
      .forEach((s) => (get(s.sourceId).used += num(s.brl)));
    if (t.id !== skipTask) Object.entries(reserves(t)).forEach(([id, v]) => (get(id).reserved += v));
  });
  Object.values(st).forEach((s) => {
    s.current = s.received - s.used;
    s.free = s.current - s.reserved;
  });
  return st;
}

function totals(list = data.tasks) {
  const costs = list.filter(isCost),
    paid = sum(costs.map(paidBRL)),
    open = sum(costs.map(outstandingBRL));
  return { paid, open, total: paid + open, unknown: costs.filter((t) => forecast(t).unknown).length };
}
function overall() {
  const t = totals(),
    received = sum(data.income.filter((i) => i.received).map((i) => num(i.value))),
    expected = sum(data.income.filter((i) => !i.received).map((i) => num(i.value)));
  return { ...t, received, expected, current: received - t.paid, projected: received - t.paid - t.open };
}

// Etapas planejadas cobertas pelas compras feitas, na ordem das datas
function planSteps(t) {
  let covered = bought(t);
  return [...t.plan]
    .sort((a, b) => (a.date || "9").localeCompare(b.date || "9"))
    .map((s) => {
      const done = covered >= num(s.qty) - 1e-9;
      covered -= num(s.qty);
      return { ...s, done };
    });
}

// Ao comprar tudo, a pendência é concluída; se uma compra for removida, ela é reaberta
function syncAcquisition(t) {
  if (!t.multi) return;
  const b = bought(t);
  if (b >= t.qty && t.status !== "Concluído") {
    t.status = "Concluído";
    t.autoDone = true;
    toast("Quantidade completa: aquisição concluída");
  } else if (b < t.qty && t.status === "Concluído" && t.autoDone) {
    t.status = b > 0 ? "Em andamento" : "Pendente";
    t.autoDone = false;
  } else if (b > 0 && b < t.qty && t.status === "Pendente") t.status = "Em andamento";
}

function folderInfo() {
  const f = data.folder;
  if (!f || !categories.includes(f.category)) return null;
  const items = data.tasks.filter((t) => t.category === f.category && t.required),
    done = items.filter((t) => t.status === "Concluído").length,
    pending = items.length - done,
    days = f.deadline ? daysUntil(f.deadline) : null,
    lateItems = items.filter((t) => dueStatus(t)?.key === "late").length,
    late = pending > 0 && (lateItems > 0 || (days !== null && days < 0));
  const left = pending === 1 ? "Falta 1 item obrigatório" : `Faltam ${pending} itens obrigatórios`;
  let tone = "",
    message = left + ".";
  if (!items.length) message = "Marque quais itens são obrigatórios para acompanhar a pasta.";
  else if (late) {
    tone = "late";
    message = `Atenção: há atraso. ${left}.`;
  } else if (!pending) {
    tone = "done";
    message =
      "Checklist da pasta concluído! Você já pode encaminhar os documentos à consultoria para conferência e organização do processo.";
  } else if (pending <= 3) {
    tone = "warn";
    message = `Sua pasta está quase pronta! ${left}.`;
  }
  return { ...f, items, done, pending, days, late, tone, message };
}
