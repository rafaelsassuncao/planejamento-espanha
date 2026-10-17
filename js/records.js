// Detalhes da pendência: compras em etapas e pagamentos
const findTask = (id) => data.tasks.find((t) => t.id === id);
// Substitui pelo id (ou adiciona); usado ao salvar para não depender de objetos antigos
const upsert = (list, item) => {
  const i = list.findIndex((x) => x.id === item.id);
  i < 0 ? list.push(item) : (list[i] = item);
};

function openTask(id) {
  const t = findTask(id);
  if (!t) return;
  if (!isCost(t)) return editTask(id);
  const f = forecast(t),
    cur = (v) => money(v, t.currency),
    eurItem = t.currency === "EUR",
    d = dueStatus(t),
    ps = payStatus(t),
    box = (label, brlValue, curValue) =>
      `<div><small>${label}</small><b>${money(brlValue)}</b>${eurItem ? `<small>${cur(curValue)}</small>` : eurLine(brlValue)}</div>`,
    unit = esc(t.unit || "un."),
    purchases = [...t.purchases].sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    payments = [...t.payments].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  showForm(
    `<h3>${esc(t.title)}</h3><p class="sub">${esc(t.category)} · ${badge(t.status, statusCls(t.status))} ${d ? badge(d.label, d.cls) + ` <small>${fmtDate(dueDate(t))}</small>` : ""} ${badge(ps.label, ps.cls)}</p><div class="summary">${box("Total previsto", paidBRL(t) + outstandingBRL(t), f.known)}${box("Já pago", paidBRL(t), paidCur(t))}${box("Falta pagar", outstandingBRL(t), outstandingCur(t))}</div>${f.unknown ? '<p class="flag">Custo a definir: a previsão desta despesa está incompleta.</p>' : ""}${eurItem ? `<p class="sub">Já pago usa a cotação registrada em cada pagamento; o restante usa a cotação atual (estimativa).</p>` : ""}${
      t.multi
        ? `<fieldset class="sec"><legend>Quantidade</legend>${qtyBlock(t)}${t.priceKnown ? `<small>Estimativa por unidade: ${cur(num(t.unitPrice))}</small>` : "<small>Valor por unidade a definir</small>"}${
            t.plan.length
              ? `<div class="plan">${planSteps(t)
                  .map(
                    (s) =>
                      `<small>${s.done ? "✓" : "○"} ${fmtQty(s.qty)} ${unit} ${s.date ? "em " + fmtDate(s.date) : "(sem data)"}${!s.done && s.date && daysUntil(s.date) < 0 ? " · atrasada" : ""}</small>`,
                  )
                  .join("")}</div>`
              : ""
          }</fieldset><fieldset class="sec"><legend>Compras</legend>${
            purchases
              .map((p) => {
                const linked = t.payments.some((x) => x.purchaseId === p.id);
                return `<div class="statrow"><span><b>${fmtQty(p.qty)} ${unit}</b> · ${fmtDate(p.date) || "sem data"} · ${cur(num(p.value))}<br><small>${linked ? "Pagamento registrado" : "Pagamento não registrado"}${p.notes ? " · " + esc(p.notes) : ""}</small></span><span class="nowrap"><button type="button" class="link" onclick="editPurchase('${t.id}','${p.id}')">Editar</button><button type="button" class="link danger" aria-label="Excluir compra" onclick="removePurchase('${t.id}','${p.id}')">🗑</button></span></div>`;
              })
              .join("") || '<p class="sub">Nenhuma compra registrada.</p>'
          }<button type="button" class="btn" onclick="editPurchase('${t.id}')">+ Registrar compra</button></fieldset>`
        : ""
    }<fieldset class="sec"><legend>Pagamentos</legend>${
      payments
        .map(
          (p) =>
            `<div class="statrow"><span><b>${cur(num(p.amount))}</b>${eurItem ? ` · ${money(num(p.brl))} <small>(1 € = R$ ${fmtRate(p.rate)})</small>` : ""} · ${fmtDate(p.date) || "sem data"}<br><small>${paySplit(
              p,
            )
              .map((s) => `${esc(sourceName(validSource(s.sourceId)))} ${money(num(s.brl))}`)
              .join(
                " + ",
              )}${p.purchaseId ? " · referente a uma compra" : ""}${p.notes ? " · " + esc(p.notes) : ""}</small></span><span class="nowrap"><button type="button" class="link" onclick="editPayment('${t.id}','${p.id}')">Editar</button><button type="button" class="link danger" aria-label="Excluir pagamento" onclick="removePayment('${t.id}','${p.id}')">🗑</button></span></div>`,
        )
        .join("") ||
      `<p class="sub">${t.legacyPaid ? "Marcado como pago antes desta versão, sem valor registrado." : "Nenhum pagamento registrado."}</p>`
    }<button type="button" class="btn" onclick="editPayment('${t.id}')">+ Registrar pagamento</button></fieldset><p class="sub">Origem planejada: ${esc(originText(t))}</p><div class="actions"><button type="button" class="btn" onclick="$('#modal').close()">Fechar</button><button type="button" class="btn primary" onclick="editTask('${t.id}')">Editar pendência</button></div>`,
    () => {},
  );
}

