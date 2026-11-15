// Testes de funcionamento: roda dentro da página (com Firebase simulado) e devolve PASS/FAIL por item
(async () => {
  const R = [];
  const check = (name, ok, detail = "") =>
    R.push(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + JSON.stringify(detail)}`);
  const near = (a, b) => Math.abs(a - b) < 0.01;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  window.confirm = () => true;
  window.alert = () => {};
  const F = () => $("#form");
  const fire = (el) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  // Preenche um campo pelo nome (campos de dinheiro ficam escondidos atrás do campo formatado)
  const set = (name, value, idx = 0) => {
    const all = [...F().querySelectorAll(`[name="${name}"]`)],
      vis = all.filter((e) => e.type !== "hidden"),
      els = vis.length ? vis : all;
    if (els[0]?.type === "radio") {
      const r = els.find((e) => e.value === value);
      r.checked = true;
      return fire(r);
    }
    const el = els[idx];
    if (!el) throw Error("campo não encontrado: " + name);
    if (el.type === "checkbox") el.checked = value;
    else el.value = value;
    fire(el);
  };
  const submit = () => F().requestSubmit();
  const T = (title) => data.tasks.find((t) => t.title === title);
  const S = (name) => data.sources.find((s) => s.name === name);
  const row = (t) => document.querySelector(`#rows tr[data-id="${t.id}"]`);
  // Lista de etapas aberta logo abaixo da linha
  const stepsBox = (t) => document.querySelector(`#rows [data-for="${t.id}"] .stepsopen`);
  const act = (t, a) => row(t).querySelector(`.rowmenu [data-act="${a}"]`);
  const plus = (n) => isoDate(new Date(Date.now() + n * 864e5));
  const listTasks = () => {
    page = "tasks";
    cat = "Todas";
    filter = "Todos";
    due = "Todos";
    costF = "Todos";
    search = "";
    sort = "manual";
    srcF = "Todas";
    selected.clear();
    render();
  };
  try {
    // ---------- A. Migração dos dados antigos (vindos da nuvem) ----------
    const t1 = T("Passagens"),
      t3 = T("Seguro");
    check("A schema atual", data.schema === 6);
    check("A 'Já foi pago' antigo vira pagamento", t1.payments.length === 1 && t1.payments[0].brl === 9000);
    check("A valor 0 antigo fica 'a definir'", t3.kind === "cost" && !t3.priceKnown);
    check("A entradas viram fontes", sourceName(data.income[0].sourceId) === "Santander Consulado");
    check(
      "A apartamento e reserva pessoal viram Santander Consulado",
      !S("Venda do apartamento") && !S("Reserva pessoal") && S("Santander Consulado").consulate && !S("Salário").consulate,
    );
    check("A meta do consulado começa em R$ 113 mil", data.consulGoal === 113000);
    const v4 = {
      schema: 4,
      sources: [
        { id: "s1", name: "Santander Consulado", consulate: true },
        { id: "s2", name: "Venda Ap" },
        { id: "s3", name: "Reserva Carro" },
      ],
      income: [{ id: "i9", value: 143300, sourceId: "s2", received: true }],
      tasks: [],
    };
    migrate(v4);
    check(
      "A 'Venda Ap' e 'Reserva Carro' entram no Santander e Salário existe",
      v4.sources.map((x) => x.name).join("|") === "Salário|Santander Consulado" && v4.income[0].sourceId === "s1" && v4.income[0].value === 143300,
      v4.sources.map((x) => x.name),
    );
    const v5 = {
      schema: 5,
      sources: [
        { id: "a1", name: "Salário", consulate: false },
        { id: "a2", name: "Santander Consulado", consulate: true },
        { id: "a3", name: "Salario", consulate: false },
      ],
      income: [],
      tasks: [{ id: "x1", title: "Foto", alloc: [{ sourceId: "a3", brl: null }], payments: [] }],
    };
    migrate(v5);
    check(
      "A 'Salario' sem acento se junta ao 'Salário', que fica sem saldo",
      v5.sources.length === 2 && v5.sources[0].flow && v5.tasks[0].alloc[0].sourceId === "a1",
      v5.sources,
    );
    check("A pasta com prazo 15/11/2026", data.folder.deadline === "2026-11-15");
    check("A migração gravou na nuvem com versão", __mock.server.schema === 6 && __mock.server.rev >= 1);
    data.rate = 6;

    // ---------- B. Pendência: criar, dinheiro formatado, editar, excluir ----------
    listTasks();
    editTask();
    set("title", "Atestado médico");
    set("category", "Consulado");
    set("kind", "cost");
    const mShown = () => F().querySelector(".moneyshown");
    mShown().focus();
    mShown().value = "1234";
    mShown().dispatchEvent(new InputEvent("input", { bubbles: true }));
    check("B milhar ao digitar", mShown().value === "1.234" && F().elements.value.value === "1234");
    mShown().value = "50";
    mShown().dispatchEvent(new InputEvent("input", { bubbles: true }));
    mShown().blur();
    mShown().dispatchEvent(new Event("blur"));
    check("B centavos ao sair do campo", mShown().value === "50,00");
    set("valueType", "estimado");
    set("valueNote", "média de 3 sites");
    set("date", plus(10));
    submit();
    const at = () => T("Atestado médico");
    check("B pendência criada", at() && at().value === 50 && at().valueType === "estimado");
    listTasks();
    check("B linha mostra o valor", row(at()).querySelector(".c-val").textContent.includes("50,00"));
    check("B linha sem coluna de prazo", !row(at()).querySelector(".c-due, .statussel, .draghandle, input.sel"));
    row(at()).querySelector('.rowmenu [data-act="edit"]').click();
    check("B 'Editar' abre o formulário", $("#modal").open && F().elements.title.value === "Atestado médico");
    set("notes", "levar ao cartório");
    submit();
    check("B edição salva", at().notes === "levar ao cartório");

    // ---------- C. Andamento ----------
    listTasks();
    act(at(), "prog").click();
    check("C 'Marcar em andamento' no menu, sem janela", at().status === "Em andamento" && !$("#modal").open);
    check("C linha diz 'Em andamento'", row(at()).querySelector(".tnotes").textContent.includes("Em andamento"));
    filter = "Não concluídos";
    render();
    row(at()).querySelector(".donebtn").click();
    await wait(800);
    check(
      "C concluir some da lista e oferece desfazer",
      at().status === "Concluído" && !row(at()) && $("#toast").textContent.includes("ocultada"),
    );
    check(
      "C concluir algo com valor pergunta se já pagou",
      $("#modal").open && $("#modal h3").textContent.includes("Você já pagou") && $("#modal").textContent.includes("Ainda não paguei"),
    );
    [...document.querySelectorAll("#modal .actions .btn")].find((b) => b.textContent === "Ainda não paguei").click();
    check("C 'Ainda não paguei' fecha sem registrar", !$("#modal").open && !at().payments.length);
    $("#toast").querySelector(".toastbtn").click();
    check("C desfazer traz de volta", at().status === "Em andamento" && !!row(at()));

    // ---------- D. Etapas na própria linha ----------
    listTasks();
    editTask(at().id);
    for (const [i, txt] of ["Pegar o modelo", "Médico assinar", "Reconhecer firma"].entries()) {
      addStepRow();
      F().querySelectorAll("#steprows .steprow2")[i].querySelector("[name=stepText]").value = txt;
    }
    F().querySelectorAll("#steprows .steprow2")[2].querySelector("[name=stepDate]").value = plus(5);
    F().querySelectorAll("#steprows .steprow2")[0].querySelector(".stepdone").checked = true;
    submit();
    listTasks();
    check("D etapas salvas", at().steps.length === 3 && at().steps[0].done);
    check(
      "D linha mostra o próximo passo",
      row(at()).querySelector(".c-step .nextstep").textContent.includes("Médico assinar") &&
        row(at()).querySelector(".nextstep").textContent.includes("1/3"),
    );
    row(at()).querySelector(".stepdo").click();
    check(
      "D '✓ Feito' conclui o próximo passo",
      at().steps[1].done &&
        row(at()).querySelector(".nextstep").textContent.includes("Reconhecer firma") &&
        $("#toast").textContent.includes("Etapa feita"),
    );
    $("#toast").querySelector(".toastbtn").click();
    check("D desfazer a etapa", !at().steps[1].done);
    act(at(), "steps").click();
    check(
      "D etapas abrem na linha, sem janela",
      !$("#modal").open && stepsBox(at()).querySelectorAll(".steprowi").length === 3,
    );
    stepsBox(at()).querySelectorAll(".steprowi input")[0].click();
    check("D desmarcar direto na lista", !at().steps[0].done && !!stepsBox(at()));
    const addIn = stepsBox(at()).querySelector(".stepadd [name=newStep]");
    addIn.value = "Levar para a pasta";
    addIn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    check(
      "D Enter adiciona e mantém o cursor",
      at().steps.length === 4 &&
        document.activeElement === stepsBox(at()).querySelector(".stepadd [name=newStep]"),
    );
    stepsBox(at()).querySelector(".steptoggle").click();
    check("D fechar a lista de etapas", !document.querySelector(`#rows .stepsopen`));
    const noSteps = data.tasks.find((t) => !t.steps.length && t.status !== "Concluído");
    act(noSteps, "steps").click();
    check(
      "D '+ etapas' abre o campo com cursor",
      document.activeElement === stepsBox(noSteps).querySelector(".stepadd [name=newStep]"),
    );
    stepsBox(noSteps).querySelector(".stepadd [name=newStep]").value = "Tirar cópia";
    stepsBox(noSteps).querySelector(".stepadd .btn").click();
    toggleStepsOpen(noSteps.id);
    check(
      "D primeira etapa criada pela linha",
      noSteps.steps.length === 1 || T(noSteps.title).steps.length === 1,
    );
    search = "firma";
    render();
    check("D busca encontra pelo texto da etapa", !!row(at()));
    search = "";
    render();

    // ---------- E. Prazo próprio, filtros e soma ----------
    const folderItem = () =>
      data.tasks.find((t) => t.category === "Consulado" && !t.date && t.status !== "Concluído");
    listTasks();
    check("E prazo da pasta vale por trás", dueDate(folderItem()) === "2026-11-15");
    const hf = document.querySelector('.morefilters [data-f="costf"]');
    hf.value = "Pago";
    hf.dispatchEvent(new Event("change"));
    const shown = () =>
      [...document.querySelectorAll("#rows tbody tr[data-id]")].map((r) =>
        data.tasks.find((t) => t.id === r.dataset.id),
      );
    check(
      "E filtro de pagamento em Filtros",
      shown().length > 0 && shown().every((t) => payStatus(t).label.startsWith("Pago")),
    );
    setFilter("costf", "Todos");
    const sumText = () => document.querySelector("#sum .sumcard").textContent.replace(/\s/g, " ");
    check("E sem seleção soma tudo", sumText().includes(moneyFmt(totals(shown()).total)));
    setFilter("cat", "Consulado");
    check(
      "E card da categoria aparece ao filtrar",
      document.querySelector("#sum .folder h3").textContent.includes("Consulado"),
    );

    // ---------- E2. Concluídas continuam nas contas ----------
    listTasks();
    const owe = data.tasks.find((t) => isCost(t) && !forecast(t).unknown && uncoveredCur(t) > 0 && t.status !== "Concluído");
    filter = "Não concluídos";
    render();
    const before = totals(data.tasks.filter((t) => t.category === owe.category)).open;
    setStatus(owe.id, "Concluído");
    check(
      "E2 concluir pergunta se já pagou, com as fontes",
      $("#modal").open && [...document.querySelectorAll("#modal .paysrc")].some((b) => b.textContent.includes("Santander Consulado")),
    );
    $("#modal").close();
    check(
      "E2 concluída oculta continua no total do topo",
      !row(owe) && document.querySelector("#sum .sumcard").textContent.replace(/\s/g, " ").includes(moneyFmt(totals(data.tasks.filter((t) => cat === "Todas" || t.category === cat)).total)),
    );
    check(
      "E2 categoria mostra quanto falta",
      [...document.querySelectorAll(".tghead")].some((h) => h.textContent.includes(owe.category) && h.textContent.replace(/\s/g, " ").includes(moneyFmt(before))),
    );
    setFilter("costf", "A pagar");
    filter = "Todos";
    render();
    check(
      "E2 botão A pagar mostra a concluída sem pagamento",
      !!row(owe) && [...document.querySelectorAll("#rows tbody tr[data-id]")].every((r) => outstandingBRL(data.tasks.find((t) => t.id === r.dataset.id)) > 0),
    );
    render();
    act(owe, "pay").click();
    const picks = [...document.querySelectorAll("#modal .paysrc")].map((b) => b.textContent);
    check(
      "E2 'Marcar pago' pergunta salário ou Santander",
      $("#modal").open && picks.some((x) => x.includes("Salário")) && picks.some((x) => x.includes("Santander Consulado")),
      picks,
    );
    const consul = S("Santander Consulado"),
      res0 = sourceStats()[consul.id].used;
    document.querySelector(`#modal .paysrc[data-src="${consul.id}"]`).click();
    check(
      "E2 pago com a reserva sai do Santander",
      payStatus(owe).label === "Pago" &&
        owe.payments.at(-1).split[0].sourceId === consul.id &&
        near(sourceStats()[consul.id].used - res0, owe.payments.at(-1).brl) &&
        !$("#modal").open,
    );
    owe.payments.pop();
    quickPay(owe.id);
    check(
      "E2 só três opções: Salário, Santander e Outra",
      [...document.querySelectorAll("#modal .paypick .paysrc")].map((b) => b.querySelector("span").textContent).join("|") ===
        "Salário|Santander Consulado|Outra",
    );
    document.querySelector('#modal [data-act="other"]').click();
    $("#form [name=newsource]").value = "Conta Nubank";
    [...document.querySelectorAll("#modal .payother .btn")].at(-1).click();
    check(
      "E2 'Outra' cadastra fonte nova e marca pago",
      !!S("Conta Nubank") && owe.payments.at(-1).split[0].sourceId === S("Conta Nubank").id && !$("#modal").open,
    );
    owe.payments.pop();
    owe.status = "Pendente";
    costF = "Todos";
    save();

    // ---------- F. Pagamentos ----------
    listTasks();
    const sal = S("Salário") || addSource("Salário");
    editTask();
    set("title", "Passaporte");
    set("kind", "cost");
    set("value", "516");
    set("plannedSource", sal.id);
    set("paidNow", "1");
    set("payMethod", "boleto");
    submit();
    const pp = T("Passaporte");
    check(
      "F 'Já paguei' registra pagamento da fonte",
      pp.payments[0].brl === 516 &&
        pp.payments[0].split[0].sourceId === sal.id &&
        payStatus(pp).label === "Pago",
    );
    const venda = S("Santander Consulado").id;
    editTask();
    set("title", "Notebook");
    set("kind", "cost");
    set("value", "3000");
    set("plannedSource", venda);
    submit();
    const nb = () => T("Notebook");
    const c6 = addAccount("C6", "cartao");
    const st0 = sourceStats();
    editPayment(nb().id);
    set("method", "credito");
    set("cardId", c6.id);
    set("installmentsN", "3");
    set("creditSource", venda);
    submit();
    const st1 = sourceStats();
    check("F crédito gera 3 parcelas", nb().credits[0].installments.length === 3);
    check("F crédito não reduz o saldo atual", near(st1[venda].current, st0[venda].current));
    check(
      "F crédito sem contar duas vezes",
      near(totals([nb()]).total, 3000) && near(st1[venda].reserved, st0[venda].reserved),
    );
    const bill = openBills()[0];
    payBill(bill.accountId, bill.month);
    submit();
    check(
      "F pagar fatura quita a parcela uma vez",
      nb().credits[0].installments.filter((i) => i.payment).length === 1 &&
        near(totals([nb()]).total, 3000) &&
        near(paidBRL(nb()), 1000),
    );
    const eurT = data.tasks.find((t) => t.currency === "EUR" && t.payments.length);
    const paidBefore = paidBRL(eurT);
    data.rate = 9;
    check("F câmbio não altera o que já foi pago", paidBRL(eurT) === paidBefore);
    data.rate = 6;
    listTasks();
    check("F etiqueta da fonte na linha", row(pp).querySelector(".srcpill.sal")?.textContent.includes("Salário"));
    check("F etiqueta da reserva na linha", row(nb()).querySelector(".srcpill.res")?.textContent.includes("Santander"));
    const sw = data.tasks.find((t) => isCost(t) && !outflows(t).length && !committedBRL(t) && t.status !== "Concluído");
    row(sw).querySelector(`.srcmenu [data-src="${S("Santander Consulado").id}"]`).click();
    check(
      "F atalho na linha troca a fonte para o Santander",
      sw.alloc.length === 1 && sw.alloc[0].sourceId === S("Santander Consulado").id && !!row(sw).querySelector(".srcpill.res"),
    );
    row(sw).querySelector(`.srcmenu [data-src="${S("Salário").id}"]`).click();
    check("F atalho volta para o salário", sw.alloc[0].sourceId === S("Salário").id && !!row(sw).querySelector(".srcpill.sal"));
    const salId = S("Salário").id;
    check(
      "F salário não tem saldo nem fica negativo",
      S("Salário").flow && sourceStats()[salId].current === Infinity && pp.payments[0].split[0].sourceId === salId,
    );
    check(
      "F saldo da visão geral ignora o que foi pago com salário",
      near(overall().current, sum(Object.values(sourceStats()).filter((s) => !s.flow).map((s) => s.received - s.used))),
    );
    page = "income";
    incomePart = "fontes";
    render();
    check(
      "F tabela de fontes mostra salário sem saldo negativo",
      !!document.querySelector(".flowrow") && !document.querySelector(".flowrow .neg") && !document.querySelector("nav.subnav").textContent.includes("Cartões"),
    );
    listTasks();
    setFilter("src", "Salário");
    check(
      "F filtro Salário mostra só o salário",
      !!row(pp) && !row(nb()) && [...document.querySelectorAll("#rows tr[data-id]")].every((r) => ["sal", "mix"].includes(bucket(data.tasks.find((t) => t.id === r.dataset.id)))),
    );
    setFilter("src", "Todas");
    check(
      "F coluna Pagamento separada do valor",
      row(nb()).querySelector(".c-pay").textContent.includes("parcelas") &&
        !row(nb()).querySelector(".c-val").textContent.includes("Pago"),
    );

    // ---------- G. Pasta do Consulado ----------
    const n0 = data.tasks.length;
    editFolder();
    set("bulk", "1. Formulário do visto | do consulado\n- Comprovante de matrícula\nformulário do visto");
    submit();
    const added = data.tasks.slice(n0);
    check(
      "G lista colada sem repetir, com observação",
      added.length === 2 &&
        added[0].notes === "do consulado" &&
        added.every((t) => t.required && t.kind === "checklist"),
    );
    page = "overview";
    render();
    check(
      "G visão geral sem painel de progresso e sem pasta",
      !document.querySelector(".folder, .nextrow") && document.querySelector(".overline").textContent.includes("pendências concluídas"),
    );
    listTasks();
    setFilter("cat", "Consulado");
    check("G pasta aparece nas pendências do Consulado", !!document.querySelector("#sum .folder .barrow"));

    // ---------- H. Visão geral ----------
    page = "overview";
    render();
    check("H visão geral sem bloco de abertura", !document.querySelector(".hero"));
    const goal0 = data.consulGoal,
      cur = consulInfo().current;
    data.consulGoal = cur + 1000;
    render();
    check(
      "H aviso quando a reserva está abaixo da meta",
      document.querySelector(".consulstatus.late")?.textContent.includes("Abaixo da meta"),
    );
    data.consulGoal = Math.max(1, (cur - consulInfo().reserved) / 1.2);
    render();
    check("H acima da meta com folga", !!document.querySelector(".consulstatus.done"));
    data.consulGoal = Math.max(1, (cur - consulInfo().reserved) / 1.02);
    render();
    check("H 'quase no limite' quando sobra menos de 5%", document.querySelector(".consulstatus.warn")?.textContent.includes("Quase no limite"));
    data.consulGoal = goal0;
    render();
    document.querySelector(".overline .link").click();
    check("H 'Ver pendências' abre a lista", page === "tasks");

    page = "overview";
    render();
    const tp = document.querySelector(".tip");
    tp.click();
    check("H dica ⓘ abre ao tocar", getComputedStyle(tp.querySelector(".tiptext")).display === "block");
    document.body.click();
    check("H dica fecha ao tocar fora", getComputedStyle(tp.querySelector(".tiptext")).display === "none");

    // ---------- H2. Nome de categoria é dado, nunca código executável ----------
    const hostileCat = "atacante');window.__xss=1;//",
      holder = document.createElement("div");
    window.__xss = 0;
    holder.innerHTML = moreButton(hostileCat, 7, 6);
    $("#app").append(holder);
    holder.querySelector("button").click();
    check("H2 categoria com apóstrofo não executa código", window.__xss === 0 && expanded.has(hostileCat));
    holder.remove();
    expanded.delete(hostileCat);
    delete window.__xss;

    // ---------- I. Robustez ----------
    data.tasks.push({
      id: "quebrado",
      title: "Item quebrado",
      category: "Outros",
      kind: "cost",
      status: "Pendente",
      credits: [{ installments: null }],
    });
    listTasks();
    check(
      "I item com dados quebrados não esvazia a lista",
      document.querySelectorAll("#rows tbody tr[data-id]").length === data.tasks.length,
    );
    data.tasks = data.tasks.filter((t) => t.id !== "quebrado");
    render();

    // ---------- J. Backup ----------
    const json = JSON.stringify(data),
      back = JSON.parse(json);
    check(
      "J backup ida e volta sem migração extra",
      migrate(back) === false && JSON.stringify(back) === json,
    );
  } catch (e) {
    R.push("ERROR " + e.message);
  }
  function moneyFmt(v) {
    return money(v).replace(/\s/g, " ");
  }
  const fails = R.filter((r) => !r.startsWith("PASS")).length;
  return R.join("\n") + `\n\n${R.length - fails} PASS / ${fails} FAIL`;
})();
