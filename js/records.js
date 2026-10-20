// Detalhes da pendência: compras em etapas, pagamentos à vista e compras no crédito
const findTask = (id) => data.tasks.find((t) => t.id === id);
// Substitui pelo id (ou adiciona); usado ao salvar para não depender de objetos antigos
const upsert = (list, item) => {
  const i = list.findIndex((x) => x.id === item.id);
  i < 0 ? list.push(item) : (list[i] = item);
};
const methodOptions = (v, allow = () => true, empty = "Não informada") =>
  `<option value="">${empty}</option>` +
  METHODS.filter(([k]) => allow(k))
    .map(([k, l]) => `<option value="${k}" ${k === v ? "selected" : ""}>${l}</option>`)
    .join("");
const sourceOptions = (v, empty = "Fonte não definida") =>
  `<option value="">${empty}</option>` +
  data.sources
    .map((s) => `<option value="${s.id}" ${s.id === v ? "selected" : ""}>${esc(s.name)}</option>`)
    .join("");
const splitText = (p) =>
  paySplit(p)
    .map((s) => `${esc(sourceName(validSource(s.sourceId)))} ${money(num(s.brl))}`)
    .join(" + ");

function openTask(id) {
  const t = findTask(id);
  if (!t) return;
  if (!isCost(t)) return editTask(id);
  const f = forecast(t),
    cur = (v) => money(v, t.currency),
    eurItem = t.currency === "EUR",
    d = dueStatus(t),
    ps = payStatus(t),
    acq = acqStatus(t),
    box = (label, v) => `<div><small>${label}</small><b>${money(v)}</b></div>`,
    unit = esc(t.unit || "un."),
    byDate = (a, b) => (a.date || "").localeCompare(b.date || ""),
    linkedText = (p) => {
      const pay = t.payments.find((x) => x.purchaseId === p.id),
        cr = t.credits.find((x) => x.purchaseId === p.id);
      return pay
        ? `Pagamento registrado (${methodName(pay.method)})`
        : cr
          ? `No crédito ${esc(accountName(cr.accountId))} em ${cr.installments.length}x`
          : "Pagamento não registrado";
    };
  const cash = [...t.payments]
      .sort(byDate)
      .map(
        (p) =>
          `<div class="statrow"><span><b>${cur(num(p.amount))}</b>${eurItem ? ` · ${money(num(p.brl))} <small>(1 € = R$ ${fmtRate(p.rate)})</small>` : ""} · ${fmtDate(p.date) || "sem data"} ${isConfirmed(p) ? "" : badge("Agendado", "warn")}<br><small>${methodName(p.method)}${p.accountId ? " · " + esc(accountName(p.accountId)) : ""} · Origem: ${splitText(p)}${p.purchaseId ? " · referente a uma compra" : ""}${p.notes ? " · " + esc(p.notes) : ""}</small></span><span class="nowrap">${isConfirmed(p) ? "" : `<button type="button" class="link" onclick="confirmPayment('${t.id}','${p.id}')">Confirmar</button>`}<button type="button" class="link" onclick="editPayment('${t.id}','${p.id}')">Editar</button><button type="button" class="link danger" aria-label="Excluir pagamento" onclick="removePayment('${t.id}','${p.id}')">🗑</button></span></div>`,
      ),
    credits = [...t.credits].sort(byDate).map((c) => {
      const paid = c.installments.filter((i) => i.payment),
        rest = sum(c.installments.filter((i) => !i.payment).map((i) => num(i.brl)));
      return `<div class="credit"><div class="statrow"><span><b>Cartão de crédito · ${esc(accountName(c.accountId) || "cartão")}</b> · compra em ${fmtDate(c.date) || "sem data"}<br><small>Total ${money(num(c.brl))}${eurItem ? ` (${cur(num(c.amount))})` : ""} · ${c.installments.length}x · ${paid.length} de ${c.installments.length} parcelas pagas · restante ${money(rest)} · fatura prevista: ${esc(sourceName(validSource(c.sourceId)))}${c.purchaseId ? " · referente a uma compra" : ""}</small></span><span class="nowrap"><button type="button" class="link" onclick="editPayment('${t.id}',null,'${c.id}')">Editar</button><button type="button" class="link danger" aria-label="Excluir compra no crédito" onclick="removeCredit('${t.id}','${c.id}')">🗑</button></span></div>${c.installments
        .map(
          (i) =>
            `<div class="inst"><span>${i.n}/${c.installments.length} · vence ${fmtDate(i.due)} · <b>${money(num(i.brl))}</b><br><small>${i.payment ? `Paga em ${fmtDate(i.payment.date) || "sem data"} · ${splitText(i.payment)}` : `Em aberto · origem prevista: ${esc(sourceName(validSource(plannedSource(c, i))))}`}</small></span>${i.payment ? `<button type="button" class="link" onclick="unpayInstallment('${t.id}','${c.id}','${i.id}')">Desfazer</button>` : `<button type="button" class="btn small" onclick="payInstallment('${t.id}','${c.id}','${i.id}')">Pagar</button>`}</div>`,
        )
        .join("")}</div>`;
    });
  showForm(
    `<h3>${esc(t.title)}</h3><p class="sub">${esc(t.category)}</p><div class="statusline"><span><small>Tarefa</small>${badge(t.status, statusCls(t.status))}</span><span><small>Prazo</small>${d ? badge(d.label, d.cls) + ` <small>${fmtDate(dueDate(t))}</small>` : "<small>Sem prazo</small>"}</span><span><small>Financeiro</small>${badge(ps.label, ps.cls)}</span><span><small>Aquisição</small>${badge(acq.label, acq.cls)}</span></div><div class="summary">${box("Custo total", paidBRL(t) + outstandingBRL(t))}${box("Já pago", paidBRL(t))}${box("Falta pagar", outstandingBRL(t))}</div>${f.unknown ? '<p class="flag">Custo a definir: a previsão desta despesa está incompleta.</p>' : ""}${eurItem ? `<p class="sub">Valor previsto: ${cur(f.known)}. Pagamentos feitos mantêm o valor em reais registrado; o restante usa a cotação atual (estimativa).</p>` : ""}${
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
            [...t.purchases]
              .sort(byDate)
              .map(
                (p) =>
                  `<div class="statrow"><span><b>${fmtQty(p.qty)} ${unit}</b> · ${fmtDate(p.date) || "sem data"} · ${cur(num(p.value))}<br><small>${linkedText(p)}${p.notes ? " · " + esc(p.notes) : ""}</small></span><span class="nowrap"><button type="button" class="link" onclick="editPurchase('${t.id}','${p.id}')">Editar</button><button type="button" class="link danger" aria-label="Excluir compra" onclick="removePurchase('${t.id}','${p.id}')">🗑</button></span></div>`,
              )
              .join("") || '<p class="sub">Nenhuma compra registrada.</p>'
          }<button type="button" class="btn" onclick="editPurchase('${t.id}')">+ Registrar compra</button></fieldset>`
        : ""
    }<fieldset class="sec"><legend>Pagamentos</legend>${
      [...cash, ...credits].join("") ||
      `<p class="sub">${t.legacyPaid ? "Marcado como pago antes desta versão, sem valor registrado." : "Nenhum pagamento registrado."}</p>`
    }<button type="button" class="btn" onclick="editPayment('${t.id}')">+ Registrar pagamento</button></fieldset><p class="sub">Origem planejada: ${esc(originText(t))}${t.method ? ` · Forma prevista: ${methodName(t.method)}${t.accountId ? " (" + esc(accountName(t.accountId)) + ")" : ""}` : ""}</p><div class="actions"><button type="button" class="link danger" style="margin-right:auto" onclick="deleteTask('${t.id}')">Excluir</button><button type="button" class="btn" onclick="$('#modal').close()">Fechar</button><button type="button" class="btn primary" onclick="editTask('${t.id}')">Editar pendência</button></div>`,
    () => {},
  );
}

// Campos do pagamento: forma, conta/cartão, data, cotação (€), origem do dinheiro e parcelamento no crédito
function payBlock(t, { payment, credit, date, only }) {
  const eurItem = t.currency === "EUR",
    method = credit ? "credito" : payment ? payment.method : t.method || "",
    allow = (k) => (only === "credit" ? k === "credito" : only === "cash" ? k !== "credito" : true),
    rows = payment
      ? paySplit(payment).map((s) =>
          splitRow(validSource(s.sourceId), payment.split?.length > 1 ? s.brl : null, true),
        )
      : t.alloc.length
        ? t.alloc.map((a, i) =>
            splitRow(a.sourceId, i === t.alloc.length - 1 || a.brl === null ? null : num(a.brl), true),
          )
        : [splitRow("", null, true)],
    start = credit?.date || date || todayStr();
  return `<label>Forma de pagamento<select name="method" ${only === "credit" ? "disabled" : ""}>${methodOptions(method, allow)}</select></label>${only === "credit" ? '<input type="hidden" name="method" value="credito">' : ""}<div data-pay="cash">${field("Data do pagamento", "payDate", payment?.date ?? date, "date")}${
    eurItem
      ? `<div class="twocol">${field("Cotação efetiva (R$ por €)", "rate", payment ? round2(payment.rate * 10000) / 10000 : round2(data.rate * 10000) / 10000, "number", 'min="0.0001" step="0.0001"')}${field("Valor pago em reais", "brlPaid", payment?.brl ?? "", "number", 'class="money" min="0" step="0.01"')}</div><p class="sub">O valor em reais fica gravado e não muda quando o câmbio for atualizado.</p>`
      : ""
  }<label>Conta ou cartão usado (opcional)<select name="accountId" onchange="pickAccount(this)">${accountOptions(payment?.accountId ?? (t.method !== "credito" ? t.accountId : ""))}</select></label><small>Origem do dinheiro</small><div id="splitrows">${rows.join("")}</div><button type="button" class="link" onclick="addSplitRow(true)">+ Dividir entre fontes</button><p class="sub">Deixe em branco o valor de uma fonte para ela receber o restante.</p><label class="inline"><input type="checkbox" name="confirmed" ${payment && !isConfirmed(payment) ? "" : "checked"}> Pagamento já realizado</label><p class="sub">Desmarcado, fica como agendado: o valor é reservado e só sai da fonte quando você confirmar.</p></div><div data-pay="credit"><label>Cartão de crédito<select name="cardId" data-type="cartao" onchange="pickAccount(this)">${accountOptions(credit?.accountId ?? (t.method === "credito" ? t.accountId : ""), "cartao")}</select></label><div class="twocol">${field("Data da compra", "creditDate", start, "date")}${field("Parcelas", "installmentsN", credit?.installments.length ?? 1, "number", 'min="1" max="48" step="1"')}</div>${eurItem ? field("Valor total em reais (como na fatura)", "creditBrl", credit?.brl ?? "", "number", 'class="money" min="0" step="0.01"') : ""}${field("Primeiro vencimento", "firstDue", credit?.installments[0]?.due ?? addMonths(start, 1), "date")}<label>Origem do dinheiro prevista para pagar a fatura<select name="creditSource">${sourceOptions(credit?.sourceId ?? t.alloc[0]?.sourceId ?? "")}</select></label><p id="creditpreview" class="notice"></p><p class="sub">A compra no crédito compromete o orçamento, mas só sai da fonte quando cada parcela ou fatura for paga.</p></div><p id="paywarn" class="flag"></p>`;
}
// Mantém visíveis só os campos da forma escolhida e atualiza conversões e prévia das parcelas
function syncPayBlock(t, amount, e) {
  const form = $("#form"),
    f = new FormData(form),
    credit = f.get("method") === "credito",
    rate = form.elements.namedItem("rate"),
    brlPaid = form.elements.namedItem("brlPaid"),
    changed = e?.target?.name;
  form.querySelector('[data-pay="cash"]').hidden = credit;
  form.querySelector('[data-pay="credit"]').hidden = !credit;
  if (rate && brlPaid && amount > 0) {
    if (changed === "brlPaid") {
      if (Number(brlPaid.value) > 0) rate.value = round2((Number(brlPaid.value) / amount) * 10000) / 10000;
    } else if (["amount", "value", "rate", "withPay", "method"].includes(changed) || brlPaid.value === "")
      brlPaid.value = round2(amount * Number(rate.value));
  }
  if (changed === "creditDate" && f.get("creditDate"))
    form.elements.namedItem("firstDue").value = addMonths(f.get("creditDate"), 1);
  if (credit) {
    const n = Math.round(Number(f.get("installmentsN"))) || 1,
      brl = t.currency === "EUR" ? Number(f.get("creditBrl")) || amount * data.rate : amount,
      due = form.elements.namedItem("firstDue").value || todayStr(),
      list = amount > 0 ? buildInstallments(round2(brl), n, due) : [];
    $("#creditpreview").innerHTML = list.length
      ? `${n}x de ${money(list[0].brl)}${n > 1 && list[n - 1].brl !== list[0].brl ? ` (última ${money(list[n - 1].brl)})` : ""} · total ${money(round2(brl))}<br><small>Vencimentos: ${list
          .slice(0, 4)
          .map((i) => fmtDate(i.due))
          .join(", ")}${n > 4 ? "…" : ""}</small>`
      : "";
  }
}
// Lê os campos e valida; devolve um pagamento à vista ou uma compra no crédito
function readPayBlock(t, f, amount, { paymentId, credit } = {}) {
  if (!(amount > 0)) return { error: "Informe o valor." };
  const eurItem = t.currency === "EUR";
  if (f.get("method") === "credito") {
    const accountId = f.get("cardId"),
      n = Math.round(Number(f.get("installmentsN"))),
      firstDue = f.get("firstDue"),
      brl = round2(
        eurItem ? (f.get("creditBrl") === "" ? amount * data.rate : Number(f.get("creditBrl"))) : amount,
      );
    if (!accountId || accountId === NEW_CATEGORY) return { error: "Escolha o cartão de crédito." };
    if (!(n >= 1 && n <= 48)) return { error: "Informe de 1 a 48 parcelas." };
    if (!firstDue) return { error: "Informe o primeiro vencimento." };
    const paidCount = credit?.installments.filter((i) => i.payment).length || 0;
    if (paidCount && (n !== credit.installments.length || Math.abs(brl - num(credit.brl)) > 0.005))
      return {
        error:
          "Há parcelas pagas. Para mudar o valor ou o número de parcelas, desfaça antes os pagamentos das parcelas.",
      };
    const c = {
        ...credit,
        id: credit?.id || uid(),
        accountId,
        date: f.get("creditDate"),
        amount,
        brl,
        sourceId: f.get("creditSource"),
        installments: buildInstallments(brl, n, firstDue, credit?.installments || []),
      },
      open = sum(c.installments.filter((i) => !i.payment).map((i) => i.brl)),
      st = sourceStats(t.id),
      warn =
        c.sourceId && open > st[c.sourceId].free + 0.005
          ? [
              `As parcelas em aberto (${money(open)}) passam do saldo livre de “${sourceName(c.sourceId)}” (${money(st[c.sourceId].free)}).`,
            ]
          : [];
    return { credit: c, warn };
  }
  const brl = round2(
      eurItem
        ? f.get("brlPaid") === ""
          ? amount * Number(f.get("rate"))
          : Number(f.get("brlPaid"))
        : amount,
    ),
    rate = eurItem ? brl / amount : 1,
    r = resolveSplit(readSplitRows(), brl);
  if (r.error) return { error: r.error };
  const confirmed = f.has("confirmed"),
    st = sourceStats(confirmed ? undefined : t.id, paymentId),
    key = confirmed ? "current" : "free",
    warn = paySplit({ split: r.split, brl })
      .filter((s) => s.sourceId && s.brl > st[s.sourceId][key] + 0.005)
      .map(
        (s) =>
          `${confirmed ? "O pagamento" : "O agendamento"} de ${money(s.brl)} em “${sourceName(s.sourceId)}” ultrapassa o saldo ${confirmed ? "atual" : "livre"} da fonte (${money(st[s.sourceId][key])}).`,
      );
  return {
    payment: {
      date: f.get("payDate"),
      amount,
      rate,
      brl,
      split: r.split,
      method: f.get("method"),
      accountId: f.get("accountId") === NEW_CATEGORY ? "" : f.get("accountId"),
      confirmed,
    },
    warn,
  };
}
const saveOk = (cur, message) => {
  save();
  render();
  openTask(cur.id);
  toast(message);
};

// Registra ou edita um pagamento à vista (paymentId) ou uma compra no crédito (creditId)
function editPayment(taskId, paymentId, creditId) {
  const t = findTask(taskId),
    old = t.payments.find((p) => p.id === paymentId),
    oldCredit = t.credits.find((c) => c.id === creditId),
    c = t.currency === "EUR" ? "€" : "R$",
    amount = old?.amount ?? oldCredit?.amount ?? (round2(uncoveredCur(t)) || ""),
    only = oldCredit ? "credit" : old ? "cash" : "";
  showForm(
    `<h3>${oldCredit ? "Editar compra no crédito" : old ? "Editar pagamento" : "Registrar pagamento"}</h3><p class="sub">${esc(t.title)} · ainda a acertar ${money(uncoveredCur(t), t.currency)}${old?.purchaseId || oldCredit?.purchaseId ? " · referente a uma compra" : ""}</p><label id="amountlabel">Valor<input name="amount" class="money" type="number" required min="0.01" step="0.01" value="${amount}"></label>${payBlock(t, { payment: old, credit: oldCredit, date: todayStr(), only })}${field("Observações", "notes", old?.notes ?? oldCredit?.notes ?? "")}<div class="actions">${old || oldCredit ? `<button type="button" class="link danger" style="margin-right:auto" onclick="${oldCredit ? `removeCredit('${t.id}','${oldCredit.id}')` : `removePayment('${t.id}','${old.id}')`}">Excluir</button>` : ""}<button type="button" class="btn" onclick="openTask('${t.id}')">Voltar</button><button class="btn primary">Salvar</button></div>`,
    (f) => {
      const res = readPayBlock(t, f, Number(f.get("amount")), { paymentId: old?.id, credit: oldCredit });
      if (res.error) return toast(res.error);
      if (res.warn.length && !confirm(res.warn.join("\n") + "\n\nSalvar mesmo assim?")) return;
      // Busca a pendência de novo: outra pessoa pode ter salvo algo enquanto o formulário estava aberto
      const cur = findTask(taskId) || t;
      if (res.credit) upsert(cur.credits, { ...res.credit, notes: f.get("notes") });
      else upsert(cur.payments, { ...old, ...res.payment, id: old?.id || uid(), notes: f.get("notes") });
      cur.legacyPaid = false;
      saveOk(cur, res.credit ? "Compra no crédito salva" : "Pagamento salvo");
    },
    (e) => {
      const f = new FormData($("#form")),
        amt = Number(f.get("amount"));
      $("#amountlabel").firstChild.textContent =
        f.get("method") === "credito" ? `Valor total da compra (${c})` : `Valor pago (${c})`;
      syncPayBlock(t, amt, e);
      const res = readPayBlock(t, new FormData($("#form")), amt, { paymentId: old?.id, credit: oldCredit });
      // "Informe o valor" só aparece ao salvar, não enquanto o campo ainda está vazio
      $("#paywarn").innerHTML = (res.error ? (amt > 0 ? [res.error] : []) : res.warn).join("<br>");
    },
  );
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
    linkedPay = old && t.payments.find((x) => x.purchaseId === old.id),
    linkedCredit = old && t.credits.find((x) => x.purchaseId === old.id),
    c = t.currency === "EUR" ? "€" : "R$";
  const read = (f) => {
    const value = Number(f.get("value")),
      res = f.has("withPay")
        ? readPayBlock(t, f, value, { paymentId: linkedPay?.id, credit: linkedCredit })
        : { warn: [] },
      over = Number(f.get("qty")) - (old ? num(old.qty) : 0) > rest + 1e-9;
    return { value, res, over };
  };
  showForm(
    `<h3>${old ? "Editar" : "Registrar"} compra</h3><p class="sub">${esc(t.title)} · ${fmtQty(bought(t))} de ${fmtQty(t.qty)} ${esc(t.unit || "un.")} compradas</p><div class="twocol">${field(`Quantidade (${esc(t.unit || "un.")})`, "qty", p.qty, "number", 'required min="0.01" step="any"')}${field("Data da compra", "date", p.date, "date", "required")}</div>${field(`Valor real total da compra (${c})`, "value", p.value, "number", 'class="money" required min="0" step="0.01"')}${field("Observações", "notes", p.notes)}<label class="inline"><input type="checkbox" name="withPay" ${linkedPay || linkedCredit ? "checked" : ""}> Registrar também o pagamento desta compra</label><div data-show="pay">${payBlock(t, { payment: linkedPay, credit: linkedCredit, date: p.date })}</div><p id="formwarn" class="flag"></p><div class="actions">${old ? `<button type="button" class="link danger" style="margin-right:auto" onclick="removePurchase('${t.id}','${old.id}')">Excluir</button>` : ""}<button type="button" class="btn" onclick="openTask('${t.id}')">Voltar</button><button class="btn primary">Salvar</button></div>`,
    (f) => {
      const { value, res, over } = read(f);
      if (res.error) return toast(res.error);
      if (linkedCredit?.installments.some((i) => i.payment) && !res.credit)
        return toast(
          "A compra no crédito vinculada tem parcelas pagas. Desfaça antes os pagamentos das parcelas.",
        );
      const warns = [...(over ? ["A compra passa da quantidade necessária."] : []), ...res.warn];
      if (warns.length && !confirm(warns.join("\n") + "\n\nSalvar mesmo assim?")) return;
      const purchase = {
          id: old?.id || uid(),
          qty: Number(f.get("qty")),
          date: f.get("date"),
          value,
          notes: f.get("notes"),
        },
        cur = findTask(taskId) || t;
      upsert(cur.purchases, purchase);
      // Um único registro financeiro por compra: pagamento à vista ou compra no crédito
      cur.payments = cur.payments.filter((x) => x.id !== linkedPay?.id);
      cur.credits = cur.credits.filter((x) => x.id !== linkedCredit?.id);
      if (res.credit) cur.credits.push({ ...res.credit, purchaseId: purchase.id });
      else if (res.payment)
        cur.payments.push({
          ...linkedPay,
          ...res.payment,
          id: linkedPay?.id || uid(),
          purchaseId: purchase.id,
        });
      saveOk(cur, "Compra salva");
    },
    (e) => {
      const form = $("#form"),
        f = new FormData(form);
      form.querySelector('[data-show="pay"]').hidden = !f.has("withPay");
      if (!f.has("withPay")) return ($("#formwarn").textContent = "");
      syncPayBlock(t, Number(f.get("value")), e);
      const { res, over } = read(new FormData(form));
      $("#paywarn").textContent = "";
      $("#formwarn").innerHTML = [
        ...(over ? ["A compra passa da quantidade necessária."] : []),
        ...(res.error ? [res.error] : res.warn),
      ].join("<br>");
    },
  );
}

// Paga uma parcela, escolhendo a fonte usada nesta parcela
function payInstallment(taskId, creditId, instId) {
  const t = findTask(taskId),
    c = t.credits.find((x) => x.id === creditId),
    i = c.installments.find((x) => x.id === instId);
  showForm(
    `<h3>Pagar parcela ${i.n}/${c.installments.length}</h3><p class="sub">${esc(t.title)} · ${esc(accountName(c.accountId))} · vence ${fmtDate(i.due)} · <b>${money(num(i.brl))}</b></p>${field("Data do pagamento", "payDate", todayStr(), "date", "required")}<small>Origem do dinheiro desta parcela</small><div id="splitrows">${splitRow(validSource(plannedSource(c, i)), null, true)}</div><button type="button" class="link" onclick="addSplitRow(true)">+ Dividir entre fontes</button><p id="paywarn" class="flag"></p><div class="actions"><button type="button" class="btn" onclick="openTask('${t.id}')">Voltar</button><button class="btn primary">Confirmar pagamento</button></div>`,
    (f) => {
      const r = resolveSplit(readSplitRows(), num(i.brl));
      if (r.error) return toast(r.error);
      const cur = findTask(taskId) || t,
        inst = cur.credits.find((x) => x.id === creditId)?.installments.find((x) => x.id === instId);
      if (!inst) return;
      inst.payment = { date: f.get("payDate"), brl: num(i.brl), split: r.split };
      saveOk(cur, "Parcela paga");
    },
    () => {
      const r = resolveSplit(readSplitRows(), num(i.brl)),
        st = sourceStats(undefined, i.id);
      $("#paywarn").innerHTML = r.error
        ? r.error
        : r.split
            .filter((s) => s.sourceId && s.brl > st[s.sourceId].current + 0.005)
            .map(
              (s) =>
                `Passa do saldo atual de “${sourceName(s.sourceId)}” (${money(st[s.sourceId].current)}).`,
            )
            .join("<br>");
    },
  );
}
function unpayInstallment(taskId, creditId, instId) {
  if (!confirm("Desfazer o pagamento desta parcela? O valor volta para o saldo da fonte.")) return;
  const t = findTask(taskId),
    i = t.credits.find((x) => x.id === creditId)?.installments.find((x) => x.id === instId);
  if (i) delete i.payment;
  saveOk(t, "Pagamento da parcela desfeito");
}
function confirmPayment(taskId, paymentId) {
  const t = findTask(taskId),
    p = t.payments.find((x) => x.id === paymentId);
  p.confirmed = true;
  p.date ||= todayStr();
  saveOk(t, "Pagamento confirmado");
}

function removePurchase(taskId, purchaseId) {
  const t = findTask(taskId),
    linkedPay = t.payments.find((x) => x.purchaseId === purchaseId),
    linkedCredit = t.credits.find((x) => x.purchaseId === purchaseId);
  if (!confirm("Excluir esta compra?")) return;
  t.purchases = t.purchases.filter((p) => p.id !== purchaseId);
  if (linkedPay || linkedCredit) {
    if (confirm("Excluir também o pagamento registrado para esta compra?")) {
      t.payments = t.payments.filter((x) => x !== linkedPay);
      t.credits = t.credits.filter((x) => x !== linkedCredit);
    } else {
      if (linkedPay) delete linkedPay.purchaseId;
      if (linkedCredit) delete linkedCredit.purchaseId;
    }
  }
  saveOk(t, "Compra excluída");
}
function removePayment(taskId, paymentId) {
  const t = findTask(taskId);
  if (!confirm("Excluir este pagamento? Os saldos das fontes serão recalculados.")) return;
  t.payments = t.payments.filter((p) => p.id !== paymentId);
  saveOk(t, "Pagamento excluído");
}
function removeCredit(taskId, creditId) {
  const t = findTask(taskId),
    c = t.credits.find((x) => x.id === creditId),
    paid = c.installments.filter((i) => i.payment).length;
  if (
    !confirm(
      paid
        ? `Excluir esta compra no crédito? As ${paid} parcela(s) já paga(s) também serão excluídas e os saldos recalculados.`
        : "Excluir esta compra no crédito e suas parcelas?",
    )
  )
    return;
  t.credits = t.credits.filter((x) => x.id !== creditId);
  saveOk(t, "Compra no crédito excluída");
}