// Campos de pagamento: data, cotação efetiva (€) e divisão entre fontes
function payFields(t, p, defaultDate, prefix = "") {
  const rows = p
    ? paySplit(p).map((s) => splitRow(validSource(s.sourceId), p.split?.length > 1 ? s.brl : null, true))
    : t.alloc.length
      ? t.alloc.map((a, i) =>
          splitRow(a.sourceId, i === t.alloc.length - 1 ? null : a.brl === null ? null : num(a.brl), true),
        )
      : [splitRow("", null, true)];
  return `${field("Data do pagamento", "payDate", p?.date ?? defaultDate, "date")}${
    t.currency === "EUR"
      ? `<div class="twocol">${field("Cotação efetiva (R$ por €)", "rate", p ? round2(p.rate * 10000) / 10000 : round2(data.rate * 10000) / 10000, "number", 'min="0.0001" step="0.0001"')}${field("Valor pago em reais", "brlPaid", p?.brl ?? "", "number", 'min="0" step="0.01"')}</div><p class="sub">O valor em reais fica gravado e não muda quando o câmbio for atualizado.</p>`
      : ""
  }<small>De qual fonte saiu o dinheiro</small><div id="splitrows">${rows.join("")}</div><button type="button" class="link" onclick="addSplitRow(true)">+ Dividir entre fontes</button><p class="sub">Deixe em branco o valor de uma fonte para ela receber o restante.</p><p id="paywarn" class="flag"></p>`;
}
// Lê os campos de pagamento e valida; devolve o pagamento ou um erro
function readPayment(t, f, amount, paymentId) {
  const eurItem = t.currency === "EUR",
    brlPaid = eurItem
      ? f.get("brlPaid") === ""
        ? amount * Number(f.get("rate"))
        : Number(f.get("brlPaid"))
      : amount,
    brl = round2(brlPaid),
    rate = eurItem ? (amount ? brl / amount : Number(f.get("rate"))) : 1,
    r = resolveSplit(readSplitRows(), brl);
  if (r.error) return { error: r.error };
  const st = sourceStats(undefined, paymentId),
    warn = paySplit({ split: r.split, brl })
      .filter((s) => s.sourceId && s.brl > st[s.sourceId].current + 0.005)
      .map(
        (s) =>
          `O pagamento de ${money(s.brl)} em “${sourceName(s.sourceId)}” ultrapassa o saldo atual da fonte (${money(st[s.sourceId].current)}).`,
      );
  return { payment: { date: f.get("payDate"), amount, rate, brl, split: r.split }, warn };
}
// Mantém cotação e valor em reais coerentes; só recalcula o campo que o usuário não está editando
function syncPayFields(amount, e) {
  const form = $("#form"),
    rate = form.elements.namedItem("rate"),
    brlPaid = form.elements.namedItem("brlPaid"),
    changed = e?.target?.name;
  if (!rate || !brlPaid || !(amount > 0)) return;
  if (changed === "brlPaid") {
    if (Number(brlPaid.value) > 0) rate.value = round2((Number(brlPaid.value) / amount) * 10000) / 10000;
  } else if (["amount", "value", "rate", "withPay"].includes(changed) || brlPaid.value === "")
    brlPaid.value = round2(amount * Number(rate.value));
}

