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
// Dica ⓘ: explicação que só aparece ao passar o mouse ou tocar
const tip = (text) =>
  `<span class="tip" tabindex="0" role="note" aria-label="${esc(text)}">ⓘ<span class="tiptext">${esc(text)}</span></span>`;
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
    n ? `<button type="button" class="link flag" onclick="showUnknown()">${n} sem valor →</button>` : "";
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
    card = (cls, ic, label, v, sub, help = "") =>
      `<div class="card kpi ${cls}"><span class="iconcircle">${icon(ic)}</span><div><label>${label} ${help ? tip(help) : ""}</label><div class="amount">${money(v)}</div><span class="sub">${sub}</span></div></div>`;
  return `<div class="cards">${card("green", "wallet", "Saldo atual", o.current, "", `Recebido ${money(o.received)} − pago ${money(o.paid)}`)}${card("amber", "file", "Custo total", o.total, `Pago ${money(o.paid)} · falta ${money(o.open)}${e ? `<br>${money(e, "EUR")} em euro` : ""}${o.unknown ? "<br>" + incomplete(o.unknown) : ""}`, est > 0.005 ? `${money(est)} são estimativas` : "")}${card("mint", "chart", "Saldo previsto", o.projected, `${o.expected ? `+ ${money(o.expected)} a receber` : ""}`, "Saldo atual menos o que falta pagar")}</div>`;
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
  return `<section class="panel folder ${f.tone}"><div class="folderhead"><span class="iconcircle">${icon("file")}</span><div class="grow"><h3>Pasta do ${esc(f.category)} ${tip("Progresso do seu checklist. Não é validação oficial dos documentos nem aprovação do visto.")}</h3><small>${f.done} de ${f.items.length} concluídos</small><div class="barrow"><div class="bar"><span style="width:${pct}%"></span></div><b>${pct}%</b></div></div><div class="deadline">${icon("calendar")}<span><small>Entrega à consultoria</small><b>${f.deadline ? fmtDate(f.deadline) : "—"}</b><small>${days}</small></span></div></div><div class="alert ${tone}">${icon(f.tone === "done" ? "check" : f.tone ? "alert" : "info")}<span>${esc(f.message)}</span></div>${
    open.length && page !== "tasks" && page !== "overview"
      ? `<div class="checklist">${open
          .slice(0, expanded.has(f.category) ? open.length : 6)
          .map(
            (t) =>
              `<div class="checkrow"><button type="button" class="donebtn" aria-label="Concluir ${esc(t.title)}" title="Marcar como concluída" onclick="toggle('${t.id}',true)">${icon("check")}</button><button type="button" class="link" onclick="editTask('${t.id}')">${esc(t.title)}</button>${dueStatus(t)?.key === "late" ? badge("Atrasado", "late") : ""}<span class="date">${icon("calendar")} ${fmtDate(dueDate(t)) || "sem prazo"}</span></div>`,
          )
          .join("")}${moreButton(f.category, open.length, 6)}</div>`
      : ""
  }<div class="folderactions">${page === "overview" ? `<button class="btn" onclick="showFolderItems()">Ver pendências do ${esc(f.category)}</button>` : ""}${doneLink(f.done)}<button class="link" onclick="editFolder()">Configurar pasta</button></div></section>`;
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
          return `<button type="button" class="nextrow ${statusRow(t.status)}" onclick="showTask('${t.id}')"><span><b>${esc(t.title)}</b><small>${esc(t.category)}${(t.steps || []).find((s) => !s.done) ? " · Próxima etapa: " + esc((t.steps || []).find((s) => !s.done).text) : ""}</small></span><span class="nextside">${d && ["late", "today", "near"].includes(d.key) ? badge(d.label, d.cls) : ""}<span class="badge ${statusCls(t.status)}">${esc(t.status)}</span></span></button>`;
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
// Partes de cada página: viram submenu no menu lateral e botões no topo da página no celular
const PARTS = {
  tasks: () => {
    const open = (c) =>
      data.tasks.filter((t) => (c === "Todas" || t.category === c) && t.status !== "Concluído").length;
    return ["Todas", ...categories.filter((c) => c === cat || data.tasks.some((t) => t.category === c))].map(
      (c) => ({ label: c, n: open(c), on: cat === c, pick: () => pickCat(c) }),
    );
  },
  income: () =>
    [
      ["fontes", "Fontes e saldos"],
      ["entradas", "Entradas"],
      ["cartoes", "Cartões e faturas"],
    ].map(([k, label]) => ({
      label,
      on: incomePart === k,
      pick: () => {
        incomePart = k;
        render();
        scrollTo(0, 0);
      },
    })),
};
function pickCat(c) {
  page = "tasks";
  cat = c;
  costF = "Todos";
  selected.clear();
  render();
  scrollTo(0, 0);
}
function pickPart(p, i) {
  PARTS[p]()[i]?.pick();
}
const partButtons = (p) =>
  PARTS[p]()
    .map(
      (it, i) =>
        `<button type="button" title="${esc(it.label)}" class="${it.on ? "on" : ""}"${it.on ? ' aria-current="page"' : ""} onclick="pickPart('${p}',${i})"><span>${esc(it.label)}</span>${it.n !== undefined ? `<small>${it.n}</small>` : ""}</button>`,
    )
    .join("");
