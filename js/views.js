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
// Título da Visão geral: a data de hoje, por extenso
const todayTitle = () => {
  const d = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return d.replace("-feira", "").replace(/^./, (c) => c.toUpperCase());
};
// Dica ⓘ: explicação que só aparece ao passar o mouse ou tocar
const tip = (text) =>
  `<button type="button" class="tip" aria-label="Ajuda: ${esc(text)}" aria-expanded="false">ⓘ<span class="tiptext" aria-hidden="true">${esc(text)}</span></button>`;
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
    n ? `<button type="button" class="link flag" onclick="showUnknown()">Falta o valor de ${n} →</button>` : "";
const statusCls = (s) => (s === "Concluído" ? "done" : s === "Em andamento" ? "prog" : ""),
  statusRow = (s) => (s === "Concluído" ? "st-done" : s === "Em andamento" ? "st-prog" : "");

// Custos pagos com o salário (não saem da reserva): total, já pago e o que falta
// Abre as pendências de uma fonte (pagas e a pagar), a partir dos cartões da visão geral
function goSource(v) {
  page = "tasks";
  cat = "Todas";
  filter = "Todos";
  costF = "Todos";
  search = "";
  srcF = v;
  render();
  scrollTo(0, 0);
}
function salaryCard() {
  const c = salaryInfo(),
    pct = c.total > 0 ? Math.round((c.paid / c.total) * 100) : 0;
  return `<section class="panel salary"><small class="eyebrow">Custos pagos com o salário</small><div class="salnums"><div><small>Total</small><b>${money(c.total)}</b></div><div class="paid"><small>Já pago</small><b>${money(c.paid)}</b></div><div class="open"><small>Falta pagar</small><b>${money(c.open)}</b></div></div><div class="bar"><span style="width:${pct}%"></span></div><div class="salfoot cardfoot"><small>${pct}% pago · não sai da reserva do Santander</small>${c.none > 0.005 ? `<small class="nosrc">${money(c.none)} ainda sem fonte · <button type="button" class="link" onclick="sourceLinks('')">Escolher fonte</button></small>` : ""}<button type="button" class="link" data-go="Salário" onclick="goSource('Salário')">Ver o que é pago com o salário →</button></div></section>`;
}

