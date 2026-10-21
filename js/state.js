// Constantes, dados iniciais, estado da aplicação, migração e utilitários
const KEY = "espanha-assuncao-v1";
const SCHEMA = 3;
const defaultCategories = [
  "Passagens e transporte",
  "Bagagens e acessórios",
  "Documentos e seguros",
  "Estudos e visto",
  "Moradia",
  "Itens pessoais",
  "Outros",
];
const defaultSources = ["Venda do apartamento", "Reserva pessoal", "Salário"];
const FOLDER_CATEGORY = "Consulado";
const FOLDER_DEADLINE = "2026-11-15";
const STATUSES = ["Pendente", "Em andamento", "Concluído"];
const METHODS = [
  ["pix", "Pix"],
  ["debito", "Cartão de débito"],
  ["credito", "Cartão de crédito"],
  ["transferencia", "Transferência bancária"],
  ["boleto", "Boleto"],
  ["dinheiro", "Dinheiro"],
];
const seed = { rate: 6, income: [], tasks: [] };

const uid = () => crypto.randomUUID(),
  num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0),
  round2 = (n) => Math.round(n * 100) / 100;

// Atualiza dados de versões anteriores sem perder informações; pode rodar mais de uma vez
function migrate(d) {
  const old = d.schema;
  // Guarda neste navegador uma cópia intacta dos dados anteriores à atualização
  if (old !== SCHEMA && (d.tasks?.length || d.income?.length))
    try {
      localStorage.setItem(`${KEY}-antes-v${SCHEMA}`, JSON.stringify(d));
    } catch {}
  d.rate = Number(d.rate) > 0 ? Number(d.rate) : 6;
  d.tasks = Array.isArray(d.tasks) ? d.tasks : [];
  d.income = Array.isArray(d.income) ? d.income : [];
  d.sources = Array.isArray(d.sources) ? d.sources : [];
  // Cartões e contas cadastrados por apelido (sem número, validade ou código)
  d.accounts = Array.isArray(d.accounts) ? d.accounts : [];
  const sourceByName = (name) => {
    let s = d.sources.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!s) d.sources.push((s = { id: uid(), name }));
    return s;
  };
  // Cada "Origem" já cadastrada nas entradas vira uma fonte de dinheiro
  d.income.forEach((i) => {
    i.id ||= uid();
    i.value = num(i.value);
    i.received ??= true;
    i.description ??= "";
    i.notes ??= "";
    i.date ??= "";
    if (i.sourceId === undefined) i.sourceId = i.origin?.trim() ? sourceByName(i.origin.trim()).id : "";
  });
  if (old === undefined) defaultSources.forEach(sourceByName);
  d.folder ??= { category: FOLDER_CATEGORY, deadline: FOLDER_DEADLINE };
  d.categories = [
    ...new Set([...(d.categories || defaultCategories), ...d.tasks.map((t) => t.category).filter(Boolean)]),
  ];
  if (old === undefined && !d.categories.includes(d.folder.category)) d.categories.push(d.folder.category);
  d.tasks.forEach((t) => {
    t.id ||= uid();
    t.title ??= "";
    t.category ||= "Outros";
    t.notes ??= "";
    t.date ??= "";
    if (!STATUSES.includes(t.status)) t.status = "Pendente";
    t.currency = t.currency === "EUR" ? "EUR" : "BRL";
    t.value = num(t.value);
    // Itens antigos sempre tinham valor; valor 0 era exibido como "A definir", não como "Sem custo"
    t.kind ??= "cost";
    t.priceKnown ??= t.value > 0;
    t.multi ??= false;
    t.qty = Math.max(1, num(t.qty) || 1);
    t.unit ??= "";
    t.unitPrice = t.unitPrice === undefined || t.unitPrice === "" ? null : t.unitPrice;
    t.plan ??= [];
    t.purchases ??= [];
    t.payments ??= [];
    t.alloc ??= [];
    t.credits ??= [];
    for (const k of ["plan", "purchases", "payments", "alloc", "credits"])
      t[k] = Array.isArray(t[k]) ? t[k].filter((x) => x && typeof x === "object") : [];
    t.credits.forEach(
      (c) => (c.installments = Array.isArray(c.installments) ? c.installments.filter(Boolean) : []),
    );
    t.title = String(t.title ?? "");
    t.notes = String(t.notes ?? "");
    t.category = String(t.category);
    t.method ??= "";
    t.accountId ??= "";
    t.acquired ??= false;
    // Tipo do valor: "estimado" (média pesquisada) ou "confirmado" (orçamento/oficial); vazio = não informado
    t.valueType ??= "";
    t.valueNote ??= "";
    // O lembrete de andamento foi descontinuado: remove o texto antigo
    delete t.progressNote;
    // Etapas da pendência (ex.: tirar cópia → autenticar), com prazo opcional por etapa
    t.steps = Array.isArray(t.steps)
      ? t.steps
          .filter((s) => s && s.text)
          .map((s) => ({ id: s.id || uid(), text: String(s.text), done: !!s.done, date: s.date || "" }))
      : [];
    t.required ??= t.category === d.folder.category;
    // "Já foi pago" antigo vira um pagamento registrado, com a cotação vigente na migração
    if (t.paid !== undefined) {
      if (t.paid && !t.payments.length) {
        const rate = t.currency === "EUR" ? d.rate : 1;
        if (t.value > 0)
          t.payments.push({
            id: uid(),
            date: "",
            amount: t.value,
            rate,
            brl: round2(t.value * rate),
            split: [],
            notes: "Registrado automaticamente a partir do antigo “Já foi pago”.",
          });
        else t.legacyPaid = true;
      }
      delete t.paid;
    }
    t.payments.forEach((p) => {
      p.method ??= "";
      p.accountId ??= "";
      p.confirmed ??= true;
      p.split = Array.isArray(p.split) ? p.split.filter(Boolean) : [];
    });
  });
  d.schema = SCHEMA;
  return old !== SCHEMA;
}

