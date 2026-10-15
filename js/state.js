// Constantes, dados iniciais, estado da aplicação e utilitários
const KEY = "espanha-assuncao-v1";
const defaultCategories = [
  "Passagens e transporte",
  "Bagagens e acessórios",
  "Documentos e seguros",
  "Estudos e visto",
  "Moradia",
  "Itens pessoais",
  "Outros",
];
const seed = { rate: 6, income: [], tasks: [] };
let data;
try {
  data = JSON.parse(localStorage.getItem(KEY)) || structuredClone(seed);
} catch {
  data = structuredClone(seed);
}
let categories = [
  ...new Set([...(data.categories || defaultCategories), ...data.tasks.map((t) => t.category)]),
];
data.categories = categories;
let page = "overview",
  search = "",
  filter = "Todos",
  cat = "Todas";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
const money = (v, c = "BRL") => new Intl.NumberFormat("pt-BR", { style: "currency", currency: c }).format(v),
  brl = (t) => Number(t.value) * (t.currency === "EUR" ? data.rate : 1),
  sum = (a) => a.reduce((s, n) => s + n, 0),
  total = () => sum(data.income.map((i) => Number(i.value))),
  cost = () => sum(data.tasks.map(brl));
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    alert("Não foi possível salvar. Exporte um backup antes de sair.");
  }
}
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  setTimeout(() => ($("#toast").style.display = "none"), 2500);
}