// Reserva do Santander apresentada ao consulado: quanto tem, quanto vai sair, quanto fica e o aviso da meta
const NEAR_GOAL = 0.05; // até 5% acima da meta: "quase no limite"
function consulState(c = consulInfo()) {
  const low = Math.min(c.current, c.after);
  if (low < c.goal - 0.005)
    return {
      cls: "late",
      icon: "alert",
      title: "Abaixo da meta",
      text: `Faltam ${money(c.goal - low)} para os ${money(c.goal)}.`,
    };
  if (low < c.goal * (1 + NEAR_GOAL))
    return {
      cls: "warn",
      icon: "alert",
      title: "Quase no limite, cuidado",
      text: `Só ${money(low - c.goal)} acima da meta.`,
    };
  return { cls: "done", icon: "check", title: "Acima da meta", text: `Sobram ${money(low - c.goal)} de folga.` };
}
function consulCard() {
  const c = consulInfo(),
    st = consulState(c),
    scale = Math.max(c.current, c.goal) * 1.08 || 1,
    w = (v) => Math.max(0, Math.min(100, (v / scale) * 100)).toFixed(2) + "%";
  return `<section class="panel consul ${st.cls}"><small class="eyebrow">Reserva do consulado · Santander</small><div class="consulnums"><div><small>Tenho no Santander</small><b>${money(c.current)}</b></div><span class="op" aria-hidden="true">−</span><div class="out"><small>Vai sair</small><b>${money(c.reserved)}</b></div><span class="op" aria-hidden="true">=</span><div class="left"><small>Vai ficar</small><b>${money(c.after)}</b></div><div class="consulstatus ${st.cls}" role="status">${icon(st.icon)}<span><b>${st.title}</b><small>${st.text}</small></span></div></div><div class="goalbar" aria-hidden="true"><span class="keep" style="width:${w(Math.max(0, c.after))}"></span><span class="leave" style="width:${w(Math.min(c.reserved, c.current))}"></span><i class="mark" style="left:${w(c.goal)}"></i></div><div class="cardfoot"><small class="goalnote">Meta mínima <b>${money(c.goal)}</b> · o consulado pede cerca de R$ 100 mil; a meta já inclui a folga</small><button type="button" class="link" data-go="Reserva" onclick="goSource('Reserva')">Ver o que sai do Santander →</button></div></section>`;
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
  return `<section class="panel folder ${f.tone}"><div class="folderhead"><span class="iconcircle">${icon("file")}</span><div class="grow"><h3>Pasta do ${esc(f.category)}</h3><small>${f.done} de ${f.items.length} concluídos</small><div class="barrow"><div class="bar"><span style="width:${pct}%"></span></div><b>${pct}%</b></div></div><div class="deadline">${icon("calendar")}<span><small>Entrega à consultoria</small><b>${f.deadline ? fmtDate(f.deadline) : "—"}</b><small>${days}</small></span></div></div><div class="alert ${tone}">${icon(f.tone === "done" ? "check" : f.tone ? "alert" : "info")}<span>${esc(f.message)}</span></div>${
    open.length && page !== "tasks" && page !== "overview"
      ? `<div class="checklist">${open
          .slice(0, expanded.has(f.category) ? open.length : 6)
          .map(
            (t) =>
              `<div class="checkrow"><button type="button" class="donebtn" aria-label="Concluir ${esc(t.title)}" title="Marcar como concluída" onclick="toggle('${t.id}',true)">${icon("check")}</button><button type="button" class="link" onclick="editTask('${t.id}')">${esc(t.title)}</button>${dueStatus(t)?.key === "late" ? badge("Atrasado", "late") : ""}<span class="date">${icon("calendar")} ${fmtDate(dueDate(t)) || "sem prazo"}</span></div>`,
          )
          .join("")}${moreButton(f.category, open.length, 6)}</div>`
      : ""
  }<div class="folderactions">${doneLink(f.done)}<button class="link" onclick="editFolder()">Configurar pasta</button></div></section>`;
}
// Ao filtrar uma categoria, mostra um card de "pasta" com o progresso e o que falta
const doneLink = (done) =>
  page === "tasks" && done
    ? `<button type="button" class="link" onclick="setFilter('filter','${filter === "Concluído" ? "Não concluídos" : "Concluído"}')">${filter === "Concluído" ? "Voltar às não concluídas" : `Ver ${done} ${done === 1 ? "concluída" : "concluídas"}`}</button>`
    : "";
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
      ? `<button type="button" class="link" onclick="toggleExpand(${jsArg(c)})">${expanded.has(c) ? "Mostrar menos" : `+ ${n - limit} ${n - limit === 1 ? "item" : "itens"} · ver todos`}</button>`
      : "";
