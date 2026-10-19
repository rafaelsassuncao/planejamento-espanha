// Navegação e formulários de pendências e entradas
function go(p) {
  page = p;
  costF = "Todos";
  selected.clear();
  render();
}
document.querySelectorAll("nav button").forEach((b) => (b.onclick = () => go(b.dataset.page)));
function toggle(id, v) {
  const t = data.tasks.find((t) => t.id === id);
  t.status = v ? "Concluído" : "Pendente";
  save();
  render();
}
const field = (label, name, val = "", type = "text", extra = "") =>
  `<label>${label}<input name="${name}" type="${type}" value="${esc(val)}" ${extra}></label>`;
const opts = (a, v) => a.map((x) => `<option ${x === v ? "selected" : ""}>${esc(x)}</option>`).join("");
const NEW_CATEGORY = "__nova__";
const categoryOptions = (v) =>
  opts(categories, v) + `<option value="${NEW_CATEGORY}">+ Nova categoria…</option>`;
// Cria uma categoria direto pelo formulário de pendência, sem sair dele
function pickCategory(select) {
  if (select.value !== NEW_CATEGORY) {
    select.dataset.prev = select.value;
    formSync();
    return;
  }
  const v = prompt("Nome da nova categoria:")?.trim();
  if (!v || v.length > 70) {
    select.value = select.dataset.prev;
    return;
  }
  const existing = categories.find((c) => c.toLowerCase() === v.toLowerCase());
  if (!existing) {
    categories.push(v);
    data.categories = categories;
    save();
    toast("Categoria criada");
  }
  select.innerHTML = categoryOptions(existing || v);
  select.dataset.prev = select.value;
  formSync();
}

// Formulário aberto no modal; formSync atualiza campos visíveis, cálculos e avisos
let formSync = () => {};
function showForm(html, onsubmit, sync = () => {}) {
  const form = $("#form");
  form.innerHTML = html;
  form.onsubmit = (e) => {
    e.preventDefault();
    onsubmit(new FormData(form));
  };
  formSync = sync;
  form.oninput = form.onchange = (e) => formSync(e);
  formSync();
  if (!$("#modal").open) $("#modal").showModal();
  $("#modal").scrollTop = 0;
}

