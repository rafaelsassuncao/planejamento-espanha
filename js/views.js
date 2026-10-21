// Renderização das páginas, listas e resumos
const ICONS = {
  wallet:
    '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5"/><path d="M17 14h.01"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  chart: '<path d="M5 20v-6M12 20V9M19 20V4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/>',
  alert:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  coins:
    '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`,
  badge = (label, cls = "") => `<span class="badge ${cls}">${esc(label)}</span>`,
  fmtQty = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
  fmtRate = (r) => Number(r).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
  selectOpts = (pairs, v) =>
    pairs
      .map(
        ([val, label]) => `<option value="${esc(val)}" ${val === v ? "selected" : ""}>${esc(label)}</option>`,
      )
      .join(""),
  incomplete = (n) =>
    n
      ? `<button type="button" class="link flag" onclick="showUnknown()">Previsão incompleta: ${n} ${n === 1 ? "item" : "itens"} com custo a definir →</button>`
      : "";
const statusCls = (s) => (s === "Concluído" ? "done" : s === "Em andamento" ? "prog" : ""),
  statusRow = (s) => (s === "Concluído" ? "st-done" : s === "Em andamento" ? "st-prog" : "");

// Total em euro só do que foi lançado em euro (valor original, sem conversão)
const eurLaunched = (list = data.tasks) =>
  sum(list.filter((t) => isCost(t) && t.currency === "EUR").map((t) => forecast(t).known));
// Quanto do que falta pagar vem de valores marcados como estimativa
const estimatedOpen = () =>
  sum(data.tasks.filter((t) => isCost(t) && t.valueType === "estimado").map(outstandingBRL));
function cards() {
  const o = overall(),
    e = eurLaunched(),
    est = estimatedOpen(),
    card = (cls, ic, label, v, sub) =>
      `<div class="card kpi ${cls}"><span class="iconcircle">${icon(ic)}</span><div><label>${label}</label><div class="amount">${money(v)}</div><span class="sub">${sub}</span></div></div>`;
  return `<div class="cards">${card("green", "wallet", "Saldo atual", o.current, `Recebido ${money(o.received)} − pago ${money(o.paid)}`)}${card("amber", "file", "Custo total", o.total, `${e ? `<b class="eurtotal">Lançado em euro: ${money(e, "EUR")}</b><br>` : ""}Já pago ${money(o.paid)} · falta ${money(o.open)}${est > 0.005 ? `<br>${money(est)} são estimativas` : ""}${o.unknown ? "<br>" + incomplete(o.unknown) : ""}`)}${card("mint", "chart", "Saldo previsto", o.projected, `Depois de pagar tudo${o.expected ? `<br>+ ${money(o.expected)} a receber` : ""}`)}</div>`;
}

function folderCard() {
  const f = folderInfo();
  if (!f) return "";
  const pct = f.items.length ? Math.round((f.done / f.items.length) * 100) : 0,
    plural = (n) => (n === 1 ? "dia" : "dias"),
    days =
      f.days === null
        ? "Sem prazo geral definido"
        : f.days < 0
          ? `Prazo vencido há ${-f.days} ${plural(-f.days)}`
          : f.days === 0
            ? "O prazo é hoje"
            : `${f.days} ${plural(f.days)} restantes`,
    open = f.items.filter((t) => t.status !== "Concluído").sort(byDue),
    tone = f.tone || "info";
  return `<section class="panel folder ${f.tone}"><div class="folderhead"><span class="iconcircle">${icon("file")}</span><div class="grow"><h3>Pasta do ${esc(f.category)}</h3><small>${f.done} de ${f.items.length} itens obrigatórios concluídos · ${f.pending} ${f.pending === 1 ? "falta" : "faltam"}</small><div class="barrow"><div class="bar"><span style="width:${pct}%"></span></div><b>${pct}%</b></div></div><div class="deadline">${icon("calendar")}<span><small>Entregar à consultoria até</small><b>${f.deadline ? fmtDate(f.deadline) : "—"}</b><small>${days}</small></span></div></div><div class="alert ${tone}">${icon(f.tone === "done" ? "check" : f.tone ? "alert" : "info")}<span>${esc(f.message)}</span></div>${
    open.length && page !== "tasks" && page !== "overview"
      ? `<div class="checklist">${open
          .slice(0, expanded.has(f.category) ? open.length : 6)
          .map(
            (t) =>
              `<div class="checkrow"><button type="button" class="donebtn" aria-label="Concluir ${esc(t.title)}" title="Marcar como concluída" onclick="toggle('${t.id}',true)">${icon("check")}</button><button type="button" class="link" onclick="editTask('${t.id}')">${esc(t.title)}</button>${dueStatus(t)?.key === "late" ? badge("Atrasado", "late") : ""}<span class="date">${icon("calendar")} ${fmtDate(dueDate(t)) || "sem prazo"}</span></div>`,
          )
          .join("")}${moreButton(f.category, open.length, 6)}</div>`
      : ""
  }<div class="folderactions">${page === "overview" ? `<button class="btn" onclick="showFolderItems()">Ver pendências do ${esc(f.category)}</button>` : ""}${doneLink(f.done)}<button class="link" onclick="editFolder()">Configurar pasta</button></div><p class="sub">O progresso considera apenas o seu checklist. Não representa validação oficial dos documentos nem aprovação do visto.</p></section>`;
}
// Ao filtrar uma categoria, mostra um card de "pasta" com o progresso e o que falta
const doneLink = (done) =>
  page === "tasks" && done
    ? `<button type="button" class="link" onclick="setFilter('filter','${filter === "Concluído" ? "Não concluídos" : "Concluído"}')">${filter === "Concluído" ? "Voltar às pendentes" : `Ver ${done} ${done === 1 ? "concluída" : "concluídas"}`}</button>`
    : "";
// Abre a lista de pendências filtrada pela pasta
function showFolderItems() {
  page = "tasks";
  cat = data.folder.category;
  filter = "Não concluídos";
  due = "Todos";
  costF = "Todos";
  search = "";
  selected.clear();
  render();
  scrollTo(0, 0);
}
function categoryCard(c) {
  if (data.folder && c === data.folder.category) return folderCard();
  const items = data.tasks.filter((t) => t.category === c);
  if (!items.length) return "";
  const done = items.filter((t) => t.status === "Concluído").length,
    pending = items.length - done,
    pct = Math.round((done / items.length) * 100),
    open = items.filter((t) => t.status !== "Concluído").sort(byDue),
    late = open.filter((t) => dueStatus(t)?.key === "late").length,
    tone = !pending ? "done" : late ? "late" : "info",
    message = !pending
      ? "Tudo concluído nesta categoria!"
      : `${pending === 1 ? "Falta 1 pendência" : `Faltam ${pending} pendências`}${late ? ` · ${late} atrasada${late === 1 ? "" : "s"}` : ""}.`;
  return `<section class="panel folder ${tone === "info" ? "" : tone}"><div class="folderhead"><span class="iconcircle">${icon("folder")}</span><div class="grow"><h3>${esc(c)}</h3><small>${done} de ${items.length} concluídas</small><div class="barrow"><div class="bar"><span style="width:${pct}%"></span></div><b>${pct}%</b></div></div></div><div class="alert ${tone}">${icon(tone === "done" ? "check" : tone === "late" ? "alert" : "info")}<span>${message}</span></div>${
    open.length && page !== "tasks" && page !== "overview"
      ? `<div class="checklist">${open
          .slice(0, expanded.has(c) ? open.length : 8)
          .map(
            (t) =>
              `<div class="checkrow"><button type="button" class="donebtn" aria-label="Concluir ${esc(t.title)}" title="Marcar como concluída" onclick="toggle('${t.id}',true)">${icon("check")}</button><button type="button" class="link" onclick="editTask('${t.id}')">${esc(t.title)}</button>${dueStatus(t)?.key === "late" ? badge("Atrasado", "late") : ""}${dueDate(t) ? `<span class="date">${icon("calendar")} ${fmtDate(dueDate(t))}</span>` : ""}</div>`,
          )
          .join("")}${moreButton(c, open.length, 8)}</div>`
      : ""
  }<div class="folderactions">${doneLink(done)}</div></section>`;
}
// Cards de pasta mostram os primeiros pendentes; "Ver todos" abre a lista completa no próprio card
const expanded = new Set(),
  moreButton = (c, n, limit) =>
    n > limit
      ? `<button type="button" class="link" onclick="toggleExpand('${esc(c)}')">${expanded.has(c) ? "Mostrar menos" : `+ ${n - limit} ${n - limit === 1 ? "item" : "itens"} · ver todos`}</button>`
      : "";
function toggleExpand(c) {
  expanded.has(c) ? expanded.delete(c) : expanded.add(c);
  render();
}

// Próximas 5 pendências não concluídas, pela ordem de prazo
function nextTasks() {
  const next = data.tasks
    .filter((t) => t.status !== "Concluído")
    .sort(byDue)
    .slice(0, 5);
  return next.length
    ? `<div class="nextlist"><small>Próximas pendências</small>${next
        .map((t) => {
          const d = dueStatus(t);
          return `<button type="button" class="nextrow ${statusRow(t.status)}" onclick="showTask('${t.id}')"><span><b>${esc(t.title)}</b><small>${esc(t.category)}</small></span><span class="nextside">${d && d.key !== "done" ? badge(d.label, d.cls) : ""}<span class="badge ${statusCls(t.status)}">${esc(t.status)}</span></span></button>`;
        })
        .join("")}</div>`
    : "";
}
// Leva até a pendência na aba de pendências e a destaca
function showTask(id) {
  const t = data.tasks.find((x) => x.id === id);
  if (!t) return;
  page = "tasks";
  cat = "Todas";
  filter = t.status === "Concluído" ? "Todos" : "Não concluídos";
  due = "Todos";
  costF = "Todos";
  search = "";
  selected.clear();
  render();
  const row = document.querySelector(`#rows tr[data-id="${id}"]`);
  if (row) {
    row.scrollIntoView({ block: "center" });
    row.classList.add("flash");
    setTimeout(() => row.classList.remove("flash"), 2200);
  }
}
function render() {
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  const done = data.tasks.filter((t) => t.status === "Concluído").length,
    pct = data.tasks.length ? Math.round((done / data.tasks.length) * 100) : 0;
  if (page === "overview") {
    $("#app").innerHTML =
      `<div class="hero"><div><span class="tag">NOSSA MUDANÇA • VISTO DE ESTUDANTE</span><h2>Uma nova vida. Um passo de cada vez.</h2><p>3 adultos, 1 bebê e 2 gatas rumo à Espanha.</p></div><div class="landmark" aria-hidden="true">☀︎ ⌂</div></div>${cards()}<section class="panel"><div class="paneltop"><h3>Como está o planejamento?</h3><span class="badge done">${pct}% concluído</span></div><div class="bar"><span style="width:${pct}%"></span></div><p class="muted">${done} de ${data.tasks.length} pendências resolvidas. Cada detalhe conta.</p>${nextTasks()}<button class="link" onclick="go('tasks')">Ver todas as pendências →</button></section>${folderCard()}`;
  }
  if (page === "tasks") {
    $("#app").innerHTML =
      `<section class="panel tasks-panel"><div class="paneltop"><div><h3>Pendências e custos</h3><p class="sub">Seu checklist da mudança, com prazos, andamento e pagamentos.</p></div><div class="panelactions"><button class="btn" onclick="manageCategories()">Categorias</button><button class="btn primary big" onclick="editTask()">+ Nova pendência</button></div></div><div class="tools"><label class="searchbox">${icon("search")}<input id="search" aria-label="Buscar pendência" placeholder="Buscar pendência ou observação…" value="${esc(search)}"></label>${filterSelect("cat")}<span class="mobilefilters">${filterSelect("due")}${filterSelect("filter")}${filterSelect("costf")}</span>${filterSelect("sort")}</div><p class="sub hint">${sort === "manual" ? "Segure ⠿ para arrastar. " : "Ordenado por vencimento. "}Mude o andamento direto na lista. Marque as caixas para somar só algumas pendências.</p><div id="rows"></div></section>`;
    updateRows();
    $("#search").oninput = (e) => {
      search = e.target.value;
      selected.clear();
      updateRows();
    };
  }
  if (page === "income") $("#app").innerHTML = sourcesPanel() + cardsPanel() + incomeTable();
  if (page === "settings")
    $("#app").innerHTML =
      `<div class="grid"><section class="panel"><h3>Cotação do euro</h3><p class="muted">Atualização automática ao abrir e a cada hora. Só o que ainda falta pagar é recalculado; pagamentos já feitos mantêm a cotação registrada.</p><label>1 euro = R$ <b>${fmtRate(data.rate)}</b></label><p class="notice">${rateInfo()}</p></section><section class="panel"><h3 style="margin-bottom:20px">Backup</h3><button class="btn primary" onclick="backup()">↓ Exportar backup</button> <button class="btn" onclick="$('#import').click()">↑ Importar backup</button><input hidden id="import" type="file" accept="application/json" onchange="restore(this)"></section><section class="panel"><h3>Cartões e contas</h3><p class="muted">Apelidos usados nos pagamentos, sem dados sensíveis do cartão.</p><button class="btn" onclick="manageAccounts()">Gerenciar cartões e contas</button></section><section class="panel"><h3>Conta</h3><p class="muted">Conectado como <b>${esc(window.currentEmail)}</b>. Os dados ficam salvos na nuvem e sincronizados entre os aparelhos.</p><button class="btn" onclick="if(confirm('Sair desta conta?'))logout()">Sair</button></section></div>`;
}

const byDue = (a, b) =>
  (a.status === "Concluído") - (b.status === "Concluído") ||
  (dueDate(a) || "9999").localeCompare(dueDate(b) || "9999");
// Filtro por custo: sem custo (checklist), sem valor definido, a pagar ou pago
function matchCost(t) {
  if (costF === "Sem custo") return !isCost(t);
  if (costF === "Sem valor") return isCost(t) && forecast(t).unknown;
  if (costF === "A pagar") return isCost(t) && outstandingBRL(t) > 0.005;
  if (costF === "Pago") return isCost(t) && payStatus(t).label.startsWith("Pago");
  return true;
}
function matchDue(t) {
  const k = dueStatus(t)?.key;
  if (due === "Atrasados") return k === "late";
  if (due === "Próximos") return k === "today" || k === "near";
  if (due === "Sem prazo") return !dueDate(t);
  return true;
}
// Abre a lista só com as pendências que ainda precisam de valor
function showUnknown() {
  page = "tasks";
  cat = "Todas";
  filter = "Todos";
  due = "Todos";
  search = "";
  costF = "Sem valor";
  if ($("#modal").open) $("#modal").close();
  render();
  scrollTo(0, 0);
}
function clearUnknown() {
  costF = "Todos";
  updateRows();
}
// Filtros usados no cabeçalho da tabela e, no celular, na barra de cima
const FILTERS = {
  cat: {
    label: "Filtrar categoria",
    opts: () => [["Todas", "Todas as categorias"], ...categories.map((c) => [c, c])],
    get: () => cat,
    set: (v) => (cat = v),
  },
  due: {
    label: "Filtrar por prazo",
    opts: () => [
      ["Todos", "Prazo: todos"],
      ["Atrasados", "Atrasados"],
      ["Próximos", `Vencem em até ${NEAR_DAYS} dias`],
      ["Sem prazo", "Sem prazo"],
    ],
    get: () => due,
    set: (v) => (due = v),
  },
  filter: {
    label: "Filtrar por situação",
    opts: () => [
      ["Todos", "Andamento: todos"],
      ["Não concluídos", "Não concluídos"],
      ...STATUSES.map((s) => [s, s]),
    ],
    get: () => filter,
    set: (v) => (filter = v),
  },
  costf: {
    label: "Filtrar por custo",
    opts: () => [
      ["Todos", "Pagamento: todos"],
      ["Sem custo", "Sem custo (checklist)"],
      ["Sem valor", "Sem valor definido"],
      ["A pagar", "A pagar"],
      ["Pago", "Pago"],
    ],
    get: () => costF,
    set: (v) => (costF = v),
  },
  sort: {
    label: "Ordenar",
    opts: () => [
      ["manual", "Minha ordem"],
      ["prazo", "Por vencimento"],
    ],
    get: () => sort,
    set: (v) => (sort = v),
  },
};
const filterSelect = (k, cls = "") =>
  `<select data-f="${k}" class="${cls}" aria-label="${FILTERS[k].label}" onchange="setFilter('${k}',this.value)">${selectOpts(FILTERS[k].opts(), FILTERS[k].get())}</select>`;
// Ao trocar um filtro, a seleção começa de novo
function setFilter(k, v) {
  FILTERS[k].set(v);
  selected.clear();
  k === "sort" || k === "cat" ? render() : updateRows();
}
function toggleSelect(id) {
  selected.has(id) ? selected.delete(id) : selected.add(id);
  updateRows();
}
function selectAll(on) {
  document
    .querySelectorAll("#rows tr[data-id]")
    .forEach((r) => (on ? selected.add(r.dataset.id) : selected.delete(r.dataset.id)));
  updateRows();
}
function updateRows() {
  const base = (t) =>
      matchCost(t) &&
      (cat === "Todas" || t.category === cat) &&
      matchDue(t) &&
      (t.title + " " + t.notes).toLowerCase().includes(search.toLowerCase()),
    hiddenDone =
      filter === "Não concluídos" ? data.tasks.filter((t) => base(t) && t.status === "Concluído").length : 0;
  let list = data.tasks.filter(
    (t) =>
      base(t) &&
      (filter === "Todos" || (filter === "Não concluídos" ? t.status !== "Concluído" : t.status === filter)),
  );
  if (sort === "prazo") list = [...list].sort(byDue);
  $("#rows").innerHTML =
    (costF === "Sem valor"
      ? `<div class="alert warn">${icon("alert")}<span>Mostrando só as pendências sem valor (${list.length}). Toque em Editar para preencher.</span><button type="button" class="link" onclick="clearUnknown()">Limpar filtro</button></div>`
      : "") +
    (cat !== "Todas" && costF === "Todos" ? safe(() => categoryCard(cat)) : "") +
    safe(() => summary(list)) +
    (hiddenDone
      ? `<p class="sumnote">${hiddenDone} ${hiddenDone === 1 ? "concluída oculta" : "concluídas ocultas"} <button type="button" class="link" onclick="setFilter('filter','Todos')">mostrar</button></p>`
      : "") +
    taskTable(list, sort === "manual", true);
  const all = $("#selall"),
    n = list.filter((t) => selected.has(t.id)).length;
  if (all) {
    all.checked = n === list.length;
    all.indeterminate = n > 0 && n < list.length;
  }
}
// Totais das pendências marcadas entre as exibidas (respeita busca e filtros)
function summary(list) {
  const picked = list.filter((t) => selected.has(t.id)),
    chosen = picked.length ? picked : list,
    s = totals(chosen),
    e = eurLaunched(chosen),
    box = (label, v, extra = "") => `<div><small>${label}</small><b>${money(v)}</b>${extra}</div>`;
  return `<div class="summary">${box(`Custo total${cat === "Todas" ? "" : " em " + esc(cat)}`, s.total, e ? `<small>Lançado em euro: ${money(e, "EUR")}</small>` : "")}${box("Já pago", s.paid)}${box("Falta pagar", s.open)}</div>${picked.length ? `<p class="sumnote">Somando ${picked.length} ${picked.length === 1 ? "selecionada" : "selecionadas"} de ${list.length} <button type="button" class="link" onclick="selectAll(false)">limpar seleção</button></p>` : ""}${s.unknown && costF !== "Sem valor" ? `<button type="button" class="link flag" onclick="showUnknown()">${s.unknown} ${s.unknown === 1 ? "item ainda sem valor" : "itens ainda sem valor"} (não contados como zero) · ver quais →</button>` : ""}`;
}

function qtyBlock(t) {
  const b = bought(t),
    rest = Math.max(0, t.qty - b),
    pct = Math.min(100, Math.round((b / t.qty) * 100)),
    next = planSteps(t).find((s) => !s.done);
  return `<div class="qty"><small>${fmtQty(b)} de ${fmtQty(t.qty)} ${esc(t.unit || "un.")} compradas · ${rest ? `faltam ${fmtQty(rest)}` : "aquisição concluída ✓"}</small><div class="bar mini"><span style="width:${pct}%"></span></div>${next ? `<small>Próxima compra: ${fmtQty(next.qty)} ${next.date ? "em " + fmtDate(next.date) : "(data a definir)"}</small>` : ""}</div>`;
}
// Data legível: 15 nov 2026
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  fmtDay = (s) => {
    const [y, m, d] = s.split("-");
    return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  };
// Prazo: data em destaque; "Dentro do prazo" discreto; atraso e vencimento próximo em selo
function dueCell(t) {
  const s = dueDate(t),
    d = dueStatus(t);
  if (!s) return '<span class="muted small">Sem prazo</span>';
  const urgent = d && ["late", "today", "near"].includes(d.key);
  return `<span class="date">${fmtDay(s)}</span>${urgent ? badge(d.label, d.cls) : d?.key === "ok" ? '<small class="ontime">Dentro do prazo</small>' : ""}${t.date ? "" : '<small class="muted">prazo da pasta</small>'}`;
}
// Situação do pagamento, separada do andamento da pendência
function payCell(t) {
  if (!isCost(t)) return '<span class="muted small">Sem custo</span>';
  const ps = payStatus(t),
    lines = [badge(ps.label, ps.cls)];
  if (ps.label === "Parcialmente pago") lines.push(`<small>Pago ${money(paidBRL(t))}</small>`);
  t.credits.forEach((c) => {
    const p = c.installments.filter((i) => i.payment).length;
    if (p < c.installments.length)
      lines.push(
        `<small>${esc(accountName(c.accountId) || "Cartão")}: ${p} de ${c.installments.length} parcelas</small>`,
      );
  });
  if (t.payments.some((p) => !isConfirmed(p))) lines.push("<small>Pagamento agendado</small>");
  return lines.join("");
}
// Valor na moeda em que foi lançado, alinhado à direita
function valueCell(t) {
  if (!isCost(t)) return '<span class="muted small">—</span>';
  const f = forecast(t);
  if (!(f.known > 0)) return '<span class="muted small">A definir</span>';
  return `<b class="amount-sm">${money(f.known, t.currency)}</b>${f.unknown ? "<small>+ a definir</small>" : ""}${t.valueType === "estimado" ? '<span class="vtag">estimado</span>' : t.valueType === "confirmado" ? '<span class="vtag ok">confirmado</span>' : ""}${t.valueNote ? `<small class="vnote">${esc(t.valueNote)}</small>` : ""}`;
}
// Progresso das compras em etapas com a quantidade real adquirida (0 de 3 = barra vazia)
function qtyProgress(t) {
  if (!isCost(t) || !t.multi) return "";
  const b = bought(t),
    pct = Math.max(0, Math.min(100, Math.round((b / t.qty) * 100)));
  return `<div class="qtyprog"><div class="bar mini" role="progressbar" aria-valuemin="0" aria-valuemax="${t.qty}" aria-valuenow="${b}"><span style="width:${pct}%"></span></div><small>${fmtQty(b)} de ${fmtQty(t.qty)} ${esc(t.unit || "un.")} comprados</small></div>`;
}
function originText(t) {
  if (!t.alloc.length) return "Fonte não definida";
  return t.alloc
    .map((a) => sourceName(a.sourceId) + (a.brl !== null && a.brl !== "" ? ` (${money(num(a.brl))})` : ""))
    .join(" + ");
}
function taskTable(a, manual = true, sel = false) {
  if (!a.length) return '<div class="empty">Nenhuma pendência por aqui.</div>';
  const th = (label, k, cls = "") =>
    `<th class="${cls}">${sel && k ? filterSelect(k, "hfilter") : label}</th>`;
  return `<div class="tablewrap tasks-wrap"><table class="cardtable tasks${selected.size ? " has-sel" : ""}"><thead><tr><th class="c-task">${sel ? `<input class="sel" type="checkbox" id="selall" aria-label="Selecionar todas para somar" onchange="selectAll(this.checked)">` : ""}Pendência</th>${th("Prazo", "due", "c-due")}${th("Andamento", "filter", "c-status")}${th("Pagamento", "costf", "c-pay")}<th class="c-val">Valor</th><th class="c-act"><span class="sr-only">Ações</span></th></tr></thead><tbody>${a
    .map((t) => {
      try {
        return `<tr data-id="${t.id}" class="${statusRow(t.status)}${sel && selected.has(t.id) ? " picked" : ""}"><td data-label="Pendência" class="c-task"><div class="taskcell">${sel ? `<input class="sel" type="checkbox" aria-label="Selecionar ${esc(t.title)} para somar" ${selected.has(t.id) ? "checked" : ""} onchange="toggleSelect('${t.id}')">` : ""}${manual ? '<span class="draghandle" tabindex="0" role="button" aria-label="Arrastar pendência" title="Segure e arraste para reordenar">⠿</span>' : ""}<span class="tinfo"><button type="button" class="link title" onclick="editTask('${t.id}')">${esc(t.title)}</button><span class="catpill">${esc(t.category)}</span>${t.notes ? `<small class="tnotes">${esc(t.notes)}</small>` : ""}${qtyProgress(t)}</span></div></td><td data-label="Prazo" class="c-due"><div class="stack">${dueCell(t)}</div></td><td data-label="Andamento" class="c-status"><div><select class="statussel ${statusCls(t.status) || "pend"}" aria-label="Andamento de ${esc(t.title)}" onchange="setStatus('${t.id}', this.value)">${STATUSES.map((s) => `<option ${s === t.status ? "selected" : ""}>${s}</option>`).join("")}</select></div></td><td data-label="Pagamento" class="c-pay"><div class="stack">${payCell(t)}</div></td><td data-label="Valor" class="c-val"><div class="stack end">${valueCell(t)}</div></td><td class="rowactions c-act"><button type="button" class="act2" title="Editar" aria-label="Editar ${esc(t.title)}" onclick="editTask('${t.id}')">${icon("edit")}<span>Editar</span></button>${isCost(t) ? `<button type="button" class="act2" title="Pagamento" aria-label="Pagamento de ${esc(t.title)}" onclick="openTask('${t.id}')">${icon("card")}<span>Pagamento</span></button>` : '<span class="act2gap"></span>'}<details class="rowmenu"><summary aria-label="Mais ações de ${esc(t.title)}" title="Mais ações">⋯</summary><div class="menu"><button type="button" class="danger" title="Excluir pendência" onclick="this.closest('details').open=false;deleteTask('${t.id}')">${icon("trash")}<span>Excluir pendência</span></button></div></details></td></tr>`;
      } catch (err) {
        return badRow(t, err);
      }
    })
    .join("")}</tbody></table></div>`;
}
// Linha de aviso quando uma pendência não pode ser exibida (o resto da lista continua aparecendo)
function badRow(t, err) {
  console.error(err);
  return `<tr data-id="${esc(t?.id)}"><td colspan="6"><div class="alert late">${icon("alert")}<span>Não consegui mostrar “${esc(t?.title || "sem nome")}”. <small>${esc(err?.message)}</small></span><button type="button" class="link" onclick="editTask('${esc(t?.id)}')">Editar</button></div></td></tr>`;
}
const safe = (fn) => {
  try {
    return fn();
  } catch (err) {
    console.error(err);
    return `<p class="flag">Não foi possível calcular este bloco: ${esc(err.message)}</p>`;
  }
};

function sourcesPanel() {
  const st = sourceStats(),
    neg = (v) => (v < -0.005 ? ` class="neg" title="Ultrapassa o saldo"` : ""),
    rows = [...data.sources.map((s) => [s.id, s.name]), ["", "Fonte não definida"]].filter(
      ([id]) => id || Object.values(st[""]).some((v) => Math.abs(v) > 0.005),
    );
  return `<section class="panel"><div class="paneltop"><h3>Fontes de dinheiro</h3><div class="panelactions"><button class="btn" onclick="manageSources()">Fontes</button><button class="btn primary" onclick="editIncome()">+ Nova entrada</button></div></div><p class="sub">Saldo atual = recebido − utilizado. Reservado = o que já está separado para pagar despesas.</p><div class="tablewrap"><table class="cardtable"><thead><tr><th>Fonte</th><th>Recebido</th><th>Utilizado</th><th>Saldo atual</th><th>Reservado</th><th>Saldo livre</th><th></th></tr></thead><tbody>${rows
    .map(([id, name]) => {
      const s = st[id],
        noBalance = !id && !s.received && !s.expected,
        bal = (v) => (noBalance ? "—" : `<b>${money(v)}</b>`);
      return `<tr><td data-label="Fonte"><div><b>${esc(name)}</b>${s.expected ? `<br><small>+ ${money(s.expected)} previsto</small>` : ""}</div></td><td data-label="Recebido"><div>${money(s.received)}</div></td><td data-label="Utilizado"><div>${money(s.used)}</div></td><td data-label="Saldo atual"${noBalance ? "" : neg(s.current)}><div>${bal(s.current)}</div></td><td data-label="${id ? "Reservado" : "A pagar sem fonte"}"><div>${money(s.reserved)}</div></td><td data-label="Saldo livre"${noBalance ? "" : neg(s.free)}><div>${bal(s.free)}${!noBalance && s.free < -0.005 ? "<br><small>⚠ reservas acima do saldo</small>" : ""}</div></td><td class="rowactions"><button class="link" onclick="sourceLinks('${id}')">Ver vínculos</button></td></tr>`;
    })
    .join("")}</tbody></table></div></section>`;
}
// Faturas em aberto por cartão; pagar a fatura quita as parcelas vinculadas
function cardsPanel() {
  const bills = openBills();
  return `<section class="panel"><div class="paneltop"><div class="titleicon"><span class="iconcircle small">${icon("card")}</span><h3>Cartões e faturas</h3></div><button class="btn" onclick="manageAccounts()">Cartões e contas</button></div>${
    bills.length
      ? `<p class="sub">Compras no crédito comprometem o orçamento; o saldo da fonte só diminui quando a parcela ou a fatura é paga.</p>${bills
          .map(
            (b) =>
              `<div class="statrow"><span><b>${esc(accountName(b.accountId) || "Cartão")}</b> · fatura de ${monthName(b.month)}<br><small>vence ${fmtDate(b.due)} · ${b.items.map(({ t, c, i }) => `${esc(t.title)} ${i.n}/${c.installments.length}`).join(", ")}</small></span><span class="nowrap"><b>${money(b.total)}</b> <button class="btn small" onclick="payBill('${b.accountId}','${b.month}')">Pagar fatura</button></span></div>`,
          )
          .join("")}`
      : `<p class="sub">${data.accounts.length ? "Nenhuma fatura em aberto." : "Cadastre seus cartões e contas por apelido (ex.: C6, XP, Inter). Não informe número, validade ou código de segurança."}</p>`
  }</section>`;
}
function incomeTable() {
  return `<section class="panel"><div class="paneltop"><h3>Histórico de entradas</h3></div>${
    data.income.length
      ? `<div class="tablewrap"><table class="cardtable"><thead><tr><th>Fonte / descrição</th><th>Data</th><th>Valor</th><th>Situação</th><th>Observações</th><th></th></tr></thead><tbody>${data.income
          .map(
            (i) =>
              `<tr><td data-label="Fonte"><div><b>${esc(sourceName(i.sourceId))}</b>${i.description ? `<br><small>${esc(i.description)}</small>` : ""}</div></td><td data-label="Data"><div>${i.date ? fmtDate(i.date) : "Não informada"}</div></td><td data-label="Valor"><div><b>${money(i.value)}</b></div></td><td data-label="Situação"><div>${i.received ? badge("Recebido", "done") : badge("Previsto")}</div></td><td data-label="Observações"><div>${esc(i.notes) || "—"}</div></td><td class="rowactions"><button class="link" onclick="editIncome('${i.id}')">Editar</button><button class="link danger" aria-label="Excluir entrada" title="Excluir" onclick="removeItem('income','${i.id}')">🗑</button></td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : '<div class="empty">Nenhuma entrada registrada.</div>'
  }</section>`;
}