function editPurchase(taskId, purchaseId) {
  const t = findTask(taskId),
    old = t.purchases.find((p) => p.id === purchaseId),
    rest = Math.max(0, t.qty - bought(t)),
    nextQty = num(planSteps(t).find((s) => !s.done)?.qty) || rest || 1,
    qty = old?.qty ?? Math.min(nextQty, rest || nextQty),
    p = old || {
      qty,
      date: todayStr(),
      value: t.priceKnown ? round2(qty * num(t.unitPrice)) : "",
      notes: "",
    },
    linked = old && t.payments.find((x) => x.purchaseId === old.id),
    c = t.currency === "EUR" ? "€" : "R$";
  const read = (f) => {
    const value = Number(f.get("value")),
      res = f.has("withPay") ? readPayment(t, f, value, linked?.id) : { warn: [] },
      over = Number(f.get("qty")) - (old ? num(old.qty) : 0) > rest + 1e-9;
    return { value, res, over };
  };
  showForm(
    `<h3>${old ? "Editar" : "Registrar"} compra</h3><p class="sub">${esc(t.title)} · ${fmtQty(bought(t))} de ${fmtQty(t.qty)} ${esc(t.unit || "un.")} compradas</p><div class="twocol">${field(`Quantidade (${esc(t.unit || "un.")})`, "qty", p.qty, "number", 'required min="0.01" step="any"')}${field("Data da compra", "date", p.date, "date", "required")}</div>${field(`Valor real total da compra (${c})`, "value", p.value, "number", 'required min="0" step="0.01"')}${field("Observações", "notes", p.notes)}<label class="inline"><input type="checkbox" name="withPay" ${linked ? "checked" : ""}> Registrar também o pagamento desta compra</label><div data-show="pay">${payFields(t, linked, p.date)}</div><p id="formwarn" class="flag"></p><div class="actions">${old ? `<button type="button" class="link danger" style="margin-right:auto" onclick="removePurchase('${t.id}','${old.id}')">Excluir</button>` : ""}<button type="button" class="btn" onclick="openTask('${t.id}')">Voltar</button><button class="btn primary">Salvar</button></div>`,
    (f) => {
      const { value, res, over } = read(f);
      if (res.error) return toast(res.error);
      const warns = [...(over ? ["A compra passa da quantidade necessária."] : []), ...res.warn];
      if (warns.length && !confirm(warns.join("\n") + "\n\nSalvar mesmo assim?")) return;
      const purchase = {
        id: old?.id || uid(),
        qty: Number(f.get("qty")),
        date: f.get("date"),
        value,
        notes: f.get("notes"),
      };
      // Busca a pendência de novo: outra pessoa pode ter salvo algo enquanto o formulário estava aberto
      const cur = findTask(taskId) || t;
      upsert(cur.purchases, purchase);
      if (f.has("withPay"))
        upsert(cur.payments, { ...linked, ...res.payment, id: linked?.id || uid(), purchaseId: purchase.id });
      else if (linked) cur.payments = cur.payments.filter((x) => x.id !== linked.id);
      syncAcquisition(cur);
      save();
      render();
      openTask(cur.id);
      toast("Compra salva");
    },
    (e) => {
      const form = $("#form"),
        f = new FormData(form);
      form.querySelector('[data-show="pay"]').hidden = !f.has("withPay");
      if (!f.has("withPay")) return ($("#formwarn").textContent = "");
      syncPayFields(Number(f.get("value")), e);
      const { res, over } = read(new FormData(form));
      $("#formwarn").innerHTML = [
        ...(over ? ["A compra passa da quantidade necessária."] : []),
        ...(res.error ? [res.error] : res.warn),
      ].join("<br>");
    },
  );
}

function editPayment(taskId, paymentId) {
  const t = findTask(taskId),
    old = t.payments.find((p) => p.id === paymentId),
    c = t.currency === "EUR" ? "€" : "R$",
    amount = old?.amount ?? (round2(outstandingCur(t)) || "");
  const sync = (e) => {
    const f = new FormData($("#form"));
    syncPayFields(Number(f.get("amount")), e);
    const res = readPayment(t, new FormData($("#form")), Number(f.get("amount")), old?.id);
    $("#paywarn").innerHTML = (res.error ? [res.error] : res.warn).join("<br>");
  };
  showForm(
    `<h3>${old ? "Editar" : "Registrar"} pagamento</h3><p class="sub">${esc(t.title)} · falta pagar ${money(outstandingCur(t), t.currency)}${old?.purchaseId ? " · referente a uma compra" : ""}</p>${field(`Valor pago (${c})`, "amount", amount, "number", 'required min="0.01" step="0.01"')}${payFields(t, old, todayStr())}${field("Observações", "notes", old?.notes || "")}<div class="actions">${old ? `<button type="button" class="link danger" style="margin-right:auto" onclick="removePayment('${t.id}','${old.id}')">Excluir</button>` : ""}<button type="button" class="btn" onclick="openTask('${t.id}')">Voltar</button><button class="btn primary">Salvar</button></div>`,
    (f) => {
      const res = readPayment(t, f, Number(f.get("amount")), old?.id);
      if (res.error) return toast(res.error);
      if (res.warn.length && !confirm(res.warn.join("\n") + "\n\nSalvar mesmo assim?")) return;
      const cur = findTask(taskId) || t;
      upsert(cur.payments, { ...old, ...res.payment, id: old?.id || uid(), notes: f.get("notes") });
      cur.legacyPaid = false;
      save();
      render();
      openTask(cur.id);
      toast("Pagamento salvo");
    },
    sync,
  );
}

function removePurchase(taskId, purchaseId) {
  const t = findTask(taskId),
    linked = t.payments.find((x) => x.purchaseId === purchaseId);
  if (!confirm("Excluir esta compra?")) return;
  t.purchases = t.purchases.filter((p) => p.id !== purchaseId);
  if (linked) {
    if (confirm("Excluir também o pagamento registrado para esta compra?"))
      t.payments = t.payments.filter((x) => x !== linked);
    else delete linked.purchaseId;
  }
  syncAcquisition(t);
  save();
  render();
  openTask(t.id);
  toast("Compra excluída");
}
function removePayment(taskId, paymentId) {
  const t = findTask(taskId);
  if (!confirm("Excluir este pagamento? Os saldos das fontes serão recalculados.")) return;
  t.payments = t.payments.filter((p) => p.id !== paymentId);
  save();
  render();
  openTask(t.id);
  toast("Pagamento excluído");
}