// Linhas de fonte do dinheiro (reserva da despesa ou divisão de um pagamento)
function splitRow(sourceId = "", amount = null, allowUndefined = false) {
  return `<div class="steprow"><select name="splitSource" aria-label="Fonte" data-prev="${esc(sourceId)}" onchange="pickSource(this)">${allowUndefined ? `<option value="">Fonte não definida</option>` : ""}${data.sources.map((s) => `<option value="${s.id}" ${s.id === sourceId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}<option value="${NEW_CATEGORY}">+ Nova fonte…</option></select><input name="splitBrl" type="number" min="0" step="0.01" aria-label="Valor em reais" placeholder="R$ restante" value="${amount ?? ""}"><button type="button" class="link danger" aria-label="Remover fonte" onclick="this.parentElement.remove();formSync()">✕</button></div>`;
}
function addSplitRow(allowUndefined = false) {
  $("#splitrows").insertAdjacentHTML("beforeend", splitRow(data.sources[0]?.id || "", null, allowUndefined));
  formSync();
}
const readSplitRows = () =>
  [...document.querySelectorAll("#splitrows .steprow")]
    .map((r) => ({
      sourceId: r.querySelector("select").value,
      brl: r.querySelector("input").value === "" ? null : Number(r.querySelector("input").value),
    }))
    .filter((r) => r.sourceId !== NEW_CATEGORY);
// Divide um valor pago entre fontes; um campo em branco recebe o restante
function resolveSplit(rows, total) {
  if (!rows.length) return { split: [] };
  const blanks = rows.filter((r) => r.brl === null);
  if (blanks.length > 1) return { error: "Deixe em branco o valor de no máximo uma fonte." };
  if (blanks.length)
    blanks[0].brl = round2(total - sum(rows.filter((r) => r !== blanks[0]).map((r) => r.brl)));
  const s = sum(rows.map((r) => r.brl));
  if (rows.some((r) => r.brl < 0) || Math.abs(s - total) > 0.01)
    return {
      error: `A soma das fontes (${money(s)}) precisa ser igual ao valor pago em reais (${money(total)}).`,
    };
  const split = rows.filter((r) => r.brl > 0);
  return { split: split.length === 1 && !split[0].sourceId ? [] : split };
}

function editTask(id) {
  const t = data.tasks.find((t) => t.id === id) || {
      kind: "cost",
      title: "",
      category: cat !== "Todas" ? cat : categories[0],
      status: "Pendente",
      notes: "",
      date: "",
      currency: "BRL",
      priceKnown: false,
      value: 0,
      multi: false,
      qty: 1,
      unit: "",
      unitPrice: null,
      plan: [],
      purchases: [],
      payments: [],
      credits: [],
      alloc: [],
      method: "",
      accountId: "",
      acquired: false,
      required: true,
    },
    hasPay = t.payments.length > 0 || t.credits.length > 0,
    locked = hasPay || t.purchases.length > 0,
    // Origem com uma fonte só é editada aqui; divisões entre fontes continuam como estão
    simpleAlloc = t.alloc.length <= 1 && (t.alloc[0]?.brl ?? null) === null,
    choice = (name, val, checked, label, sub, disabled = false) =>
      `<label class="choice"><input type="radio" name="${name}" value="${val}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span></label>`,
    planRow = (s = {}) =>
      `<div class="steprow"><input name="planQty" type="number" min="0.01" step="any" aria-label="Quantidade da etapa" placeholder="Qtd." value="${s.qty ?? ""}"><input name="planDate" type="date" aria-label="Data prevista" value="${esc(s.date || "")}"><button type="button" class="link danger" aria-label="Remover etapa" onclick="this.parentElement.remove();formSync()">✕</button></div>`;
  window.addPlanRow = () => {
    $("#planrows").insertAdjacentHTML("beforeend", planRow());
    formSync();
  };
  const draft = (f) => {
    const multi = f.get("multi") === "on",
      raw = f.get("value"),
      known = raw !== "" && Number(raw) > 0,
      price = known ? Number(raw) : 0,
      src = f.get("plannedSource");
    return {
      ...t,
      id: t.id || "novo",
      kind: f.get("kind"),
      category: f.get("category"),
      currency: f.get("currency"),
      priceKnown: known,
      multi,
      value: multi ? 0 : price,
      unitPrice: multi && known ? price : null,
      qty: multi ? Math.max(0.01, Number(f.get("qty")) || 1) : 1,
      method: f.get("method") || "",
      accountId: [NEW_CATEGORY, null].includes(f.get("accountId")) ? "" : f.get("accountId"),
      acquired: f.has("acquired"),
      alloc: simpleAlloc ? (src ? [{ sourceId: src, brl: null }] : []) : t.alloc,
    };
  };
  const sync = () => {
    const form = $("#form"),
      f = new FormData(form),
      d = draft(f),
      cost = d.kind === "cost",
      flags = {
        cost,
        multi: cost && d.multi,
        single: cost && !d.multi,
        paid: cost && f.get("paidNow") === "1",
        paideur: cost && f.get("paidNow") === "1" && d.currency === "EUR",
        folder: data.folder && d.category === data.folder.category,
      };
    form.querySelectorAll("[data-show]").forEach((el) => (el.hidden = !flags[el.dataset.show]));
    form.elements.namedItem("qty").required = flags.multi;
    form.elements.namedItem("value").required = flags.paid;
    $("#valuelabel").firstChild.textContent = d.multi ? "Valor por unidade" : "Valor";
    $("#estimate").innerHTML =
      cost && d.multi && d.priceKnown
        ? d.purchases.length
          ? `Previsão: <b>${money(forecast(d).known, d.currency)}</b> (compras feitas + unidades restantes)`
          : `Total: ${fmtQty(d.qty)} × ${money(num(d.unitPrice), d.currency)} = <b>${money(forecast(d).known, d.currency)}</b>`
        : cost && !d.priceKnown
          ? "Sem valor ainda: fica como “a definir”."
          : "";
    $("#foldernote").textContent =
      flags.folder && !f.get("date") && data.folder.deadline
        ? `Sem prazo próprio, segue o prazo da pasta: ${fmtDate(data.folder.deadline)}.`
        : "";
    // Avisa se a reserva passa do saldo livre da fonte
    const st = sourceStats(t.id),
      warn =
        cost && !flags.paid
          ? Object.entries(reserves(d))
              .filter(([sid, v]) => sid && v > st[sid].free + 0.005)
              .map(([sid]) => `“${sourceName(sid)}” não tem saldo livre suficiente (${money(st[sid].free)}).`)
          : [];
    $("#allocwarn").innerHTML = warn.join("<br>");
  };
  showForm(
    `<h3>${id ? "Editar" : "Nova"} pendência</h3><fieldset class="sec"><legend>Pendência</legend>${field("O que precisa ser feito?", "title", t.title, "text", 'required maxlength="250"')}<label>Categoria<select name="category" data-prev="${esc(t.category)}" onchange="pickCategory(this)">${categoryOptions(t.category)}</select></label><div class="choices">${choice("kind", "checklist", t.kind === "checklist", "Só checklist", "Sem custo", locked)}${choice("kind", "cost", t.kind === "cost", "Com custo", "Taxa, compra ou serviço")}</div><label>Situação<select name="status">${opts(STATUSES, t.status)}</select></label><label class="inline" data-show="folder"><input type="checkbox" name="required" ${t.required ? "checked" : ""}> Obrigatório para a pasta do ${esc(data.folder?.category || "")}</label><label>Observações<textarea name="notes">${esc(t.notes)}</textarea></label></fieldset><fieldset class="sec"><legend>Prazo</legend>${field("Prazo (opcional)", "date", t.date, "date")}<small id="foldernote"></small></fieldset><fieldset class="sec" data-show="cost"><legend>Custo</legend><div class="twocol"><label id="valuelabel">Valor<input name="value" type="number" min="0.01" step="0.01" placeholder="A definir" value="${t.priceKnown ? (t.multi ? (t.unitPrice ?? "") : t.value || "") : ""}"></label><label>Moeda<select name="currency" ${locked ? "disabled" : ""}><option value="BRL" ${t.currency === "BRL" ? "selected" : ""}>R$ (real)</option><option value="EUR" ${t.currency === "EUR" ? "selected" : ""}>€ (euro)</option></select></label></div>${locked ? `<input type="hidden" name="currency" value="${t.currency}">` : ""}<p id="estimate" class="sub"></p><label>De onde sai o dinheiro${simpleAlloc ? `<select name="plannedSource" data-prev="${esc(t.alloc[0]?.sourceId || "")}" onchange="pickSource(this)">${sourceOptions(t.alloc[0]?.sourceId || "", "Ainda não sei")}<option value="${NEW_CATEGORY}">+ Nova fonte…</option></select>` : `<input value="${esc(originText(t))}" disabled>`}</label>${
      hasPay
        ? `<p class="notice">${badge(payStatus(t).label, payStatus(t).cls)} Já registrado: ${money(paidBRL(t))}. Para ver ou alterar, use <b>Pagamentos</b> na lista.</p>`
        : `<div class="choices">${choice("paidNow", "0", true, "Ainda não paguei")}${choice("paidNow", "1", false, "Já paguei")}</div><div data-show="paid" class="twocol">${field("Data do pagamento", "payDate", todayStr(), "date")}<label>Forma (opcional)<select name="payMethod">${methodOptions(t.method, (k) => k !== "credito")}</select></label></div><div data-show="paideur">${field("Quanto saiu em reais", "paidBrl", "", "number", 'min="0" step="0.01" placeholder="Pela cotação do dia"')}</div><p class="sub" data-show="paid">Pagou no cartão de crédito parcelado? Salve e registre em Pagamentos, na lista.</p>`
    }<p id="allocwarn" class="flag"></p><details class="more"><summary>Mais opções</summary><label class="inline"><input type="checkbox" name="multi" ${t.multi ? "checked" : ""} ${t.purchases.length ? "disabled" : ""}> Comprar em quantidade ou em etapas</label>${t.purchases.length ? `<input type="hidden" name="multi" value="on">` : ""}<div data-show="multi"><div class="twocol">${field("Quantidade", "qty", t.multi ? t.qty : "", "number", 'min="0.01" step="any"')}${field("Unidade", "unit", t.unit, "text", 'maxlength="30" placeholder="un., pares…"')}</div><small>Compras planejadas (quantidade e data)</small><div id="planrows">${t.plan.map(planRow).join("")}</div><button type="button" class="link" onclick="addPlanRow()">+ Adicionar etapa</button></div><label class="inline" data-show="single"><input type="checkbox" name="acquired" ${t.acquired ? "checked" : ""}> Item já adquirido / entregue</label><div class="twocol"><label>Forma de pagamento prevista<select name="method">${methodOptions(t.method, () => true, "A definir")}</select></label><label>Conta ou cartão previsto<select name="accountId" onchange="pickAccount(this)">${accountOptions(t.accountId)}</select></label></div></details></fieldset>${actions(id, "task")}`,
    (f) => {
      const d = draft(f),
        title = f.get("title").trim(),
        paidNow = d.kind === "cost" && !hasPay && f.get("paidNow") === "1";
      if (!title) return;
      if (paidNow && !d.priceKnown) return toast("Informe o valor para registrar o pagamento");
      if (
        $("#allocwarn").textContent &&
        !confirm("A fonte escolhida não tem saldo livre suficiente. Salvar mesmo assim?")
      )
        return;
      const item = {
        ...d,
        id: id || uid(),
        title,
        status: f.get("status"),
        notes: f.get("notes"),
        date: f.get("date"),
        unit: f.get("unit")?.trim() || "",
        required: f.has("required"),
        plan: f
          .getAll("planQty")
          .map((q, i) => ({ id: uid(), qty: Number(q), date: f.getAll("planDate")[i] }))
          .filter((s) => s.qty > 0),
        alloc: d.kind === "cost" ? d.alloc : [],
      };
      if (item.kind === "checklist") Object.assign(item, { priceKnown: false, value: 0, multi: false });
      if (!item.multi) Object.assign(item, { qty: 1, plan: [], unitPrice: null });
      // "Já paguei" registra o pagamento direto, saindo da fonte escolhida
      if (paidNow) {
        const amount = forecast(item).known,
          brl = round2(item.currency === "EUR" ? Number(f.get("paidBrl")) || amount * data.rate : amount);
        item.payments = [
          {
            id: uid(),
            date: f.get("payDate"),
            amount,
            rate: brl / amount,
            brl,
            method: f.get("payMethod") || "",
            accountId: "",
            split: item.alloc[0] ? [{ sourceId: item.alloc[0].sourceId, brl }] : [],
            confirmed: true,
          },
        ];
      }
      id ? (data.tasks[data.tasks.findIndex((x) => x.id === id)] = item) : data.tasks.push(item);
      finish();
    },
    sync,
  );
}

