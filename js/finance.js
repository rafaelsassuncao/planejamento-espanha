// Cálculos: previsão de custos, pagamentos, crédito parcelado, reservas por fonte, prazos e pasta do Consulado
const NEAR_DAYS = 7;
const isCost = (t) => t.kind === "cost",
  toBRL = (amount, currency) => amount * (currency === "EUR" ? data.rate : 1),
  bought = (t) => sum(t.purchases.map((p) => num(p.qty))),
  paySplit = (p) => (p.split?.length ? p.split : [{ sourceId: "", brl: num(p.brl) }]),
  validSource = (id) => (data.sources.some((s) => s.id === id) ? id : ""),
  sourceName = (id) => data.sources.find((s) => s.id === id)?.name || "Fonte não definida",
  accountName = (id) => data.accounts.find((a) => a.id === id)?.name || "",
  methodName = (m) => METHODS.find((x) => x[0] === m)?.[1] || "Forma não informada",
  isConfirmed = (p) => p.confirmed !== false,
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

const installments = (t) => t.credits.flatMap((c) => c.installments.map((i) => ({ c, i }))),
  plannedSource = (c, i) => i.sourceId ?? c.sourceId ?? "";
// Dinheiro que já saiu: pagamentos confirmados e parcelas pagas, pelo valor em reais registrado
const outflows = (t) => [
    ...t.payments.filter(isConfirmed).map((p) => ({
      ref: p.id,
      date: p.date,
      label: methodName(p.method),
      brl: num(p.brl),
      split: paySplit(p),
    })),
    ...installments(t)
      .filter(({ i }) => i.payment)
      .map(({ c, i }) => ({
        ref: i.id,
        date: i.payment.date,
        label: `Parcela ${i.n}/${c.installments.length} · ${accountName(c.accountId)}`,
        brl: num(i.payment.brl),
        split: paySplit(i.payment),
      })),
  ],
  // Já combinado, mas o dinheiro ainda não saiu: pagamentos agendados e parcelas em aberto
  commitments = (t) => [
    ...t.payments
      .filter((p) => !isConfirmed(p))
      .map((p) => ({ ref: p.id, brl: num(p.brl), split: paySplit(p) })),
    ...installments(t)
      .filter(({ i }) => !i.payment)
      .map(({ c, i }) => ({
        ref: i.id,
        brl: num(i.brl),
        split: [{ sourceId: plannedSource(c, i), brl: num(i.brl) }],
      })),
  ],
  paidBRL = (t) => sum(outflows(t).map((o) => o.brl)),
  committedBRL = (t) => sum(commitments(t).map((o) => o.brl)),
  // Parte da despesa já acertada com o fornecedor (à vista ou no crédito), na moeda original
  coveredCur = (t) => sum(t.payments.map((p) => num(p.amount))) + sum(t.credits.map((c) => num(c.amount))),
  uncoveredCur = (t) => Math.max(0, forecast(t).known - coveredCur(t)),
  // Ainda a pagar: compromissos em aberto + o que falta acertar, este pela cotação atual
  outstandingBRL = (t) => committedBRL(t) + toBRL(uncoveredCur(t), t.currency);

function payStatus(t) {
  if (!isCost(t)) return { label: "Sem custo", cls: "muted" };
  const f = forecast(t),
    cov = coveredCur(t);
  if (t.legacyPaid && !cov) return { label: "Pago (valor não registrado)", cls: "done" };
  const settled = !f.unknown && f.known > 0 && cov >= f.known - 0.005;
  if (settled && committedBRL(t) < 0.005) return { label: "Pago", cls: "done" };
  if (settled)
    return installments(t).some(({ i }) => !i.payment)
      ? { label: "Parcelas em aberto", cls: "prog" }
      : { label: "Pagamento agendado", cls: "prog" };
  if (cov > 0) return { label: "Parcialmente pago", cls: "warn" };
  if (f.unknown) return { label: "Valor a definir", cls: "muted" };
  return { label: "A pagar", cls: "" };
}
// Aquisição/entrega é independente da conclusão da tarefa e do pagamento
function acqStatus(t) {
  if (!isCost(t)) return null;
  if (t.multi) {
    const b = bought(t);
    if (b >= t.qty) return { label: "Aquisição concluída", cls: "done" };
    return b > 0 ? { label: "Comprando em etapas", cls: "prog" } : { label: "Não adquirido", cls: "muted" };
  }
  return t.acquired
    ? { label: "Adquirido / entregue", cls: "done" }
    : { label: "Aguardando aquisição", cls: "muted" };
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

// Reserva por fonte: compromissos em aberto ficam na fonte escolhida; o restante segue a origem planejada
function reserves(t) {
  const out = {},
    add = (id, v) => v > 0.005 && (out[id] = (out[id] || 0) + v);
  if (!isCost(t)) return out;
  const open = commitments(t);
  open.forEach((x) => x.split.forEach((s) => add(s.sourceId, num(s.brl))));
  let rest = toBRL(uncoveredCur(t), t.currency);
  // O que já saiu ou já está comprometido de uma fonte não é reservado de novo
  const fromSource = (id) =>
    sum(
      [...outflows(t), ...open]
        .flatMap((o) => o.split)
        .filter((s) => s.sourceId === id)
        .map((s) => num(s.brl)),
    );
  for (const a of t.alloc) {
    if (rest <= 0.005) break;
    const r =
      a.brl !== null && a.brl !== ""
        ? Math.min(rest, Math.max(0, num(a.brl) - fromSource(a.sourceId)))
        : rest;
    add(a.sourceId, r);
    rest -= r;
  }
  add("", rest);
  return out;
}

// Saldos por fonte; skipTask/skipRef ignoram um registro em edição para validar a alteração
function sourceStats(skipTask, skipRef) {
  const st = {},
    get = (id) => (st[validSource(id)] ??= { received: 0, expected: 0, used: 0, reserved: 0 });
  data.sources.forEach((s) => get(s.id));
  get("");
  data.income.forEach((i) => (get(i.sourceId)[i.received ? "received" : "expected"] += num(i.value)));
  data.tasks.forEach((t) => {
    outflows(t)
      .filter((o) => o.ref !== skipRef)
      .flatMap((o) => o.split)
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

// Parcelas iguais (a última ajusta os centavos); mantém pagamentos das parcelas que continuam iguais
function buildInstallments(brl, n, firstDue, keep = []) {
  const base = Math.floor((brl / n) * 100) / 100;
  return Array.from({ length: n }, (_, k) => {
    const old = keep[k];
    return {
      id: old?.id || uid(),
      n: k + 1,
      due: addMonths(firstDue, k),
      brl: k < n - 1 ? base : round2(brl - base * (n - 1)),
      ...(old?.sourceId !== undefined ? { sourceId: old.sourceId } : {}),
      ...(old?.payment ? { payment: old.payment } : {}),
    };
  });
}
// Faturas em aberto por cartão e mês de vencimento
function openBills() {
  const bills = {};
  data.tasks.forEach((t) =>
    t.credits.forEach((c) =>
      c.installments
        .filter((i) => !i.payment)
        .forEach((i) => {
          const key = c.accountId + "|" + i.due.slice(0, 7);
          (bills[key] ??= { accountId: c.accountId, month: i.due.slice(0, 7), items: [] }).items.push({
            t,
            c,
            i,
          });
        }),
    ),
  );
  return Object.values(bills)
    .map((b) => ({
      ...b,
      total: sum(b.items.map((x) => num(x.i.brl))),
      due: b.items.map((x) => x.i.due).sort()[0],
    }))
    .sort((a, b) => a.due.localeCompare(b.due));
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
