// Fontes de dinheiro (venda do apartamento, reserva, salário…) e pasta do Consulado
const sourceInUse = (id) =>
  data.income.some((i) => i.sourceId === id) ||
  data.tasks.some(
    (t) =>
      t.alloc.some((a) => a.sourceId === id) ||
      t.credits.some((c) => c.sourceId === id || c.installments.some((i) => i.sourceId === id)) ||
      [...outflows(t), ...commitments(t)].flatMap((o) => o.split).some((s) => s.sourceId === id),
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
    .querySelectorAll(
      '#form select[name="splitSource"], #form select[name="sourceId"], #form select[name="plannedSource"]',
    )
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
  const name = sourceName(id);
  if (sourceInUse(id)) {
    if (
      !confirm(
        `“${name}” tem entradas, reservas ou pagamentos ligados a ela.\n\nExcluir mesmo assim? Esses registros continuam no app, mas passam a aparecer como “Fonte não definida”.`,
      )
    )
      return;
    const unlink = (list) => list.forEach((s) => s.sourceId === id && (s.sourceId = ""));
    data.income.forEach((i) => i.sourceId === id && Object.assign(i, { sourceId: "", origin: "" }));
    data.tasks.forEach((t) => {
      t.alloc = t.alloc.filter((a) => a.sourceId !== id);
      t.payments.forEach((p) => unlink(p.split || []));
      t.credits.forEach((c) => {
        if (c.sourceId === id) c.sourceId = "";
        c.installments.forEach((i) => {
          if (i.sourceId === id) i.sourceId = "";
          unlink(i.payment?.split || []);
        });
      });
    });
  } else if (!confirm(`Excluir a fonte “${name}”?`)) return;
  data.sources = data.sources.filter((s) => s.id !== id);
  save();
  sourceList();
}

// Cartões e contas por apelido; nunca guardamos número, validade ou código de segurança
const accountOptions = (v, type) =>
  `<option value="">${type === "cartao" ? "Escolha o cartão" : "Não informado"}</option>` +
  data.accounts
    .filter((a) => !type || a.type === type)
    .map(
      (a) =>
        `<option value="${a.id}" ${a.id === v ? "selected" : ""}>${esc(a.name)}${type ? "" : a.type === "cartao" ? " (cartão)" : " (conta)"}</option>`,
    )
    .join("") +
  `<option value="${NEW_CATEGORY}">+ ${type === "cartao" ? "Novo cartão" : "Novo cartão ou conta"}…</option>`;
const accountInUse = (id) =>
  data.tasks.some(
    (t) =>
      t.accountId === id ||
      t.payments.some((p) => p.accountId === id) ||
      t.credits.some((c) => c.accountId === id),
  );