// Menu lateral: grupo ativo, submenu aberto (um por vez) e destaque que desliza até o grupo
function renderNav() {
  if (page !== navPage) navOpen = navPage = page;
  const nav = document.querySelector("aside nav");
  nav.querySelector(".submenu")?.remove();
  nav.querySelectorAll(":scope > button[data-page]").forEach((b) => {
    const on = b.dataset.page === page;
    b.classList.toggle("active", on);
    on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
    if (PARTS[b.dataset.page]) b.setAttribute("aria-expanded", navOpen === b.dataset.page);
    if (navOpen === b.dataset.page && PARTS[navOpen])
      b.insertAdjacentHTML("afterend", `<div class="submenu">${partButtons(navOpen)}</div>`);
  });
  placePill();
}
function placePill() {
  const pill = document.querySelector(".navpill"),
    b = document.querySelector("aside nav > button.active");
  if (!pill) return;
  pill.style.opacity = b ? 1 : 0;
  if (b)
    Object.assign(pill.style, {
      width: b.offsetWidth + "px",
      height: b.offsetHeight + "px",
      transform: `translate(${b.offsetLeft}px, ${b.offsetTop}px)`,
    });
}
addEventListener("resize", placePill);
document.fonts?.ready.then(placePill);
// No celular as partes da página aparecem como botões no topo
const subnav = (p) => `<nav class="subnav" aria-label="Partes da página">${partButtons(p)}</nav>`;
function render() {
  renderNav();
  const done = data.tasks.filter((t) => t.status === "Concluído").length,
    pct = data.tasks.length ? Math.round((done / data.tasks.length) * 100) : 0;
  if (page === "overview") {
    $("#app").innerHTML =
      `${cards()}<section class="panel"><div class="paneltop"><h3>Como está o planejamento?</h3><span class="badge done">${pct}% concluído</span></div><div class="bar"><span style="width:${pct}%"></span></div><p class="muted">${done} de ${data.tasks.length} concluídas</p>${nextTasks()}<button class="link" onclick="go('tasks')">Ver todas as pendências →</button></section>${folderCard()}`;
  }
  if (page === "tasks") {
    $("#app").innerHTML =
      `${subnav("tasks")}<div class="tpage"><div class="tphead"><h2>Pendências e custos</h2><div class="panelactions"><button class="btn" onclick="manageCategories()">Categorias</button><button class="btn primary big" onclick="editTask()">+ Nova pendência</button></div></div><div id="sum"></div><div class="tools2"><label class="searchbox">${icon("search")}<input id="search" type="search" aria-label="Buscar pendência" placeholder="Buscar pendência ou etapa" value="${esc(search)}"></label><details class="morefilters"><summary>Filtros<span id="morecount"></span></summary><div class="menu">${["due", "costf", "sort"].map((k) => `<label>${FILTERS[k].label}${filterSelect(k)}</label>`).join("")}</div></details><div id="chips" class="chips"></div></div><div id="rows"></div></div>`;
    updateRows();
    $("#search").oninput = (e) => {
      search = e.target.value;
      selected.clear();
      updateRows();
    };
  }
  if (page === "income")
    $("#app").innerHTML =
      subnav("income") +
      (incomePart === "entradas" ? incomeTable() : incomePart === "cartoes" ? cardsPanel() : sourcesPanel());
  if (page === "settings")
    $("#app").innerHTML =
      `<div class="grid"><section class="panel"><h3>Cotação do euro ${tip("Atualiza sozinha a cada hora. Pagamentos já feitos mantêm a cotação registrada.")}</h3><label>1 euro = R$ <b>${fmtRate(data.rate)}</b></label><p class="notice">${rateInfo()}</p></section><section class="panel"><h3 style="margin-bottom:20px">Backup</h3><button class="btn primary" onclick="backup()">↓ Exportar backup</button> <button class="btn" onclick="$('#import').click()">↑ Importar backup</button><input hidden id="import" type="file" accept="application/json" onchange="restore(this)"></section><section class="panel"><h3>Cartões e contas</h3><button class="btn" onclick="manageAccounts()">Gerenciar cartões e contas</button></section><section class="panel"><h3>Conta</h3><p class="muted">${esc(window.currentEmail)}</p><button class="btn" onclick="if(confirm('Sair desta conta?'))logout()">Sair</button></section></div>`;
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
// Filtros da barra de cima: categoria à vista, os demais em "Filtros"
const FILTERS = {
  cat: {
    label: "Categoria",
    opts: () => [["Todas", "Todas as categorias"], ...categories.map((c) => [c, c])],
    get: () => cat,
    set: (v) => (cat = v),
  },
  due: {
    label: "Prazo",
    opts: () => [
      ["Todos", "Todos"],
      ["Atrasados", "Atrasados"],
      ["Próximos", `Vencem em até ${NEAR_DAYS} dias`],
      ["Sem prazo", "Sem prazo"],
    ],
    get: () => due,
    set: (v) => (due = v),
  },
  filter: {
    label: "Andamento",
    opts: () => [
      ["Todos", "Andamento: todos"],
      ["Não concluídos", "Não concluídos"],
      ...STATUSES.map((s) => [s, s]),
    ],
    get: () => filter,
    set: (v) => (filter = v),
  },
  costf: {
    label: "Pagamento",
    opts: () => [
      ["Todos", "Todos"],
      ["Sem custo", "Sem custo (checklist)"],
      ["Sem valor", "Sem valor definido"],
      ["A pagar", "A pagar"],
      ["Pago", "Pago"],
    ],
    get: () => costF,
    set: (v) => (costF = v),
  },
  sort: {
    label: "Ordem",
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
  const text = (t) =>
      (cat === "Todas" || t.category === cat) &&
      matchDue(t) &&
      (t.title + " " + t.notes + " " + (t.steps || []).map((s) => s.text).join(" "))
        .toLowerCase()
        .includes(search.toLowerCase()),
    base = (t) => text(t) && matchCost(t),
    byStatus = (t, f = filter) =>
      f === "Todos" || (f === "Não concluídos" ? t.status !== "Concluído" : t.status === f),
    hiddenDone =
      filter === "Não concluídos" ? data.tasks.filter((t) => base(t) && t.status === "Concluído").length : 0;
  let list = data.tasks.filter((t) => base(t) && byStatus(t));
  if (sort === "prazo") list = [...list].sort(byDue);
  // Botões de andamento com a contagem de cada um; "Sem valor" liga e desliga o filtro de custo
  const count = (f) => data.tasks.filter((t) => base(t) && byStatus(t, f)).length,
    noValue = data.tasks.filter((t) => {
      try {
        return text(t) && byStatus(t) && isCost(t) && forecast(t).unknown;
      } catch {
        return false;
      }
    }).length,
    chip = (label, n, on, fn, cls = "") =>
      `<button type="button" class="chip${on ? " on" : ""}${cls}" aria-pressed="${on}" onclick="${fn}">${label} <span>${n}</span></button>`;
  $("#chips").innerHTML =
    [
      ["Não concluídos", "A fazer"],
      ["Em andamento", "Em andamento"],
      ["Concluído", "Concluídas"],
      ["Todos", "Todas"],
    ]
      .map(([f, label]) => chip(label, count(f), filter === f, `setFilter('filter','${f}')`))
      .join("") +
    (noValue || costF === "Sem valor"
      ? chip(
          "Sem valor",
          noValue,
          costF === "Sem valor",
          `setFilter('costf','${costF === "Sem valor" ? "Todos" : "Sem valor"}')`,
          " warn",
        )
      : "");
  const more = (due !== "Todos") + (costF !== "Todos" && costF !== "Sem valor") + (sort !== "manual");
  $("#morecount").textContent = more ? ` · ${more}` : "";
  $("#sum").innerHTML =
    (cat !== "Todas" && costF === "Todos" ? safe(() => categoryCard(cat)) : "") + safe(() => summary(list));
  const groups =
    cat === "Todas"
      ? [...new Set([...categories, ...list.map((t) => t.category)])]
          .map((c) => [c, list.filter((t) => t.category === c)])
          .filter(([, a]) => a.length)
      : [[cat, list]];
  $("#rows").innerHTML =
    (list.length
      ? groups.map(([c, a]) => safe(() => taskGroup(c, a, cat === "Todas"))).join("")
      : '<div class="empty">Nenhuma pendência por aqui.</div>') +
    (hiddenDone
      ? `<p class="donenote">${hiddenDone} ${hiddenDone === 1 ? "concluída oculta" : "concluídas ocultas"} · <button type="button" class="link" onclick="setFilter('filter','Todos')">mostrar</button></p>`
      : "");
}
// Grupo de uma categoria: título com quantidade e quanto falta pagar, depois a lista
function taskGroup(c, a, head) {
  const open = sum(
      a.map((t) => {
        try {
          return isCost(t) ? outstandingBRL(t) : 0;
        } catch {
          return 0;
        }
      }),
    ),
    folder = data.folder && c === data.folder.category && data.folder.deadline,
    info = [folder ? "prazo da pasta " + fmtDate(data.folder.deadline).slice(0, 5) : "", open > 0.005 ? "falta " + money(open) : ""]
      .filter(Boolean)
      .join(" · ");
  return `<section class="tgroup">${head ? `<div class="tghead"><h3><button type="button" class="link grouplink" onclick="pickCat(${esc(JSON.stringify(c))})">${esc(c)}</button> <small>· ${a.length} ${a.length === 1 ? "item" : "itens"}</small></h3>${info ? `<small>${info}</small>` : ""}</div>` : ""}${taskTable(a, sort === "manual", true)}</section>`;
}
// Totais das pendências marcadas entre as exibidas (respeita busca e filtros)
function summary(list) {
  const picked = list.filter((t) => selected.has(t.id)),
    chosen = picked.length ? picked : list,
    s = totals(chosen),
    e = eurLaunched(chosen),
    pct = s.total > 0 ? Math.round((s.paid / s.total) * 100) : 0,
    box = (label, v, cls, extra = "") =>
      `<div class="${cls}"><small>${label}</small><b>${money(v)}</b>${extra}</div>`;
  return `<section class="sumcard"><div class="sumgrid">${box(`Custo total${cat === "Todas" ? "" : " em " + esc(cat)}`, s.total, "", e ? `<small>${money(e, "EUR")} em euro</small>` : "")}${box("Já pago", s.paid, "paid")}${box("Falta pagar", s.open, "open")}</div><div class="sumbar"><div class="bar"><span style="width:${pct}%"></span></div><small>${pct}% pago</small></div>${picked.length ? `<p class="sumnote">${picked.length} de ${list.length} somadas <button type="button" class="link" onclick="selectAll(false)">limpar</button></p>` : ""}</section>`;
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
  const d = dueStatus(t),
    urgent = d && ["late", "today", "near"].includes(d.key);
  if (!t.date)
    return urgent && inFolder(t)
      ? `${badge(d.label, d.cls)}<small class="muted">prazo da pasta</small>`
      : '<span class="muted small">—</span>';
  return `<span class="date">${fmtDay(t.date)}</span>${urgent ? badge(d.label, d.cls) : d?.key === "ok" ? '<small class="ontime">no prazo</small>' : ""}`;
}
// Etapas na linha: bolinhas, próxima etapa e "✓ Feito"; a lista completa abre logo abaixo
function stepsLine(t) {
  const steps = t.steps || [],
    open = openSteps.has(t.id),
    next = steps.find((s) => !s.done),
    d = steps.filter((s) => s.done).length;
  if (!steps.length)
    return isClosed(t) || open
      ? ""
      : `<button type="button" class="link addsteps" onclick="toggleStepsOpen('${t.id}')">+ etapas</button>`;
  const dots = steps.map((s) => `<i class="${s.done ? "on" : s === next ? "next" : ""}"></i>`).join("");
  return `<div class="stepbar${next ? "" : " alldone"}"><span class="dots" title="${d} de ${steps.length} etapas feitas">${dots}</span><span class="steptext">${next ? `<b>${esc(next.text)}</b>${next.date ? `<small>até ${fmtDay(next.date)}</small>` : ""}` : "<b>Etapas feitas ✓</b>"}</span>${next ? `<button type="button" class="stepdo" onclick="doNextStep('${t.id}')" title="Marcar “${esc(next.text)}” como feita">✓ Feito</button>` : ""}<button type="button" class="link steptoggle" aria-expanded="${open}" onclick="toggleStepsOpen('${t.id}')">${d}/${steps.length} ${open ? "▴" : "▾"}</button></div>`;
}
// Lista completa das etapas, para marcar, remover e adicionar
function stepsList(t) {
  const steps = t.steps || [];
  return `<div class="stepsopen">${steps
    .map(
      (s) =>
        `<div class="steprowi${s.done ? " done" : ""}"><label><input type="checkbox" ${s.done ? "checked" : ""} onchange="toggleStep('${t.id}','${s.id}',this.checked)"><span>${esc(s.text)}${s.date ? `<small>até ${fmtDay(s.date)}</small>` : ""}</span></label><button type="button" class="link danger" aria-label="Remover etapa ${esc(s.text)}" onclick="removeStep('${t.id}','${s.id}')">✕</button></div>`,
    )
    .join(
      "",
    )}<div class="stepadd"><input name="newStep" maxlength="160" placeholder="${steps.length ? "Nova etapa…" : "Primeira etapa, ex.: tirar cópia"}" aria-label="Nova etapa" onkeydown="if(event.key==='Enter'){event.preventDefault();addStepInline('${t.id}',this)}"><input name="newStepDate" type="date" aria-label="Prazo da etapa"><button type="button" class="btn small" onclick="addStepInline('${t.id}',this)">Adicionar</button><button type="button" class="link steptoggle" onclick="toggleStepsOpen('${t.id}')">${steps.length ? "fechar" : "cancelar"}</button></div></div>`;
}
const isClosed = (t) => t.status === "Concluído";
// Situação do pagamento, em texto curto abaixo do valor
function payCell(t) {
  if (!isCost(t)) return "";
  const ps = payStatus(t),
    parts = [];
  t.credits.forEach((c) => {
    const p = c.installments.filter((i) => i.payment).length;
    if (p < c.installments.length) parts.push(`${p} de ${c.installments.length} parcelas`);
  });
  if (ps.label === "Parcialmente pago") parts.unshift(`pago ${money(paidBRL(t))}`);
  if (!parts.length && ps.label !== "Valor a definir") parts.push(ps.label.toLowerCase());
  return parts.length ? `<small class="paystate ${ps.cls}">${parts.join(" · ")}</small>` : "";
}
// Valor na moeda em que foi lançado, com o tipo (estimado/confirmado) em texto pequeno
function valueCell(t) {
  if (!isCost(t)) return '<span class="muted small">Sem custo</span>';
  const f = forecast(t);
  if (!(f.known > 0)) return `<button type="button" class="link novalue" onclick="editTask('${t.id}')">Sem valor</button>`;
  const kind = t.valueType === "estimado" ? "estimado" : t.valueType === "confirmado" ? "confirmado" : "";
  return `<b class="amount-sm">${money(f.known, t.currency)}</b>${f.unknown ? "<small>+ a definir</small>" : ""}${kind || t.valueNote ? `<small class="vtag2">${kind}${t.valueNote ? tip(t.valueNote) : ""}</small>` : ""}`;
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
  return `<table class="tlist${selected.size ? " has-sel" : ""}"><tbody>${a
    .map((t) => {
      try {
        const open = openSteps.has(t.id);
        return `<tr data-id="${t.id}" class="${statusRow(t.status)}${sel && selected.has(t.id) ? " picked" : ""}${open ? " has-sub" : ""}"><td class="c-task"><div class="taskcell">${sel ? `<input class="sel" type="checkbox" aria-label="Selecionar ${esc(t.title)} para somar" ${selected.has(t.id) ? "checked" : ""} onchange="toggleSelect('${t.id}')">` : ""}${manual ? '<span class="draghandle" tabindex="0" role="button" aria-label="Arrastar pendência" title="Segure e arraste para reordenar">⠿</span>' : ""}<span class="tinfo"><button type="button" class="link title" onclick="editTask('${t.id}')">${esc(t.title)}</button>${t.notes ? `<small class="tnotes">${esc(t.notes)}</small>` : ""}${stepsLine(t)}${qtyProgress(t)}</span></div></td><td class="c-status"><select class="statussel ${statusCls(t.status) || "pend"}" aria-label="Andamento de ${esc(t.title)}" onchange="setStatus('${t.id}', this.value)">${STATUSES.map((s) => `<option ${s === t.status ? "selected" : ""}>${s}</option>`).join("")}</select></td><td class="c-due${t.date || ["late", "today", "near"].includes(dueStatus(t)?.key) ? "" : " nodue"}"><div class="stack">${dueCell(t)}</div></td><td class="c-money"><div class="c-val">${valueCell(t)}</div><div class="c-pay">${payCell(t)}</div></td><td class="c-act"><details class="rowmenu"><summary aria-label="Mais ações de ${esc(t.title)}" title="Mais ações">⋯</summary><div class="menu"><button type="button" data-act="edit" onclick="this.closest('details').open=false;editTask('${t.id}')">${icon("edit")}<span>Editar</span></button>${isCost(t) ? `<button type="button" data-act="pay" onclick="this.closest('details').open=false;openTask('${t.id}')">${icon("card")}<span>Pagamento</span></button>` : ""}<button type="button" onclick="this.closest('details').open=false;showSteps('${t.id}')">${icon("check")}<span>${(t.steps || []).length ? "Ver etapas" : "Adicionar etapas"}</span></button><button type="button" class="danger" onclick="this.closest('details').open=false;deleteTask('${t.id}')">${icon("trash")}<span>Excluir pendência</span></button></div></details></td></tr>${open ? `<tr class="subrow ${statusRow(t.status)}" data-for="${t.id}"><td colspan="5">${stepsList(t)}</td></tr>` : ""}`;
      } catch (err) {
        return badRow(t, err);
      }
    })
    .join("")}</tbody></table>`;
}
// Linha de aviso quando uma pendência não pode ser exibida (o resto da lista continua aparecendo)
function badRow(t, err) {
  console.error(err);
  return `<tr data-id="${esc(t?.id)}"><td colspan="5"><div class="alert late">${icon("alert")}<span>Não consegui mostrar “${esc(t?.title || "sem nome")}”. <small>${esc(err?.message)}</small></span><button type="button" class="link" onclick="editTask('${esc(t?.id)}')">Editar</button></div></td></tr>`;
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
  return `<section class="panel"><div class="paneltop"><h3>Fontes de dinheiro ${tip("Saldo atual = recebido − utilizado. Reservado = separado para despesas futuras.")}</h3><div class="panelactions"><button class="btn" onclick="manageSources()">Fontes</button><button class="btn primary" onclick="editIncome()">+ Nova entrada</button></div></div><div class="tablewrap"><table class="cardtable"><thead><tr><th>Fonte</th><th>Recebido</th><th>Utilizado</th><th>Saldo atual</th><th>Reservado</th><th>Saldo livre</th><th></th></tr></thead><tbody>${rows
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
  return `<section class="panel"><div class="paneltop"><div class="titleicon"><span class="iconcircle small">${icon("card")}</span><h3>Cartões e faturas ${tip("O saldo da fonte só diminui quando a parcela ou a fatura é paga.")}</h3></div><button class="btn" onclick="manageAccounts()">Cartões e contas</button></div>${
    bills.length
      ? `${bills
          .map(
            (b) =>
              `<div class="statrow"><span><b>${esc(accountName(b.accountId) || "Cartão")}</b> · fatura de ${monthName(b.month)}<br><small>vence ${fmtDate(b.due)} · ${b.items.map(({ t, c, i }) => `${esc(t.title)} ${i.n}/${c.installments.length}`).join(", ")}</small></span><span class="nowrap"><b>${money(b.total)}</b> <button class="btn small" onclick="payBill('${b.accountId}','${b.month}')">Pagar fatura</button></span></div>`,
          )
          .join("")}`
      : `<p class="sub">${data.accounts.length ? "Nenhuma fatura em aberto." : "Nenhum cartão cadastrado."}</p>`
  }</section>`;
}
function incomeTable() {
  return `<section class="panel"><div class="paneltop"><h3>Entradas</h3><button class="btn primary" onclick="editIncome()">+ Nova entrada</button></div>${
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
