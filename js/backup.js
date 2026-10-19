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
    // Aceita backups antigos e novos; a migração completa os campos que faltarem
    if (
      !d ||
      !Array.isArray(d.tasks) ||
      !Array.isArray(d.income) ||
      !d.tasks.every((t) => t && typeof t.title === "string") ||
      !d.income.every((i) => i && Number.isFinite(Number(i.value)))
    )
      throw Error();
    if (confirm("Importar este backup e substituir os dados atuais?")) {
      // Mantém a versão atual para o backup poder substituir os dados da nuvem
      d.rev = data.rev;
      setData(d);
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
