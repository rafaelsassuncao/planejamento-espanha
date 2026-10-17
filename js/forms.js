// Navegação e formulários de pendências e entradas
function go(p) {
  page = p;
  render();
}
document.querySelectorAll("nav button").forEach((b) => (b.onclick = () => go(b.dataset.page)));
function toggle(id, v) {
  const t = data.tasks.find((t) => t.id === id);
  t.status = v ? "Concluído" : t.multi && bought(t) > 0 ? "Em andamento" : "Pendente";
  t.autoDone = false;
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
      alloc: [],
      required: true,
    },
    locked = t.payments.length > 0 || t.purchases.length > 0,
    radio = (val, label, sub) =>
      `<label class="choice"><input type="radio" name="kind" value="${val}" ${t.kind === val ? "checked" : ""} ${locked && val === "checklist" ? "disabled" : ""}><span><b>${label}</b><small>${sub}</small></span></label>`,
    planRow = (s = {}) =>
      `<div class="steprow"><input name="planQty" type="number" min="0.01" step="any" aria-label="Quantidade da etapa" placeholder="Qtd." value="${s.qty ?? ""}"><input name="planDate" type="date" aria-label="Data prevista" value="${esc(s.date || "")}"><button type="button" class="link danger" aria-label="Remover etapa" onclick="this.parentElement.remove();formSync()">✕</button></div>`,
    allocRows = t.alloc.length ? t.alloc.map((a) => splitRow(a.sourceId, a.brl)).join("") : "";
  window.addPlanRow = () => {
    $("#planrows").insertAdjacentHTML("beforeend", planRow());
    formSync();
  };
  const draft = (f) => {
    const multi = f.get("multi") === "on",
      known = f.get("priceKnown") === "1",
      price = f.get("value") === "" ? 0 : Number(f.get("value"));
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
      alloc: readSplitRows()
        .filter((r) => r.sourceId)
        .map((r) => ({ sourceId: r.sourceId, brl: r.brl })),
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
        known: cost && d.priceKnown,
        folder: data.folder && d.category === data.folder.category,
      };
    form.querySelectorAll("[data-show]").forEach((el) => (el.hidden = !flags[el.dataset.show]));
    form.elements.namedItem("value").required = flags.known;
    form.elements.namedItem("qty").required = flags.multi;
    const c = d.currency === "EUR" ? "€" : "R$";
    $("#valuelabel").firstChild.textContent = d.multi
      ? `Valor estimado por unidade (${c})`
      : `Valor estimado (${c})`;
    const fc = forecast(d);
    $("#estimate").innerHTML = !cost
      ? ""
      : d.multi
        ? `${d.priceKnown ? `Custo total estimado: ${fmtQty(d.qty)} × ${money(num(d.unitPrice), d.currency)} = <b>${money(d.qty * num(d.unitPrice), d.currency)}</b>` : "Custo por unidade a definir: não será contado como zero."}${d.purchases.length ? `<br>Previsão atualizada (compras reais + restantes): <b>${money(fc.known, d.currency)}</b>${fc.unknown ? " + restante a definir" : ""}` : ""}`
        : d.priceKnown
          ? d.currency === "EUR" && d.value
            ? `≈ ${money(toBRL(d.value, "EUR"))} pela cotação atual (estimativa)`
            : ""
          : "Valor a definir: a despesa aparece nos resumos como “sem orçamento”.";
    $("#foldernote").textContent =
      flags.folder && !f.get("date") && data.folder.deadline
        ? `Sem prazo próprio, segue o prazo geral da pasta: ${fmtDate(data.folder.deadline)}.`
        : "";
    // Avisa se a reserva passa do saldo livre da fonte
    const st = sourceStats(t.id),
      warn = cost
        ? Object.entries(reserves(d))
            .filter(([sid, v]) => sid && v > st[sid].free + 0.005)
            .map(
              ([sid, v]) =>
                `A reserva de ${money(v)} em “${sourceName(sid)}” ultrapassa o saldo livre (${money(st[sid].free)}).`,
            )
        : [];
    $("#allocwarn").innerHTML = warn.join("<br>");
  };
  showForm(
    `<h3>${id ? "Editar" : "Nova"} pendência</h3><fieldset class="sec"><legend>Dados da pendência</legend>${field("O que precisa ser feito?", "title", t.title, "text", 'required maxlength="250"')}<label>Categoria<select name="category" data-prev="${esc(t.category)}" onchange="pickCategory(this)">${categoryOptions(t.category)}</select></label><div class="choices">${radio("checklist", "Somente checklist", "Tarefa ou documento sem custo")}${radio("cost", "Com custo", "Compra, serviço ou taxa")}</div>${locked ? '<p class="sub">Tem compras ou pagamentos registrados, por isso continua “Com custo”.</p>' : ""}<label>Situação da tarefa<select name="status">${opts(STATUSES, t.status)}</select></label><label class="inline" data-show="folder"><input type="checkbox" name="required" ${t.required ? "checked" : ""}> Obrigatório para concluir a pasta do ${esc(data.folder?.category || "")}</label><label>Observações<textarea name="notes">${esc(t.notes)}</textarea></label></fieldset><fieldset class="sec" data-show="cost"><legend>Quantidade e etapas</legend><label class="inline"><input type="checkbox" name="multi" ${t.multi ? "checked" : ""} ${t.purchases.length ? "disabled" : ""}> Comprar em quantidade ou em etapas</label>${t.purchases.length ? `<input type="hidden" name="multi" value="on">` : ""}<div data-show="multi"><div class="twocol">${field("Quantidade necessária", "qty", t.multi ? t.qty : "", "number", 'min="0.01" step="any"')}${field("Unidade", "unit", t.unit, "text", 'maxlength="30" placeholder="un., pares, caixas…"')}</div><small>Planejamento das compras (quantidade e data prevista)</small><div id="planrows">${t.plan.map(planRow).join("")}</div><button type="button" class="link" onclick="addPlanRow()">+ Adicionar etapa</button></div></fieldset><fieldset class="sec"><legend>Prazo</legend>${field("Prazo (opcional)", "date", t.date, "date")}<small id="foldernote"></small></fieldset><fieldset class="sec" data-show="cost"><legend>Custo e origem do dinheiro</legend><div class="twocol"><label>Moeda<select name="currency" ${locked ? "disabled" : ""}>${opts(["BRL", "EUR"], t.currency)}</select></label><label>Valor<select name="priceKnown"><option value="1" ${t.priceKnown ? "selected" : ""}>Conhecido</option><option value="0" ${t.priceKnown ? "" : "selected"}>A definir</option></select></label></div>${locked ? `<input type="hidden" name="currency" value="${t.currency}">` : ""}<label id="valuelabel" data-show="known">Valor estimado<input name="value" type="number" min="0.01" step="0.01" value="${t.priceKnown ? (t.multi ? (t.unitPrice ?? "") : t.value || "") : ""}"></label><p id="estimate" class="sub"></p><small>Origem do dinheiro (reserva para esta despesa)</small><div id="splitrows">${allocRows}</div><button type="button" class="link" onclick="addSplitRow()">+ ${t.alloc.length ? "Dividir com outra fonte" : "Escolher fonte"}</button><p class="sub">Com uma fonte, deixe o valor em branco para reservar tudo o que falta pagar. Sem fonte, aparece como “Fonte não definida”.</p><p id="allocwarn" class="flag"></p></fieldset>${actions(id, "task")}`,
    (f) => {
      const d = draft(f),
        title = f.get("title").trim();
      if (!title) return;
      if (
        $("#allocwarn").textContent &&
        !confirm("A reserva ultrapassa o saldo livre da fonte. Salvar mesmo assim?")
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
      if (item.status !== t.status) item.autoDone = false;
      syncAcquisition(item);
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
function removeItem(type, id) {
  if (!confirm("Excluir este registro?")) return;
  const k = type === "task" ? "tasks" : "income";
  data[k] = data[k].filter((x) => x.id !== id);
  finish("Excluído");
}