function toggleExpand(c) {
  expanded.has(c) ? expanded.delete(c) : expanded.add(c);
  render();
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
      ["fontes", "De onde vem"],
      ["entradas", "Entradas"],
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
  if (page === "overview") {
    $("#app").innerHTML =
      `<header class="pagehead"><div><h1>${todayTitle()}</h1></div></header>${safe(consulCard)}${safe(salaryCard)}${data.tasks.length ? "" : `<button class="btn primary" onclick="editTask()">+ Criar pendência</button>`}`;
  }
  if (page === "tasks") {
    $("#app").innerHTML =
      `${subnav("tasks")}<div class="tpage"><div class="tphead"><div><h1>Pendências e custos</h1></div><div class="panelactions"><button class="btn" onclick="manageCategories()">Categorias</button><button class="btn primary big" onclick="editTask()">+ Nova pendência</button></div></div><div id="sum"></div><div class="tools2"><label class="searchbox">${icon("search")}<input id="search" type="search" aria-label="Buscar pendência" placeholder="Buscar pendência ou etapa" value="${esc(search)}"></label><details class="morefilters"><summary>Filtros<span id="morecount"></span></summary><div class="menu">${["costf"].map((k) => `<label>${FILTERS[k].label}${filterSelect(k)}</label>`).join("")}</div></details><div id="chips" class="chips"></div></div><div id="rows"></div></div>`;
    updateRows();
    $("#search").oninput = (e) => {
      search = e.target.value;
      selected.clear();
      updateRows();
    };
  }
  if (page === "income") {
    const titles = { fontes: "De onde vem o dinheiro", entradas: "Entradas" },
      title = titles[incomePart] || titles.fontes;
    $("#app").innerHTML =
      subnav("income") +
      `<header class="pagehead compact"><div><h1>${title}</h1></div></header>` +
      (incomePart === "entradas" ? incomeTable() : sourcesPanel());
  }
  if (page === "settings")
    $("#app").innerHTML =
      `<header class="pagehead compact"><div><h1>Ajustes</h1></div></header><div class="grid"><section class="panel"><h3>Cotação do euro</h3><label>1 euro = R$ <b>${fmtRate(data.rate)}</b></label><p class="notice">${rateInfo()}</p></section><section class="panel"><h3>Meta do consulado</h3><label>Valor que deve ficar na reserva do Santander<input type="number" min="1" step="1000" value="${data.consulGoal}" onchange="setGoal(this.value)"></label><p class="sub">Abaixo disso, a visão geral avisa.</p></section><section class="panel"><h3 style="margin-bottom:20px">Backup</h3><button class="btn primary" onclick="backup()">↓ Exportar backup</button> <button class="btn" onclick="$('#import').click()">↑ Importar backup</button><input hidden id="import" type="file" accept="application/json" onchange="restore(this)"></section><section class="panel"><h3>Cartões e contas</h3><button class="btn" onclick="manageAccounts()">Gerenciar cartões e contas</button></section><section class="panel"><h3>Conta</h3><p class="muted">${esc(window.currentEmail)}</p><button class="btn" onclick="if(confirm('Sair desta conta?'))logout()">Sair</button></section></div>`;
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
      ["Não concluídos", "Não concluídas"],
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
      ["Sem valor", "Falta o valor"],
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
// Filtro por fonte: salário ou reserva do consulado (Santander)
let srcF = "Todas";
FILTERS.src = {
  label: "Fonte",
  opts: () => [
    ["Todas", "Todas"],
    ["Salário", "Salário"],
    ["Reserva", "Santander Consulado"],
  ],
  get: () => srcF,
  set: (v) => (srcF = v),
};
const matchSrc = (t) => {
  if (srcF === "Todas") return true;
  try {
    return (srcF === "Reserva" ? ["res", "mix"] : ["sal", "mix"]).includes(bucket(t));
  } catch {
    return false;
  }
};
const filterSelect = (k, cls = "") =>
  `<select data-f="${k}" class="${cls}" aria-label="${FILTERS[k].label}" onchange="setFilter('${k}',this.value)">${selectOpts(FILTERS[k].opts(), FILTERS[k].get())}</select>`;
// Ao trocar um filtro, a seleção começa de novo
function setFilter(k, v) {
  FILTERS[k].set(v);
  selected.clear();
  k === "sort" || k === "cat" ? render() : updateRows();
}
function updateRows() {
  const text = (t) =>
      (cat === "Todas" || t.category === cat) &&
      matchDue(t) &&
      (t.title + " " + t.notes + " " + (t.steps || []).map((s) => s.text).join(" "))
        .toLowerCase()
        .includes(search.toLowerCase()),
    base = (t) => text(t) && matchCost(t) && matchSrc(t),
    byStatus = (t, f = filter) =>
      f === "Todos" || (f === "Não concluídos" ? t.status !== "Concluído" : t.status === f),
    hiddenDone =
      filter === "Não concluídos" ? data.tasks.filter((t) => base(t) && t.status === "Concluído").length : 0;
  const scope = data.tasks.filter(base);
  let list = scope.filter((t) => byStatus(t));
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
    toPay = data.tasks.filter((t) => {
      try {
        return text(t) && isCost(t) && outstandingBRL(t) > 0.005;
      } catch {
        return false;
      }
    }).length,
    chip = (label, n, on, fn, cls = "") =>
      `<button type="button" class="chip${on ? " on" : ""}${cls}" aria-pressed="${on}" onclick="${fn}">${label} <span>${n}</span></button>`;
  const costLabel = Object.fromEntries(FILTERS.costf.opts())[costF];
  $("#chips").innerHTML =
    [
      ["Não concluídos", "Não concluídas"],
      ["Pendente", "Pendentes"],
      ["Em andamento", "Em andamento"],
      ["Concluído", "Concluídas"],
      ["Todos", "Todas"],
    ]
      .map(([f, label]) => chip(label, count(f), filter === f, `setFilter('filter','${f}')`))
      .join("") +
    '<span class="chipsep" aria-hidden="true"></span>' +
    [
      ["Salário", "Salário", " src-sal"],
      ["Reserva", "Santander Consulado", " src-res"],
    ]
      .map(
        ([v, label, cls]) =>
          `<button type="button" class="chip${srcF === v ? " on" : ""}${cls}" aria-pressed="${srcF === v}" onclick="setFilter('src','${srcF === v ? "Todas" : v}')"><i class="dot"></i>${label}</button>`,
      )
      .join("") +
    (costF !== "Todos"
      ? `<button type="button" class="chip on warn" aria-label="Tirar o filtro ${esc(costLabel)}" onclick="setFilter('costf','Todos')">${esc(costLabel)} ✕</button>`
      : "");
  const more = (costF !== "Todos") + (sort !== "manual");
  $("#morecount").textContent = more ? ` · ${more}` : "";
  $("#sum").innerHTML =
    (cat !== "Todas" && costF === "Todos" ? safe(() => categoryCard(cat)) : "") + safe(() => summary(scope, list));
  const groups =
    cat === "Todas"
      ? [...new Set([...categories, ...list.map((t) => t.category)])]
          .map((c) => [c, list.filter((t) => t.category === c)])
          .filter(([, a]) => a.length)
      : [[cat, list]];
  $("#rows").innerHTML =
    (list.length
      ? '<div class="plisthead" aria-hidden="true"><span>Pendência</span><span>Fonte</span><span>Valor</span><span>Próximo passo</span></div>' +
        groups.map(([c, a], i) => safe(() => taskGroup(c, a, cat === "Todas", scope, i + 1))).join("")
      : '<div class="empty">Nenhuma pendência por aqui.</div>') +
    (hiddenDone
      ? `<p class="donenote">${hiddenDone} ${hiddenDone === 1 ? "concluída oculta" : "concluídas ocultas"} · <button type="button" class="link" onclick="setFilter('filter','Todos')">mostrar</button></p>`
      : "");
}
// Grupo de uma categoria: título com quantidade e quanto falta pagar, depois a lista
// Os valores da categoria contam também as concluídas, mesmo que estejam ocultas na lista
function taskGroup(c, a, head, scope = a, n = 1) {
  let s = { paid: 0, open: 0, total: 0 };
  const all = scope.filter((t) => t.category === c),
    done = all.filter((t) => t.status === "Concluído").length;
  try {
    s = totals(all);
  } catch {}
  return `<section class="tgroup">${head ? `<div class="tghead"><div><small class="eyebrow">Categoria ${String(n).padStart(2, "0")}</small><h3><button type="button" class="link grouplink" onclick="pickCat(${jsArg(c)})">${esc(c)}</button></h3></div><small>${done} de ${all.length} concluídas${s.open > 0.005 ? ` · <b class="owe">falta ${money(s.open)}</b>` : ""}</small></div>` : ""}${taskTable(a)}</section>`;
}
// Totais: as marcadas para somar ou, sem marcação, tudo da categoria/busca (inclusive as concluídas)
function summary(scope) {
  const s = totals(scope),
    b = openByBucket(scope.filter(isCost)),
    done = scope.filter((t) => t.status === "Concluído").length,
    pct = scope.length ? Math.round((done / scope.length) * 100) : 0,
    box = (cls, label, v, extra = "") => `<div class="${cls}"><small>${label}</small><b>${money(v)}</b>${extra}</div>`;
  return `<section class="sumcard"><div class="sumgrid">${box("open", "Falta pagar", s.open, `<small>de ${money(s.total)}${b.none > 0.005 ? ` · ${money(b.none)} sem fonte` : ""}</small>`)}${box("sal", '<i class="dot"></i>Do salário', b.sal)}${box("res", '<i class="dot"></i>Da reserva Santander', b.res)}</div><div class="sumbar"><div class="bar"><span style="width:${pct}%"></span></div><small>${done} de ${scope.length} concluídas</small></div></section>`;
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
function originText(t) {
  if (!t.alloc.length) return "Fonte não definida";
  return t.alloc
    .map((a) => sourceName(a.sourceId) + (a.brl !== null && a.brl !== "" ? ` (${money(num(a.brl))})` : ""))
    .join(" + ");
}
// Atalho na linha: tocar na fonte troca de onde o dinheiro vai sair (enquanto nada foi pago)
function srcPick(t) {
  if (!isCost(t)) return "";
  if (outflows(t).length || committedBRL(t) > 0.005) return srcPill(t);
  const cur = t.alloc.length === 1 ? t.alloc[0].sourceId : "",
    salary = data.sources.find((s) => s.flow),
    consul = data.sources.find((s) => s.consulate),
    item = (s, cls) =>
      `<button type="button" data-src="${s.id}" class="${cls}${s.id === cur ? " on" : ""}" onclick="this.closest('details').open=false;setPlanned('${t.id}','${s.id}')"><i class="dot"></i><span>${esc(s.name)}</span></button>`;
  return `<details class="srcmenu"><summary aria-label="Trocar a fonte de ${esc(t.title)}" title="Trocar de onde sai o dinheiro">${srcPill(t) || '<span class="srcpill none"><i class="dot"></i>Escolher fonte</span>'}</summary><div class="menu"><small>Vai sair de:</small>${salary ? item(salary, "sal") : ""}${consul ? item(consul, "res") : ""}<button type="button" data-src="other" onclick="this.closest('details').open=false;editTask('${t.id}')"><i class="dot"></i><span>Outra…</span></button></div></details>`;
}
function setPlanned(id, sourceId) {
  const t = data.tasks.find((x) => x.id === id);
  if (!t) return;
  t.alloc = [{ sourceId, brl: null }];
  save();
  updateRows();
  toast(`Vai sair de ${sourceName(sourceId)}`);
}
// Etiqueta da fonte de pagamento da pendência
function srcPill(t) {
  const k = bucket(t);
  if (!k) return "";
  const label = k === "mix" ? "Salário + Santander" : k === "res" ? "Santander Consulado" : taskSources(t).map(sourceName).join(" + ");
  return `<span class="srcpill ${k}"><i class="dot"></i>${esc(label)}</span>`;
}
// Próximo passo da pendência, com "✓ Feito" para avançar sem abrir nada
function nextStepLine(t) {
  const steps = t.steps || [],
    next = steps.find((s) => !s.done),
    d = steps.filter((s) => s.done).length;
  if (!steps.length) return "";
  return `<div class="nextstep${next ? "" : " alldone"}"><span><small>${next ? "Próximo passo" : "Etapas"} · ${d}/${steps.length}</small><b>${next ? esc(next.text) : "Todas feitas ✓"}</b></span>${next ? `<button type="button" class="stepdo" onclick="doNextStep('${t.id}')" title="Marcar “${esc(next.text)}” como feita">✓ Feito</button>` : ""}</div>`;
}
// Linha cinza abaixo do nome: andamento, compras e observação
function taskNote(t) {
  const parts = [
      t.status === "Em andamento" ? "Em andamento" : "",
      isCost(t) && t.multi ? `${fmtQty(bought(t))} de ${fmtQty(t.qty)} ${esc(t.unit || "un.")}` : "",
      esc(t.notes),
    ].filter(Boolean);
  return parts.length ? `<small class="tnotes">${parts.join(" · ")}</small>` : "";
}
// Valor e, só quando ajuda, o estado do pagamento em texto pequeno
function moneyCell(t) {
  if (!isCost(t)) return "";
  const f = forecast(t);
  if (!(f.known > 0))
    return `<div class="c-val"><button type="button" class="link novalue" onclick="editTask('${t.id}')">Falta o valor</button></div>`;
  const ps = payStatus(t),
    parts = [];
  t.credits.forEach((c) => {
    const p = c.installments.filter((i) => i.payment).length;
    if (p < c.installments.length) parts.push(`${p} de ${c.installments.length} parcelas`);
  });
  if (ps.label === "Parcialmente pago") parts.unshift(`pago ${money(paidBRL(t))}`);
  if (!parts.length && ps.label === "Pago") parts.push("pago");
  return `<div class="c-val"><b class="amount-sm">${money(f.known, t.currency)}</b></div>${parts.length ? `<div class="c-pay"><small class="paystate ${ps.cls}">${parts.join(" · ")}</small></div>` : ""}`;
}
function taskTable(a) {
  if (!a.length) return '<div class="empty">Nenhuma pendência por aqui.</div>';
  return `<table class="plist"><tbody>${a
    .map((t) => {
      try {
        const open = openSteps.has(t.id),
          done = isClosed(t),
          owes = isCost(t) && !forecast(t).unknown && uncoveredCur(t) > 0.005,
          item = (act, ic, label, fn, cls = "") =>
            `<button type="button" data-act="${act}"${cls ? ` class="${cls}"` : ""} onclick="this.closest('details').open=false;${fn}">${icon(ic)}<span>${label}</span></button>`;
        return `<tr data-id="${t.id}" class="${statusRow(t.status)}${open ? " has-sub" : ""}"><td class="c-check"><button type="button" class="donebtn${done ? " on" : ""}" aria-label="${done ? "Reabrir" : "Concluir"} ${esc(t.title)}" title="${done ? "Reabrir" : "Concluir"}" onclick="toggle('${t.id}',${!done})">${icon("check")}</button></td><td class="c-task"><button type="button" class="link title" onclick="editTask('${t.id}')">${esc(t.title)}</button>${taskNote(t)}</td><td class="c-src">${srcPick(t)}</td><td class="c-money">${moneyCell(t)}</td><td class="c-step">${nextStepLine(t)}</td><td class="c-act"><details class="rowmenu"><summary aria-label="Mais ações de ${esc(t.title)}" title="Mais ações">⋯</summary><div class="menu">${owes ? item("pay", "wallet", "Marcar pago", `quickPay('${t.id}')`) : ""}${item("edit", "edit", "Editar", `editTask('${t.id}')`)}${done ? "" : item("prog", "chart", t.status === "Em andamento" ? "Voltar para pendente" : "Marcar em andamento", `setStatus('${t.id}','${t.status === "Em andamento" ? "Pendente" : "Em andamento"}')`)}${item("steps", "check", (t.steps || []).length ? "Etapas" : "Adicionar etapas", `toggleStepsOpen('${t.id}')`)}${isCost(t) ? item("detail", "card", "Pagamentos", `openTask('${t.id}')`) : ""}${item("delete", "trash", "Excluir pendência", `deleteTask('${t.id}')`, "danger")}</div></details></td></tr>${open ? `<tr class="subrow" data-for="${t.id}"><td colspan="6">${stepsList(t)}</td></tr>` : ""}`;
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
  return `<section class="panel"><div class="paneltop"><div><h3>Fontes</h3><p class="sub">Saldo livre = recebido − usado − reservado para pendências.</p></div><div class="panelactions"><button class="btn" onclick="manageSources()">Editar fontes</button><button class="btn primary" onclick="editIncome()">+ Entrada</button></div></div><div class="tablewrap"><table class="cardtable sources"><thead><tr><th>Fonte</th><th>Recebido</th><th>Utilizado</th><th>Saldo atual</th><th>Reservado</th><th>Saldo livre</th><th></th></tr></thead><tbody>${rows
    .map(([id, name]) => {
      const s = st[id];
      if (s.flow)
        return `<tr class="flowrow"><td data-label="Fonte"><div><b>${esc(name)}</b><br><small>sem saldo · só indica o que é pago com o salário</small></div></td><td data-label="Recebido"><div class="muted">—</div></td><td data-label="Pago com ele"><div>${money(s.used)}</div></td><td data-label="Saldo atual"><div class="muted">—</div></td><td data-label="A pagar com ele"><div>${money(s.reserved)}</div></td><td data-label="Saldo livre"><div class="muted">—</div></td><td class="rowactions"><button class="link" onclick="sourceLinks('${id}')">Ver detalhes</button></td></tr>`;
      const noBalance = !id && !s.received && !s.expected,
        bal = (v) => (noBalance ? "—" : `<b>${money(v)}</b>`);
      return `<tr><td data-label="Fonte"><div><b>${esc(name)}</b>${s.expected ? `<br><small>+ ${money(s.expected)} previsto</small>` : ""}</div></td><td data-label="Recebido"><div>${money(s.received)}</div></td><td data-label="Utilizado"><div>${money(s.used)}</div></td><td data-label="Saldo atual"${noBalance ? "" : neg(s.current)}><div>${bal(s.current)}</div></td><td data-label="${id ? "Reservado" : "A pagar sem fonte"}"><div>${money(s.reserved)}</div></td><td data-label="Saldo livre"${noBalance ? "" : neg(s.free)}><div>${bal(s.free)}${!noBalance && s.free < -0.005 ? "<br><small>⚠ reservas acima do saldo</small>" : ""}</div></td><td class="rowactions"><button class="link" onclick="sourceLinks('${id}')">Ver detalhes</button></td></tr>`;
    })
    .join("")}</tbody></table></div></section>`;
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

function setGoal(v) {
  if (!(Number(v) > 0)) return toast("Informe um valor maior que zero.");
  data.consulGoal = Number(v);
  save();
  toast("Meta salva");
}
