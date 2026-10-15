// Navegação e formulários de pendências e entradas
function go(p) {
  page = p;
  render();
}
document.querySelectorAll("nav button").forEach((b) => (b.onclick = () => go(b.dataset.page)));
function rate(v) {
  if (!Number.isFinite(+v) || +v <= 0) {
    render();
    return;
  }
  data.rate = +v;
  save();
  render();
  toast("Cotação atualizada");
}
function toggle(id, v) {
  data.tasks.find((t) => t.id === id).status = v ? "Concluído" : "Pendente";
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
}
function editTask(id) {
  const t = data.tasks.find((t) => t.id === id) || {
    title: "",
    category: categories[0],
    value: "",
    currency: "BRL",
    status: "Pendente",
    paid: false,
    notes: "",
    date: "",
  };
  $("#form").innerHTML =
    `<h3>${id ? "Editar" : "Nova"} pendência</h3>${field("O que precisa ser feito?", "title", t.title, "text", 'required maxlength="250"')}<label>Categoria<select name="category" data-prev="${esc(t.category)}" onchange="pickCategory(this)">${categoryOptions(t.category)}</select></label><div class="twocol">${field("Valor (opcional)", "value", t.value || "", "number", 'min="0" step="0.01"')}<label>Moeda<select name="currency">${opts(["BRL", "EUR"], t.currency)}</select></label></div><div class="twocol"><label>Situação<select name="status">${opts(["Pendente", "Em andamento", "Concluído"], t.status)}</select></label>${field("Prazo (opcional)", "date", t.date, "date")}</div><label><span><input type="checkbox" name="paid" ${t.paid ? "checked" : ""}> Já foi pago</span></label><label>Observações<textarea name="notes">${esc(t.notes)}</textarea></label>${actions(id, "task")}`;
  $("#form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      item = {
        id: id || crypto.randomUUID(),
        title: f.get("title").trim(),
        category: f.get("category"),
        value: Number(f.get("value")),
        currency: f.get("currency"),
        status: f.get("status"),
        paid: f.has("paid"),
        date: f.get("date"),
        notes: f.get("notes"),
      };
    if (!item.title) return;
    id ? (data.tasks[data.tasks.findIndex((x) => x.id === id)] = item) : data.tasks.push(item);
    finish();
  };
  $("#modal").showModal();
}
function editIncome(id) {
  const i = data.income.find((x) => x.id === id) || {
    date: "",
    origin: "",
    description: "",
    value: "",
    notes: "",
  };
  $("#form").innerHTML =
    `<h3>${id ? "Editar" : "Nova"} entrada</h3>${field("Origem / tipo", "origin", i.origin, "text", "required")}${field("Descrição", "description", i.description)}<div class="twocol">${field("Valor recebido (R$)", "value", i.value, "number", 'required min="0.01" step="0.01"')}${field("Data (opcional)", "date", i.date, "date")}</div><label>Observações<textarea name="notes">${esc(i.notes)}</textarea></label>${actions(id, "income")}`;
  $("#form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      item = Object.fromEntries(f);
    item.value = +item.value;
    item.id = id || crypto.randomUUID();
    if (!item.origin.trim()) return;
    id ? (data.income[data.income.findIndex((x) => x.id === id)] = item) : data.income.push(item);
    finish();
  };
  $("#modal").showModal();
}
function actions(id, type) {
  return `<div class="actions">${id ? `<button type="button" class="link" style="color:#a45b4d;margin-right:auto" onclick="removeItem('${type}','${id}')">Excluir</button>` : ""}<button type="button" class="btn" onclick="$('#modal').close()">Cancelar</button><button class="btn primary">Salvar</button></div>`;
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
