// Exportação e importação de backup JSON
function backup() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = "espanha-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function restore(input) {
  try {
    const d = JSON.parse(await input.files[0].text());
    if (
      !Number.isFinite(d.rate) ||
      d.rate <= 0 ||
      !Array.isArray(d.tasks) ||
      !Array.isArray(d.income) ||
      !d.tasks.every(
        (t) =>
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          typeof t.category === "string" &&
          t.category.length > 0 &&
          ["BRL", "EUR"].includes(t.currency) &&
          ["Pendente", "Em andamento", "Concluído"].includes(t.status) &&
          Number.isFinite(t.value) &&
          t.value >= 0,
      ) ||
      !d.income.every(
        (i) =>
          typeof i.id === "string" &&
          typeof i.origin === "string" &&
          Number.isFinite(i.value) &&
          i.value >= 0,
      )
    )
      throw Error();
    if (confirm("Importar este backup e substituir os dados atuais?")) {
      data = d;
      categories = [...new Set([...(d.categories || defaultCategories), ...d.tasks.map((t) => t.category)])];
      data.categories = categories;
      save();
      render();
      refreshRate();
      toast("Backup importado");
    }
  } catch {
    alert("Arquivo inválido. Escolha um backup exportado por este app.");
  }
  input.value = "";
}