function editIncome(id) {
  const i = data.income.find((x) => x.id === id) || {
    date: "",
    sourceId: data.sources[0]?.id || "",
    description: "",
    value: "",
    notes: "",
    received: true,
  };
  showForm(
    `<h3>${id ? "Editar" : "Nova"} entrada</h3><label>Fonte do dinheiro<select name="sourceId" data-prev="${esc(i.sourceId)}" onchange="pickSource(this)">${i.sourceId && data.sources.some((s) => s.id === i.sourceId) ? "" : '<option value="">Fonte não definida</option>'}${data.sources.map((s) => `<option value="${s.id}" ${s.id === i.sourceId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}<option value="${NEW_CATEGORY}">+ Nova fonte…</option></select></label>${field("Descrição", "description", i.description)}<div class="twocol">${field("Valor (R$)", "value", i.value, "number", 'required min="0.01" step="0.01"')}${field("Data (opcional)", "date", i.date, "date")}</div><label>Situação<select name="received"><option value="1" ${i.received ? "selected" : ""}>Recebido</option><option value="0" ${i.received ? "" : "selected"}>Previsto (ainda não recebido)</option></select></label><p class="sub">Entradas previstas não aumentam o saldo disponível até serem marcadas como recebidas.</p><label>Observações<textarea name="notes">${esc(i.notes)}</textarea></label>${actions(id, "income")}`,
    (f) => {
      const sourceId = f.get("sourceId") === NEW_CATEGORY ? "" : f.get("sourceId"),
        item = {
          ...i,
          id: id || uid(),
          sourceId,
          origin: sourceId ? sourceName(sourceId) : "",
          description: f.get("description"),
          value: Number(f.get("value")),
          date: f.get("date"),
          received: f.get("received") === "1",
          notes: f.get("notes"),
        };
      id ? (data.income[data.income.findIndex((x) => x.id === id)] = item) : data.income.push(item);
      finish();
    },
  );
}
function actions(id, type) {
  return `<div class="actions">${id ? `<button type="button" class="link danger" style="margin-right:auto" onclick="removeItem('${type}','${id}')">Excluir</button>` : ""}<button type="button" class="btn" onclick="$('#modal').close()">Cancelar</button><button class="btn primary">Salvar</button></div>`;
}
function finish(message = "Salvo com sucesso") {
  save();
  $("#modal").close();
  render();
  toast(message);
}
// Exclui a pendência inteira; avisa quando há pagamentos ou compras que também serão apagados
function deleteTask(id) {
  const t = data.tasks.find((x) => x.id === id);
  if (!t) return;
  const extra =
    t.payments.length || t.credits.length || t.purchases.length
      ? "\nOs pagamentos e compras registrados nela também serão apagados e os saldos recalculados."
      : "";
  if (!confirm(`Excluir a pendência “${t.title}”?${extra}`)) return;
  data.tasks = data.tasks.filter((x) => x.id !== id);
  finish("Pendência excluída");
}
function removeItem(type, id) {
  if (type === "task") return deleteTask(id);
  if (!confirm("Excluir este registro?")) return;
  const k = type === "task" ? "tasks" : "income";
  data[k] = data[k].filter((x) => x.id !== id);
  finish("Excluído");
}