function addAccount(name, type) {
  const v = name?.trim();
  if (!v || v.length > 40) return null;
  const existing = data.accounts.find((a) => a.type === type && a.name.toLowerCase() === v.toLowerCase());
  if (existing) return existing;
  const a = { id: uid(), name: v, type };
  data.accounts.push(a);
  save();
  toast(type === "cartao" ? "Cartão cadastrado" : "Conta cadastrada");
  return a;
}
// Cadastra um cartão ou conta direto do formulário de pagamento
function pickAccount(select) {
  if (select.value !== NEW_CATEGORY) {
    select.dataset.prev = select.value;
    formSync();
    return;
  }
  const method = $("#form").elements.namedItem("method")?.value,
    type = select.dataset.type || (["debito", "credito"].includes(method) ? "cartao" : "conta"),
    a = addAccount(
      prompt(
        `Apelido do ${type === "cartao" ? "cartão" : "banco ou conta"} (ex.: C6, XP, Inter).\nNão informe número, validade ou código de segurança.`,
      ),
      type,
    );
  if (!a) {
    select.value = select.dataset.prev || "";
    return;
  }
  document.querySelectorAll('#form select[name="accountId"], #form select[name="cardId"]').forEach((el) => {
    if ((!el.dataset.type || el.dataset.type === type) && ![...el.options].some((o) => o.value === a.id))
      el.querySelector(`option[value="${NEW_CATEGORY}"]`).insertAdjacentHTML(
        "beforebegin",
        `<option value="${a.id}">${esc(a.name)}${el.dataset.type ? "" : type === "cartao" ? " (cartão)" : " (conta)"}</option>`,
      );
  });
  select.value = a.id;
  select.dataset.prev = a.id;
  formSync();
}
function manageAccounts() {
  showForm(
    `<h3>Cartões e contas</h3><p class="sub">Cadastre só um apelido, como “C6”, “XP” ou “Inter”. Não informe número do cartão, validade nem código de segurança.</p><div id="accountlist"></div><div class="twocol"><label>Apelido<input name="newaccount" required maxlength="40" placeholder="Ex.: C6"></label><label>Tipo<select name="type"><option value="cartao">Cartão</option><option value="conta">Conta bancária</option></select></label></div><div class="actions"><button type="button" class="btn" onclick="$('#modal').close()">Fechar</button><button class="btn primary">Adicionar</button></div>`,
    (f) => {
      if (addAccount(f.get("newaccount"), f.get("type"))) {
        $("#form").elements.newaccount.value = "";
        accountList();
      }
    },
  );
  accountList();
}
function accountList() {
  $("#accountlist").innerHTML =
    data.accounts
      .map(
        (a) =>
          `<div class="statrow"><span>${esc(a.name)} <small>${a.type === "cartao" ? "cartão" : "conta"}</small></span><span class="nowrap"><button type="button" class="link" onclick="renameAccount('${a.id}')">Renomear</button><button type="button" class="link danger" onclick="deleteAccount('${a.id}')">Excluir</button></span></div>`,
      )
      .join("") || '<p class="sub">Nenhum cartão ou conta cadastrado.</p>';
}
function renameAccount(id) {
  const a = data.accounts.find((x) => x.id === id),
    v = prompt("Apelido:", a.name)?.trim();
  if (!v || v.length > 40) return;
  a.name = v;
  save();
  accountList();
}
function deleteAccount(id) {
  if (accountInUse(id)) return toast("Este cartão ou conta tem pagamentos vinculados");
  if (!confirm("Excluir este cartão ou conta?")) return;
  data.accounts = data.accounts.filter((a) => a.id !== id);
  save();
  accountList();
}