let data;
try {
  data = JSON.parse(localStorage.getItem(KEY)) || structuredClone(seed);
} catch {
  data = structuredClone(seed);
}
migrate(data);
let categories = data.categories;
let page = "overview",
  search = "",
  filter = "Não concluídos",
  cat = "Todas",
  due = "Todos",
  sort = "manual",
  costF = "Todos";
// Pendências marcadas pelo usuário para somar (vazio = soma tudo o que está na lista)
const selected = new Set();
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
const money = (v, c = "BRL") => new Intl.NumberFormat("pt-BR", { style: "currency", currency: c }).format(v),
  sum = (a) => a.reduce((s, n) => s + n, 0);

// Datas "AAAA-MM-DD" são lidas no fuso local, para o prazo não aparecer no dia anterior
const parseDate = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  },
  isoDate = (n) =>
    `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`,
  todayStr = () => isoDate(new Date()),
  // Soma meses mantendo o dia (ou o último dia do mês, se ele não existir)
  addMonths = (s, k) => {
    const [y, m, d] = s.split("-").map(Number);
    return isoDate(new Date(y, m - 1 + k, Math.min(d, new Date(y, m + k, 0).getDate())));
  },
  daysUntil = (s) => Math.round((parseDate(s) - parseDate(todayStr())) / 864e5),
  fmtDate = (s) => (s ? s.split("-").reverse().join("/") : "");

function saveLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    alert("Não foi possível salvar. Exporte um backup antes de sair.");
  }
  window.cloudSave?.(data);
}
// Substitui os dados atuais pelos recebidos da nuvem ou de um backup; indica se houve migração
function setData(d) {
  const migrated = migrate(d);
  data = d;
  categories = d.categories;
  if (cat !== "Todas" && !categories.includes(cat)) cat = "Todas";
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
  return migrated;
}
// Aviso rápido; como "popover", aparece por cima até de um painel aberto
function toast(s, action) {
  const el = $("#toast");
  el.textContent = s;
  if (action) {
    const b = document.createElement("button");
    b.className = "toastbtn";
    b.textContent = action.label;
    b.onclick = () => {
      el.hidePopover?.();
      action.fn();
    };
    el.append(" ", b);
  }
  try {
    el.hidePopover();
    el.showPopover();
  } catch {}
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.hidePopover?.(), action ? 6000 : 3500);
}
