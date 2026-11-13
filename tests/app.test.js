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
  // Etapas visíveis da pendência: faixa abaixo da linha (computador) ou dentro do card (celular)
  const stepsBox = (t) =>
    [document.querySelector(`#rows [data-for="${t.id}"]`), row(t)].find(
      (el) =>
        el &&
        el.querySelector(".stepbar, .stepsopen, .stepadd") &&
        el.offsetParent !== null &&
        [...el.querySelectorAll(".stepbar, .stepadd")].some((x) => x.offsetParent),
    );
  const plus = (n) => isoDate(new Date(Date.now() + n * 864e5));
  const listTasks = () => {
    page = "tasks";
    cat = "Todas";
    filter = "Todos";
    due = "Todos";
    costF = "Todos";
    search = "";
    sort = "manual";
    selected.clear();
    render();
  };
  try {
    // ---------- A. Migração dos dados antigos (vindos da nuvem) ----------
    const t1 = T("Passagens"),
      t3 = T("Seguro");
    check("A schema atual", data.schema === 3);
    check("A 'Já foi pago' antigo vira pagamento", t1.payments.length === 1 && t1.payments[0].brl === 9000);
    check("A valor 0 antigo fica 'a definir'", t3.kind === "cost" && !t3.priceKnown);
    check("A entradas viram fontes", sourceName(data.income[0].sourceId) === "Venda do apartamento");
    check("A pasta com prazo 15/11/2026", data.folder.deadline === "2026-11-15");
    check("A migração gravou na nuvem com versão", __mock.server.schema === 3 && __mock.server.rev >= 1);
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
    check(
      "B linha mostra valor e 'estimado'",
      row(at()).querySelector(".c-val").textContent.includes("50,00") &&
        row(at()).textContent.includes("estimado"),
    );
    check(
      "B prazo próprio com data legível",
      /\d+ [a-z]{3} \d{4}/.test(row(at()).querySelector(".c-due").textContent),
    );
    row(at()).querySelector('.rowmenu [data-act="edit"]').click();
    check("B 'Editar' abre o formulário", $("#modal").open && F().elements.title.value === "Atestado médico");
    set("notes", "levar ao cartório");
    submit();
    check("B edição salva", at().notes === "levar ao cartório");

    // ---------- C. Andamento ----------
    listTasks();
    const sel = (t, v) => {
      const el = row(t).querySelector(".statussel");
      el.value = v;
      el.dispatchEvent(new Event("change"));
    };
    sel(at(), "Em andamento");
    check("C muda andamento direto, sem janela", at().status === "Em andamento" && !$("#modal").open);
    filter = "Não concluídos";
    render();
    sel(at(), "Concluído");
    check(
      "C concluída some da lista e oferece desfazer",
      !row(at()) && $("#toast").textContent.includes("ocultada"),
    );
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
      "D linha mostra próxima etapa e bolinhas",
      stepsBox(at()).querySelector(".stepbar").textContent.includes("Médico assinar") &&
        stepsBox(at()).querySelectorAll(".dots i.on").length === 1,
    );
    stepsBox(at()).querySelector(".stepdo").click();
    check(
      "D '✓ Feito' conclui a próxima com um clique",
      at().steps[1].done &&
        stepsBox(at()).querySelector(".stepbar").textContent.includes("Reconhecer firma") &&
        $("#toast").textContent.includes("Etapa feita"),
    );
    $("#toast").querySelector(".toastbtn").click();
    check("D desfazer a etapa", !at().steps[1].done);
    stepsBox(at()).querySelector(".stepdo").click();
    stepsBox(at()).querySelector(".stepdo").click();
    check(
      "D última etapa conclui a pendência",
      at().status === "Concluído" && $("#toast").textContent.includes("etapas feitas"),
    );
    $("#toast").querySelector(".toastbtn").click();
    check("D desfazer a conclusão", at().status === "Em andamento");
    stepsBox(at()).querySelector(".steptoggle").click();
    check(
      "D etapas abrem na linha, sem janela",
      !$("#modal").open && stepsBox(at()).querySelectorAll(".steprowi").length === 3,
    );
    stepsBox(at()).querySelectorAll(".steprowi input")[2].click();
    check("D desmarcar direto na lista", !at().steps[2].done && !!stepsBox(at()).querySelector(".stepsopen"));
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
    row(noSteps).querySelector(".addsteps").click();
    check(
      "D '+ etapas' abre o campo com cursor",
      document.activeElement === stepsBox(noSteps).querySelector(".stepadd [name=newStep]"),
    );
    stepsBox(noSteps).querySelector(".stepadd [name=newStep]").value = "Tirar cópia";
    stepsBox(noSteps).querySelector(".stepadd .btn").click();
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
    check(
      "E sem prazo próprio não repete o prazo da pasta",
      !row(folderItem()).querySelector(".c-due .date"),
    );
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
    const pick = [T("Passagens"), at()];
    pick.forEach((t) => row(t).querySelector("input.sel").click());
    check(
      "E soma só as marcadas",
      sumText().includes(moneyFmt(totals(pick).total)) &&
        document.querySelector(".sumnote").textContent.includes("2 de"),
    );
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
    const before = totals(data.tasks.filter((t) => t.category === owe.category)).total;
    const sel2 = row(owe).querySelector(".statussel");
    sel2.value = "Concluído";
    sel2.dispatchEvent(new Event("change"));
    check(
      "E2 concluir avisa o que falta pagar",
      $("#toast").textContent.includes("Falta pagar") &&
        [...$("#toast").querySelectorAll(".toastbtn")].some((x) => x.textContent === "Registrar pagamento"),
    );
    check(
      "E2 concluída oculta continua no total do topo",
      !row(owe) && document.querySelector("#sum .sumcard").textContent.replace(/\s/g, " ").includes(moneyFmt(totals(data.tasks.filter((t) => cat === "Todas" || t.category === cat)).total)),
    );
    check(
      "E2 categoria mostra pago de total",
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
    check(
      "E2 'Marcar pago' na linha abre o pagamento",
      (row(owe).querySelector(".paylink").click(), $("#modal").open && $("#modal").textContent.includes("Registrar pagamento")),
    );
    $("#modal").close();
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
    const venda = S("Venda do apartamento").id;
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
      "G card da pasta na visão geral, sem lista",
      !!document.querySelector(".folder .barrow") && !document.querySelector(".folder .checkrow"),
    );
    [...document.querySelectorAll(".folder button")]
      .find((b) => b.textContent.startsWith("Ver pendências"))
      .click();
    check("G atalho abre as pendências da pasta", page === "tasks" && cat === "Consulado");

    // ---------- H. Visão geral ----------
    page = "overview";
    render();
    check("H visão geral sem bloco de abertura", !document.querySelector(".hero"));
    const nx = [...document.querySelectorAll(".nextrow")];
    check("H até 5 próximas pendências", nx.length > 0 && nx.length <= 5);
    nx[0].click();
    check(
      "H clicar leva para pendências e destaca",
      page === "tasks" && !!document.querySelector("#rows tr.flash"),
    );

    const tp = document.querySelector(".tip");
    tp.click();
    check("H dica ⓘ abre ao tocar", getComputedStyle(tp.querySelector(".tiptext")).display === "block");
    document.body.click();
    check("H dica fecha ao tocar fora", getComputedStyle(tp.querySelector(".tiptext")).display === "none");

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