const monthName = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};
// Divide a parte de cada parcela proporcionalmente entre as fontes usadas na fatura
function scaleSplit(split, part, total) {
  if (!split.length) return [];
  const out = split.map((s) => ({ sourceId: s.sourceId, brl: round2((s.brl * part) / total) }));
  out[out.length - 1].brl = round2(part - sum(out.slice(0, -1).map((s) => s.brl)));
  return out.filter((s) => s.brl > 0);
}
// Pagar a fatura quita as parcelas daquele mês; elas não são contadas como nova despesa
function payBill(accountId, month) {
  const bill = openBills().find((b) => b.accountId === accountId && b.month === month);
  if (!bill) return;
  const planned = [...new Set(bill.items.map(({ c, i }) => validSource(plannedSource(c, i))))],
    total = round2(bill.total);
  showForm(
    `<h3>Pagar fatura · ${esc(accountName(accountId) || "cartão")}</h3><p class="sub">Fatura de ${monthName(month)} · vence ${fmtDate(bill.due)}</p>${bill.items
      .map(
        ({ t, c, i }) =>
          `<div class="statrow"><span>${esc(t.title)} <small>parcela ${i.n}/${c.installments.length}</small></span><b>${money(num(i.brl))}</b></div>`,
      )
      .join(
        "",
      )}<div class="statrow"><span><b>Total da fatura</b></span><b>${money(total)}</b></div>${field("Data do pagamento", "payDate", todayStr(), "date", "required")}<small>Origem do dinheiro</small><div id="splitrows">${splitRow(planned.length === 1 ? planned[0] : "", null, true)}</div><button type="button" class="link" onclick="addSplitRow(true)">+ Dividir entre fontes</button><p class="sub">O pagamento quita as parcelas desta fatura; elas não são contadas de novo.</p><p id="paywarn" class="flag"></p><div class="actions"><button type="button" class="btn" onclick="$('#modal').close()">Cancelar</button><button class="btn primary">Pagar fatura</button></div>`,
    (f) => {
      const r = resolveSplit(readSplitRows(), total);
      if (r.error) return toast(r.error);
      bill.items.forEach(({ t, c, i }) => {
        const inst = findTask(t.id)
          ?.credits.find((x) => x.id === c.id)
          ?.installments.find((x) => x.id === i.id);
        if (inst && !inst.payment)
          inst.payment = {
            date: f.get("payDate"),
            brl: num(i.brl),
            split: scaleSplit(r.split, num(i.brl), total),
            bill: month,
          };
      });
      finish("Fatura paga");
    },
    () => {
      const r = resolveSplit(readSplitRows(), total),
        st = sourceStats();
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

// Lista o que está ligado a uma fonte: entradas, reservas e pagamentos
function sourceLinks(id) {
  const name = id ? sourceName(id) : "Fonte não definida",
    incomes = data.income.filter((i) => validSource(i.sourceId) === id),
    reserved = data.tasks
      .map((t) => [t, reserves(t)[id] || 0])
      .filter(([t, v]) => v > 0.005 || (id && t.alloc.some((a) => a.sourceId === id))),
    paid = data.tasks.flatMap((t) =>
      outflows(t).flatMap((o) =>
        o.split.filter((s) => validSource(s.sourceId) === id).map((s) => ({ t, o, brl: num(s.brl) })),
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
        ({ t, o, brl }) =>
          `<div class="statrow"><span>${open(t)} <small>${fmtDate(o.date) || "sem data"} · ${esc(o.label)}</small></span><b>${money(brl)}</b></div>`,
      ),
    )}<div class="actions"><button type="button" class="btn" onclick="$('#modal').close()">Fechar</button></div>`,
    () => {},
  );
}

// Cria pendências "só checklist" a partir de uma lista colada (um item por linha), sem repetir nomes
function addChecklistItems(category, text) {
  const existing = new Set(data.tasks.map((t) => t.title.trim().toLowerCase()));
  let added = 0;
  (text || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*☐□▢✓✔]|\d+[.)])\s*/, "").trim())
    .filter((l) => l && l.length <= 250)
    .forEach((line) => {
      // "Título | observação": o texto depois da barra vira a observação do item
      const [title, ...rest] = line.split("|").map((x) => x.trim()),
        notes = rest.join(" | ");
      if (!title || existing.has(title.toLowerCase())) return;
      existing.add(title.toLowerCase());
      data.tasks.push({
        id: uid(),
        title,
        category,
        kind: "checklist",
        status: "Pendente",
        notes,
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
        valueType: "",
        valueNote: "",
      });
      added++;
    });
  if (added && !categories.includes(category)) categories.push(category);
  return added;
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
    `<h3>Configurar pasta</h3><label>Categoria da pasta<select name="category" onchange="document.querySelector('#reqlist').innerHTML=folderItems(this.value)">${opts(categories, f.category)}</select></label>${field("Data limite geral (entrega à consultoria)", "deadline", f.deadline, "date")}<p class="sub">Itens sem prazo próprio seguem esta data. Prazos definidos em cada item são mantidos.</p><fieldset class="sec"><legend>Itens obrigatórios para concluir a pasta</legend><div id="reqlist">${items(f.category)}</div></fieldset><fieldset class="sec"><legend>Adicionar vários itens</legend><label>Cole a lista do checklist, um item por linha<textarea name="bulk" rows="8" placeholder="Passaporte válido&#10;Formulário de solicitação do visto&#10;Comprovante de matrícula"></textarea></label><p class="sub">Entram na ordem da lista, como “Só checklist” e obrigatórios. Use “Título | observação” para incluir uma observação. Itens com o mesmo nome não são repetidos.</p></fieldset><div class="actions"><button type="button" class="btn" onclick="$('#modal').close()">Cancelar</button><button class="btn primary">Salvar</button></div>`,
    (fd) => {
      const category = fd.get("category"),
        req = new Set(fd.getAll("req"));
      data.folder = { category, deadline: fd.get("deadline") };
      data.tasks.filter((t) => t.category === category).forEach((t) => (t.required = req.has(t.id)));
      const added = addChecklistItems(category, fd.get("bulk"));
      finish(
        added
          ? `${added} ${added === 1 ? "item adicionado" : "itens adicionados"} à pasta`
          : "Pasta atualizada",
      );
    },
  );
  window.folderItems = items;
}
