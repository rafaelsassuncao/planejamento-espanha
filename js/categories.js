// Gerenciamento de categorias
function manageCategories() {
  const form = $("#form");
  form.innerHTML =
    '<h3>Categorias de pendências</h3><p class="sub">Crie, renomeie ou exclua categorias. Alterações também atualizam as pendências.</p><div id="categorylist"></div><label>Nova categoria<input name="newcategory" required maxlength="70" placeholder="Ex.: Documentos do visto"></label><div class="actions"><button type="button" class="btn" onclick="closeCategories()">Fechar</button><button class="btn primary">Adicionar</button></div>';
  categoryList();
  form.onsubmit = (e) => {
    e.preventDefault();
    const input = form.elements.newcategory,
      v = input.value.trim();
    if (!v) return;
    if (categories.some((c) => c.toLowerCase() === v.toLowerCase())) {
      toast("Essa categoria já existe");
      return;
    }
    categories.push(v);
    data.categories = categories;
    save();
    input.value = "";
    categoryList();
    toast("Categoria criada");
  };
  $("#modal").showModal();
}
function categoryList() {
  $("#categorylist").innerHTML = categories
    .map(
      (c, i) =>
        '<div class="statrow"><span>' +
        esc(c) +
        " <small>(" +
        data.tasks.filter((t) => t.category === c).length +
        ')</small></span><span><button type="button" class="link" onclick="renameCategory(' +
        i +
        ')">Renomear</button><button type="button" class="link" onclick="deleteCategory(' +
        i +
        ')">Excluir</button></span></div>',
    )
    .join("");
}
function renameCategory(i) {
  const old = categories[i],
    answer = prompt("Nome da categoria:", old);
  if (answer === null) return;
  const v = answer.trim();
  if (!v || v.length > 70) return;
  if (categories.some((c, j) => j !== i && c.toLowerCase() === v.toLowerCase())) {
    toast("Essa categoria já existe");
    return;
  }
  categories[i] = v;
  data.tasks.forEach((t) => {
    if (t.category === old) t.category = v;
  });
  if (cat === old) cat = v;
  if (data.folder?.category === old) data.folder.category = v;
  data.categories = categories;
  save();
  categoryList();
}
function deleteCategory(i) {
  if (categories.length === 1) {
    toast("Mantenha pelo menos uma categoria");
    return;
  }
  const old = categories[i],
    used = data.tasks.some((t) => t.category === old);
  if (
    !confirm(
      used
        ? "As pendências desta categoria serão movidas para Outros. Continuar?"
        : "Excluir esta categoria?",
    )
  )
    return;
  categories.splice(i, 1);
  if (used) {
    if (!categories.includes("Outros")) categories.push("Outros");
    data.tasks.forEach((t) => {
      if (t.category === old) t.category = "Outros";
    });
  }
  if (cat === old) cat = "Todas";
  data.categories = categories;
  save();
  categoryList();
}
function closeCategories() {
  $("#modal").close();
  render();
}
