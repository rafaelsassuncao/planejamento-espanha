// Renderização das páginas, listas e resumos
const badge = (label, cls = "") => `<span class="badge ${cls}">${esc(label)}</span>`,
  eurLine = (v) => `<small class="eur">≈ ${eur(v)}</small>`,
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
      ? `<span class="flag">Previsão incompleta: ${n} ${n === 1 ? "item" : "itens"} com custo a definir</span>`
      : "";
const statusCls = (s) => (s === "Concluído" ? "done" : s === "Em andamento" ? "prog" : "");
function rateNote() {
  const when = data.rateAt
    ? new Date(data.rateAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "referência inicial";
  return `Valores em euro (≈) são estimativas pela cotação de ${when}: 1 € = R$ ${fmtRate(data.rate)}.`;
}

function cards() {
  const o = overall(),
    card = (icon, label, v, sub) =>
      `<div class="card"><label>${icon} &nbsp; ${label}</label><div class="amount">${money(v)}</div>${eurLine(v)}<span class="sub">${sub}</span></div>`;
  return `<div class="cards">${card("↗", "Recursos recebidos", o.received, `Saldo atual ${money(o.current)} (recebido − pago)${o.expected ? `<br>Entradas futuras: ${money(o.expected)}` : ""}`)}${card("▤", "Custo total previsto", o.total, `Pago ${money(o.paid)} + a pagar ${money(o.open)}<br>${incomplete(o.unknown)}`)}${card("◌", "Saldo previsto", o.projected, "Saldo atual menos o que ainda falta pagar")}</div><p class="sub ratenote">${rateNote()}</p>`;
}

function financePanel() {
  const o = overall(),
    row = (label, v, hint = "") =>
      `<div class="statrow"><span>${label}${hint ? `<br><small>${hint}</small>` : ""}</span><span class="right"><b>${money(v)}</b><br>${eurLine(v)}</span></div>`;
  return `<section class="panel"><div class="paneltop"><h3>Resumo financeiro</h3><button class="link" onclick="go('income')">Ver por fonte →</button></div>${row("Total recebido", o.received)}${row("Já pago", o.paid, "Valores reais desembolsados")}${row("Saldo atual", o.current, "Recebido − pagamentos realizados")}${row("Ainda a pagar", o.open, o.unknown ? `+ ${o.unknown} ${o.unknown === 1 ? "item" : "itens"} com custo a definir` : "")}${row("Saldo previsto", o.projected, "Após quitar os custos restantes")}${o.expected ? row("Entradas futuras", o.expected, "Previstas, ainda não recebidas: não entram no saldo") : ""}</section>`;
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
    open = f.items.filter((t) => t.status !== "Concluído");
  return `<section class="panel folder ${f.tone}"><div class="paneltop"><h3>Pasta do ${esc(f.category)}</h3><span class="badge ${f.tone}">${f.done} de ${f.items.length} concluídos</span></div><div class="bar"><span style="width:${pct}%"></span></div><p class="foldermsg">${esc(f.message)}</p><div class="statrow"><span>Entrega à consultoria</span><b>${f.deadline ? fmtDate(f.deadline) : "—"}</b></div><div class="statrow"><span>${days}</span><b>${f.pending} ${f.pending === 1 ? "falta" : "faltam"}</b></div>${
    open.length
      ? `<div class="pendlist">${open
          .slice(0, 6)
          .map(
            (t) =>
              `<button type="button" class="link" onclick="openTask('${t.id}')">○ ${esc(t.title)}${dueStatus(t)?.key === "late" ? " " + badge("Atrasado", "late") : ""}</button>`,
          )
          .join("")}${open.length > 6 ? `<small>+ ${open.length - 6} itens</small>` : ""}</div>`
      : ""
  }<div class="folderactions"><button class="btn" onclick="showFolderItems()">Ver itens pendentes</button><button class="link" onclick="editFolder()">Configurar pasta</button></div><p class="sub">O progresso considera apenas o seu checklist. Não representa validação oficial dos documentos nem aprovação do visto.</p></section>`;
}
function showFolderItems() {
  page = "tasks";
  cat = data.folder.category;
  filter = "Não concluídos";
  due = "Todos";
  search = "";
  if ($("#modal").open) $("#modal").close();
  render();
}

function render() {
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  const done = data.tasks.filter((t) => t.status === "Concluído").length,
    pct = data.tasks.length ? Math.round((done / data.tasks.length) * 100) : 0;
  if (page === "overview") {
    const next = data.tasks
      .filter((t) => t.status !== "Concluído")
      .sort(byDue)
      .slice(0, 5);
    $("#app").innerHTML =
      `<div class="hero"><div><span class="tag">NOSSA MUDANÇA • VISTO DE ESTUDANTE</span><h2>Uma nova vida. Um passo de cada vez.</h2><p>3 adultos, 1 bebê e 2 gatas rumo à Espanha.</p></div><div class="landmark" aria-hidden="true">☀︎ ⌂</div></div>${cards()}<div class="grid"><section class="panel"><div class="paneltop"><h3>Como está o planejamento?</h3><span class="badge done">${pct}% concluído</span></div><div class="bar"><span style="width:${pct}%"></span></div><p class="muted">${done} de ${data.tasks.length} pendências resolvidas. Cada detalhe conta.</p><button class="link" onclick="go('tasks')">Ver todas as pendências →</button></section><section class="panel"><div class="paneltop"><h3>Câmbio do planejamento</h3><span>€ → R$</span></div><p class="muted">Cotação automática para os custos em euros.</p><label>1 euro = R$ <b>${fmtRate(data.rate)}</b></label><p class="sub">${rateInfo()}</p></section></div><div class="grid even">${financePanel()}${folderCard()}</div><section class="panel"><div class="paneltop"><h3>Próximos passos</h3><button class="btn primary" onclick="editTask()">+ Nova pendência</button></div>${taskTable(next, false)}</section>`;
  }
  if (page === "tasks") {
    $("#app").innerHTML =
      `<section class="panel"><div class="paneltop"><h3>Seu checklist da mudança</h3><button class="btn" onclick="manageCategories()">Categorias</button><button class="btn primary" onclick="editTask()">+ Nova pendência</button></div><div class="tools"><input id="search" aria-label="Buscar pendência" placeholder="Buscar uma pendência…" value="${esc(search)}"><select id="filter" aria-label="Filtrar por situação">${selectOpts(
        [
          ["Todos", "Todas as situações"],
          ["Não concluídos", "Não concluídos"],
          ...STATUSES.map((s) => [s, s]),
        ],
        filter,
      )}</select><select id="cat" aria-label="Filtrar categoria">${selectOpts(
        [["Todas", "Todas as categorias"], ...categories.map((c) => [c, c])],
        cat,
      )}</select><select id="due" aria-label="Filtrar por prazo">${selectOpts(
        [
          ["Todos", "Todos os prazos"],
          ["Atrasados", "Atrasados"],
          ["Próximos", `Vencem em até ${NEAR_DAYS} dias`],
          ["Sem prazo", "Sem prazo"],
        ],
        due,
      )}</select><select id="sort" aria-label="Ordenar">${selectOpts(
        [
          ["manual", "Minha ordem"],
          ["prazo", "Por vencimento"],
        ],
        sort,
      )}</select></div><p class="sub">${sort === "manual" ? "Arraste pelo símbolo ⠿ ou use as setas para mudar a ordem. " : "Ordenado por vencimento; volte para “Minha ordem” para reorganizar. "}Toque em Abrir para ver detalhes, compras e pagamentos.</p><div id="rows"></div></section>`;
    updateRows();
    $("#search").oninput = (e) => {
      search = e.target.value;
      updateRows();
    };
    for (const [idName, set] of [
      ["filter", (v) => (filter = v)],
      ["cat", (v) => (cat = v)],
      ["due", (v) => (due = v)],
      ["sort", (v) => (sort = v)],
    ])
      $("#" + idName).onchange = (e) => {
        set(e.target.value);
        idName === "sort" ? render() : updateRows();
      };
  }
  if (page === "income") $("#app").innerHTML = sourcesPanel() + incomeTable();
  if (page === "settings")
    $("#app").innerHTML =
      `<div class="grid"><section class="panel"><h3>Cotação do euro</h3><p class="muted">Atualização automática ao abrir e a cada hora. Só o que ainda falta pagar é recalculado; pagamentos já feitos mantêm a cotação registrada.</p><label>1 euro = R$ <b>${fmtRate(data.rate)}</b></label><p class="notice">${rateInfo()}</p></section><section class="panel"><h3 style="margin-bottom:20px">Backup</h3><button class="btn primary" onclick="backup()">↓ Exportar backup</button> <button class="btn" onclick="$('#import').click()">↑ Importar backup</button><input hidden id="import" type="file" accept="application/json" onchange="restore(this)"></section><section class="panel"><h3>Conta</h3><p class="muted">Conectado como <b>${esc(window.currentEmail)}</b>. Os dados ficam salvos na nuvem e sincronizados entre os aparelhos.</p><button class="btn" onclick="if(confirm('Sair desta conta?'))logout()">Sair</button></section></div>`;
}

const byDue = (a, b) =>
  (a.status === "Concluído") - (b.status === "Concluído") ||
  (dueDate(a) || "9999").localeCompare(dueDate(b) || "9999");
function matchDue(t) {
  const k = dueStatus(t)?.key;
  if (due === "Atrasados") return k === "late";
  if (due === "Próximos") return k === "today" || k === "near";
  if (due === "Sem prazo") return !dueDate(t);
  return true;
}
function updateRows() {
  let list = data.tasks.filter(
    (t) =>
      (filter === "Todos" ||
        (filter === "Não concluídos" ? t.status !== "Concluído" : t.status === filter)) &&
      (cat === "Todas" || t.category === cat) &&
      matchDue(t) &&
      (t.title + " " + t.notes).toLowerCase().includes(search.toLowerCase()),
  );
  if (sort === "prazo") list = [...list].sort(byDue);
  $("#rows").innerHTML =
    (data.folder && cat === data.folder.category ? folderCard() : "") +
    summary(list) +
    taskTable(list, sort === "manual");
}
// Totais das pendências exibidas (respeita busca e filtros)
function summary(list) {
  const s = totals(list),
    box = (label, v) => `<div><small>${label}</small><b>${money(v)}</b>${eurLine(v)}</div>`;
  return `<div class="summary">${box(`Total previsto${cat === "Todas" ? "" : " em " + esc(cat)}`, s.total)}${box("Já pago", s.paid)}${box("Falta pagar", s.open)}</div>${s.unknown ? `<p class="flag">Previsão incompleta: ${s.unknown} ${s.unknown === 1 ? "item com custo" : "itens com custo"} a definir, não contados como zero.</p>` : ""}`;
}

function qtyBlock(t) {
  const b = bought(t),
    rest = Math.max(0, t.qty - b),
    pct = Math.min(100, Math.round((b / t.qty) * 100)),
    next = planSteps(t).find((s) => !s.done);
  return `<div class="qty"><small>${fmtQty(b)} de ${fmtQty(t.qty)} ${esc(t.unit || "un.")} compradas · ${rest ? `faltam ${fmtQty(rest)}` : "aquisição concluída ✓"}</small><div class="bar mini"><span style="width:${pct}%"></span></div>${next ? `<small>Próxima compra: ${fmtQty(next.qty)} ${next.date ? "em " + fmtDate(next.date) : "(data a definir)"}</small>` : ""}</div>`;
}
function finValues(t) {
  const f = forecast(t),
    cur = (v) => money(v, t.currency),
    pc = paidCur(t),
    lines = [];
  if (f.known > 0)
    lines.push(
      `<b>${cur(f.known)}</b>${t.currency === "EUR" ? ` <small>≈ ${money(paidBRL(t) + outstandingBRL(t))}</small>` : ""}`,
    );
  if (f.unknown) lines.push(`<small>${f.known > 0 ? "+ restante " : ""}a definir</small>`);
  if (pc > 0 && !(t.currency === "BRL" && payStatus(t).label === "Pago"))
    lines.push(`<small>Pago ${cur(pc)}${t.currency === "EUR" ? ` (${money(paidBRL(t))})` : ""}</small>`);
  if (pc > 0 && outstandingCur(t) > 0) lines.push(`<small>Falta ${cur(outstandingCur(t))}</small>`);
  return lines.join("<br>");
}
function originText(t) {
  if (!t.alloc.length) return "Fonte não definida";
  return t.alloc
    .map((a) => sourceName(a.sourceId) + (a.brl !== null && a.brl !== "" ? ` (${money(num(a.brl))})` : ""))
    .join(" + ");
}
function taskTable(a, manual = true) {
  if (!a.length) return '<div class="empty">Nenhuma pendência por aqui.</div>';
  return `<div class="tablewrap"><table class="cardtable tasks"><thead><tr><th>Pendência</th><th>Prazo</th><th>Tarefa</th><th>Financeiro</th><th>Origem do dinheiro</th><th></th></tr></thead><tbody>${a
    .map((t) => {
      const d = dueStatus(t),
        ps = payStatus(t);
      return `<tr data-id="${t.id}"><td data-label="Pendência"><div>${manual ? '<span class="draghandle" tabindex="0" role="button" aria-label="Arrastar pendência" title="Arrastar para reordenar">⠿</span>' : ""}<input class="check" aria-label="Concluir ${esc(t.title)}" type="checkbox" ${t.status === "Concluído" ? "checked" : ""} onchange="toggle('${t.id}',this.checked)"><b>${esc(t.title)}</b><br><small class="meta">${esc(t.category)}${inFolder(t) && t.required ? " · obrigatório da pasta" : ""}</small>${t.notes ? `<br><small>${esc(t.notes)}</small>` : ""}${isCost(t) && t.multi ? qtyBlock(t) : ""}</div></td><td data-label="Prazo"><div>${d ? `${badge(d.label, d.cls)}<br><small>${fmtDate(dueDate(t))}${t.date ? "" : " · prazo da pasta"}</small>` : "<small>Sem prazo</small>"}</div></td><td data-label="Tarefa"><div>${badge(t.status, statusCls(t.status))}</div></td><td data-label="Financeiro"><div>${badge(ps.label, ps.cls)}${isCost(t) ? "<br>" + finValues(t) : ""}</div></td><td data-label="Origem"><div><small>${isCost(t) ? esc(originText(t)) : "—"}</small></div></td><td class="rowactions">${manual ? `<button class="link" aria-label="Mover para cima" onclick="moveTask('${t.id}',-1)">↑</button><button class="link" aria-label="Mover para baixo" onclick="moveTask('${t.id}',1)">↓</button>` : ""}<button class="link" onclick="openTask('${t.id}')">Abrir</button></td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}

function sourcesPanel() {
  const st = sourceStats(),
    neg = (v) => (v < -0.005 ? ` class="neg" title="Ultrapassa o saldo"` : ""),
    rows = [...data.sources.map((s) => [s.id, s.name]), ["", "Fonte não definida"]].filter(
      ([id]) => id || Object.values(st[""]).some((v) => Math.abs(v) > 0.005),
    );
  return `<section class="panel"><div class="paneltop"><h3>Fontes de dinheiro</h3><button class="btn" onclick="manageSources()">Fontes</button><button class="btn primary" onclick="editIncome()">+ Nova entrada</button></div><p class="sub">Saldo atual = recebido − utilizado. Reservas reduzem só o saldo livre. ${rateNote()}</p><div class="tablewrap"><table class="cardtable"><thead><tr><th>Fonte</th><th>Recebido</th><th>Utilizado</th><th>Saldo atual</th><th>Reservado</th><th>Saldo livre</th><th></th></tr></thead><tbody>${rows
    .map(([id, name]) => {
      const s = st[id],
        noBalance = !id && !s.received && !s.expected,
        bal = (v) => (noBalance ? "—" : `<b>${money(v)}</b>`);
      return `<tr><td data-label="Fonte"><div><b>${esc(name)}</b>${s.expected ? `<br><small>+ ${money(s.expected)} previsto</small>` : ""}</div></td><td data-label="Recebido"><div>${money(s.received)}</div></td><td data-label="Utilizado"><div>${money(s.used)}</div></td><td data-label="Saldo atual"${noBalance ? "" : neg(s.current)}><div>${bal(s.current)}${noBalance ? "" : "<br>" + eurLine(s.current)}</div></td><td data-label="${id ? "Reservado" : "A pagar sem fonte"}"><div>${money(s.reserved)}</div></td><td data-label="Saldo livre"${noBalance ? "" : neg(s.free)}><div>${bal(s.free)}${!noBalance && s.free < -0.005 ? "<br><small>⚠ reservas acima do saldo</small>" : ""}</div></td><td class="rowactions"><button class="link" onclick="sourceLinks('${id}')">Ver vínculos</button></td></tr>`;
    })
    .join("")}</tbody></table></div></section>`;
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
