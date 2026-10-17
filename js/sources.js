// Fontes de dinheiro (venda do apartamento, reserva, salário…) e pasta do Consulado
const sourceInUse = (id) =>
  data.income.some((i) => i.sourceId === id) ||
  data.tasks.some(
    (t) =>
      t.alloc.some((a) => a.sourceId === id) || t.payments.flatMap(paySplit).some((s) => s.sourceId === id),
  );
function addSource(name) {
  const v = name?.trim();
  if (!v || v.length > 70) return null;
  const existing = data.sources.find((s) => s.name.toLowerCase() === v.toLowerCase());
  if (existing) return existing;
  const s = { id: uid(), name: v };
  data.sources.push(s);
  save();
  toast("Fonte criada");
  return s;
}
// Cria uma fonte direto de um formulário, sem sair dele
function pickSource(select) {
  if (select.value !== NEW_CATEGORY) {
    select.dataset.prev = select.value;
    formSync();
    return;
  }
  const s = addSource(prompt("Nome da nova fonte de dinheiro:"));
  if (!s) {
    select.value = select.dataset.prev;
    return;
  }
  document
    .querySelectorAll('#form select[name="splitSource"], #form select[name="sourceId"]')
    .forEach((el) => {
      if (![...el.options].some((o) => o.value === s.id))
        el.querySelector(`option[value="${NEW_CATEGORY}"]`).insertAdjacentHTML(
          "beforebegin",
          `<option value="${s.id}">${esc(s.name)}</option>`,
        );
    });
  select.value = s.id;
  select.dataset.prev = s.id;
  formSync();
}

function manageSources() {
  showForm(
    '<h3>Fontes de dinheiro</h3><p class="sub">Use fontes para separar, por exemplo, o dinheiro da venda do apartamento da reserva pessoal. Só é possível excluir fontes sem entradas, reservas ou pagamentos.</p><div id="sourcelist"></div><label>Nova fonte<input name="newsource" required maxlength="70" placeholder="Ex.: Venda do carro"></label><div class="actions"><button type="button" class="btn" onclick="$(\'#modal\').close()">Fechar</button><button class="btn primary">Adicionar</button></div>',
    (f) => {
      if (addSource(f.get("newsource"))) {
        $("#form").elements.newsource.value = "";
        sourceList();
      }
    },
  );
  sourceList();
}
function sourceList() {
  $("#sourcelist").innerHTML = data.sources
    .map(
      (s) =>
        `<div class="statrow"><span>${esc(s.name)}</span><span class="nowrap"><button type="button" class="link" onclick="renameSource('${s.id}')">Renomear</button><button type="button" class="link danger" onclick="deleteSource('${s.id}')">Excluir</button></span></div>`,
    )
    .join("");
}
function renameSource(id) {
  const s = data.sources.find((x) => x.id === id),
    v = prompt("Nome da fonte:", s.name)?.trim();
  if (!v || v.length > 70) return;
  if (data.sources.some((x) => x.id !== id && x.name.toLowerCase() === v.toLowerCase()))
    return toast("Essa fonte já existe");
  s.name = v;
  data.income.forEach((i) => i.sourceId === id && (i.origin = v));
  save();
  sourceList();
}
function deleteSource(id) {
  if (sourceInUse(id)) return toast("Esta fonte tem entradas, reservas ou pagamentos vinculados");
  if (!confirm("Excluir esta fonte?")) return;
  data.sources = data.sources.filter((s) => s.id !== id);
  save();
  sourceList();
}

// Lista o que está ligado a uma fonte: entradas, reservas e pagamentos
function sourceLinks(id) {
  const name = id ? sourceName(id) : "Fonte não definida",
    incomes = data.income.filter((i) => validSource(i.sourceId) === id),
    reserved = data.tasks
      .map((t) => [t, reserves(t)[id] || 0])
      .filter(([t, v]) => v > 0.005 || (id && t.alloc.some((a) => a.sourceId === id))),
    paid = data.tasks.flatMap((t) =>
      t.payments.flatMap((p) =>
        paySplit(p)
          .filter((s) => validSource(s.sourceId) === id)
          .map((s) => ({ t, p, brl: num(s.brl) })),
      ),
    ),
    list = (title, items) =>
      `<fieldset class="sec"><legend>${title}</legend>${items.join("") || '<p class="sub">Nada vinculado.</p>'}</fieldset>`,
    open = (t) => `<button type="button" class="link" onclick="openTask('${t.id}')">${esc(t.title)}</button>`;
  showForm(
    `<h3>${esc(name)}</h3>${list(
      "Entradas",
      incomes.map(
        (i) =>
          `<div class="statrow"><span>${esc(i.description || "Entrada")} <small>${fmtDate(i.date)}</small>${i.received ? "" : " " + badge("Previsto")}</span><b>${money(i.value)}</b></div>`,
      ),
    )}${list(
      id ? "Reservas para despesas futuras" : "Despesas a pagar sem fonte definida",
      reserved.map(([t, v]) => `<div class="statrow"><span>${open(t)}</span><b>${money(v)}</b></div>`),
    )}${list(
      "Pagamentos realizados",
      paid.map(
        ({ t, p, brl }) =>
          `<div class="statrow"><span>${open(t)} <small>${fmtDate(p.date) || "sem data"}</small></span><b>${money(brl)}</b></div>`,
      ),
    )}<div class="actions"><button type="button" class="btn" onclick="$('#modal').close()">Fechar</button></div>`,
    () => {},
  );
}

function editFolder() {
  const f = data.folder,
    items = (category) =>
      data.tasks
        .filter((t) => t.category === category)
        .map(
          (t) =>
            `<label class="inline"><input type="checkbox" name="req" value="${t.id}" ${t.required ? "checked" : ""}> ${esc(t.title)} <small>${esc(t.status)}</small></label>`,
        )
        .join("") || '<p class="sub">Nenhuma pendência nesta categoria ainda.</p>';
  showForm(
    `<h3>Configurar pasta</h3><label>Categoria da pasta<select name="category" onchange="document.querySelector('#reqlist').innerHTML=folderItems(this.value)">${opts(categories, f.category)}</select></label>${field("Data limite geral (entrega à consultoria)", "deadline", f.deadline, "date")}<p class="sub">Itens sem prazo próprio seguem esta data. Prazos definidos em cada item são mantidos.</p><fieldset class="sec"><legend>Itens obrigatórios para concluir a pasta</legend><div id="reqlist">${items(f.category)}</div></fieldset><div class="actions"><button type="button" class="btn" onclick="$('#modal').close()">Cancelar</button><button class="btn primary">Salvar</button></div>`,
    (fd) => {
      const category = fd.get("category"),
        req = new Set(fd.getAll("req"));
      data.folder = { category, deadline: fd.get("deadline") };
      data.tasks.filter((t) => t.category === category).forEach((t) => (t.required = req.has(t.id)));
      finish("Pasta atualizada");
    },
  );
  window.folderItems = items;
}
