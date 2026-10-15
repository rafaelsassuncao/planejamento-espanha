// Renderização das páginas e tabelas
function cards() {
  return `<div class="cards"><div class="card"><label>↗ &nbsp; Dinheiro disponível</label><div class="amount">${money(total())}</div><span class="sub">${data.income.length} entrada(s) registrada(s)</span></div><div class="card"><label>▤ &nbsp; Custo total previsto</label><div class="amount">${money(cost())}</div><span class="sub">Inclui despesas pagas e ainda a pagar</span></div><div class="card"><label>◌ &nbsp; Saldo após os custos</label><div class="amount">${money(total() - cost())}</div><span class="sub">Entradas menos todos os custos previstos</span></div></div>`;
}
function render() {
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  const done = data.tasks.filter((t) => t.status === "Concluído").length,
    pct = data.tasks.length ? Math.round((done / data.tasks.length) * 100) : 0;
  if (page === "overview")
    $("#app").innerHTML =
      `<div class="hero"><div><span class="tag">NOSSA MUDANÇA • VISTO DE ESTUDANTE</span><h2>Uma nova vida. Um passo de cada vez.</h2><p>3 adultos, 1 bebê e 2 gatas rumo à Espanha.</p></div><div class="landmark" aria-hidden="true">☀︎ ⌂</div></div>${cards()}<div class="grid"><section class="panel"><div class="paneltop"><h3>Como está o planejamento?</h3><span class="badge done">${pct}% concluído</span></div><div class="bar"><span style="width:${pct}%"></span></div><p class="muted">${done} de ${data.tasks.length} pendências resolvidas. Cada detalhe conta.</p><div class="statrow"><span>Custos já pagos</span><b>${money(sum(data.tasks.filter((t) => t.paid).map(brl)))}</b></div><div class="statrow"><span>Ainda falta pagar</span><b>${money(sum(data.tasks.filter((t) => !t.paid).map(brl)))}</b></div><button class="link" onclick="go('tasks')" style="margin-top:13px">Ver todas as pendências →</button></section><section class="panel"><div class="paneltop"><h3>Câmbio do planejamento</h3><span>€ → R$</span></div><p class="muted">Cotação automática para os custos em euros.</p><label>1 euro = R$ <b>${Number(data.rate).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</b></label><p class="sub">${rateInfo()}</p></section></div><section class="panel"><div class="paneltop"><h3>Próximos passos</h3><button class="btn primary" onclick="editTask()">+ Nova pendência</button></div>${taskTable(data.tasks.filter((t) => t.status !== "Concluído").slice(0, 4))}</section>`;
  if (page === "tasks") {
    $("#app").innerHTML =
      `<section class="panel"><div class="paneltop"><h3>Seu checklist da mudança</h3><button class="btn" onclick="manageCategories()">Categorias</button><button class="btn primary" onclick="editTask()">+ Nova pendência</button></div><div class="tools"><input id="search" aria-label="Buscar pendência" placeholder="Buscar uma pendência…" value="${esc(search)}"><select id="filter" aria-label="Filtrar por situação">${["Todos", "Pendente", "Em andamento", "Concluído"].map((s) => `<option ${s === filter ? "selected" : ""}>${s}</option>`).join("")}</select><select id="cat" aria-label="Filtrar categoria">${["Todas", ...categories].map((s) => `<option ${s === cat ? "selected" : ""}>${s}</option>`).join("")}</select></div><p class="sub">Arraste pelo símbolo ⠿ para mudar a ordem, ou use as setas. Use Editar para alterar qualquer informação.</p><div id="rows"></div></section>`;
    updateRows();
    $("#search").oninput = (e) => {
      search = e.target.value;
      updateRows();
    };
    $("#filter").onchange = (e) => {
      filter = e.target.value;
      updateRows();
    };
    $("#cat").onchange = (e) => {
      cat = e.target.value;
      updateRows();
    };
  }
  if (page === "income")
    $("#app").innerHTML =
      `<section class="panel"><div class="paneltop"><h3>Histórico de entradas</h3><button class="btn primary" onclick="editIncome()">+ Nova entrada</button></div><div class="tablewrap"><table><thead><tr><th>Origem / descrição</th><th>Data</th><th>Valor recebido</th><th>Observações</th><th></th></tr></thead><tbody>${data.income.map((i) => `<tr><td><b>${esc(i.origin)}</b><br><small>${esc(i.description)}</small></td><td>${i.date ? i.date.split("-").reverse().join("/") : "Não informada"}</td><td><b>${money(i.value)}</b></td><td>${esc(i.notes)}</td><td><button class="link" onclick="editIncome('${i.id}')">Editar</button><button class="link danger" aria-label="Excluir entrada" title="Excluir" onclick="removeItem('income','${i.id}')">🗑</button></td></tr>`).join("")}</tbody></table></div></section>`;
  if (page === "settings")
    $("#app").innerHTML =
      `<div class="grid"><section class="panel"><h3>Cotação do euro</h3><p class="muted">Atualização automática ao abrir e a cada hora. Os custos em euros são recalculados automaticamente.</p><label>1 euro = R$ <b>${Number(data.rate).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</b></label><p class="notice">${rateInfo()}</p></section><section class="panel"><h3 style="margin-bottom:20px">Backup</h3><button class="btn primary" onclick="backup()">↓ Exportar backup</button> <button class="btn" onclick="$('#import').click()">↑ Importar backup</button><input hidden id="import" type="file" accept="application/json" onchange="restore(this)"></section><section class="panel"><h3>Conta</h3><p class="muted">Conectado como <b>${esc(window.currentEmail)}</b>. Os dados ficam salvos na nuvem e sincronizados entre os aparelhos.</p><button class="btn" onclick="if(confirm('Sair desta conta?'))logout()">Sair</button></section></div>`;
}
function updateRows() {
  const list = data.tasks.filter(
    (t) =>
      (filter === "Todos" || t.status === filter) &&
      (cat === "Todas" || t.category === cat) &&
      (t.title + " " + t.notes).toLowerCase().includes(search.toLowerCase()),
  );
  $("#rows").innerHTML = summary(list) + taskTable(list);
}
// Totais em reais das pendências exibidas (respeita busca e filtros)
function summary(list) {
  const paid = sum(list.filter((t) => t.paid).map(brl)),
    open = sum(list.filter((t) => !t.paid).map(brl));
  return `<div class="summary"><div><small>Total${cat === "Todas" ? "" : " em " + esc(cat)}</small><b>${money(paid + open)}</b></div><div><small>Já pago</small><b>${money(paid)}</b></div><div><small>Falta pagar</small><b>${money(open)}</b></div></div>`;
}
function taskTable(a) {
  return a.length
    ? `<div class="tablewrap"><table><thead><tr><th>Pendência</th><th>Categoria</th><th>Valor / em reais</th><th>Situação</th><th>Pagamento</th><th></th></tr></thead><tbody>${a.map((t) => `<tr data-id="${t.id}"><td><span class="draghandle" tabindex="0" role="button" aria-label="Arrastar pendência" title="Arrastar para reordenar">⠿</span><input class="check" aria-label="Concluir ${esc(t.title)}" type="checkbox" ${t.status === "Concluído" ? "checked" : ""} onchange="toggle('${t.id}',this.checked)"><b>${esc(t.title)}</b>${t.date ? `<br><small>Prazo: ${t.date.split("-").reverse().join("/")}</small>` : ""}${t.notes ? `<br><small>${esc(t.notes)}</small>` : ""}</td><td><small>${esc(t.category)}</small></td><td>${t.value ? `<b>${money(t.value, t.currency)}</b>${t.currency === "EUR" ? `<br><small>${money(brl(t))}</small>` : ""}` : "<small>A definir</small>"}</td><td><span class="badge ${t.status === "Concluído" ? "done" : ""}">${t.status}</span></td><td>${t.paid ? "✓ Pago" : "A pagar"}</td><td><button class="link" aria-label="Mover para cima" onclick="moveTask('${t.id}',-1)">↑</button><button class="link" aria-label="Mover para baixo" onclick="moveTask('${t.id}',1)">↓</button><button class="link" onclick="editTask('${t.id}')">Editar</button></td></tr>`).join("")}</tbody></table></div>`
    : '<div class="empty">Nenhuma pendência por aqui.</div>';
}
