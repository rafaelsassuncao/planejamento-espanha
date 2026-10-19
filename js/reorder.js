// Reordenação de pendências (arrastar)
// Aplica a nova ordem das pendências visíveis; as que estão escondidas pelos filtros não mudam de lugar
function applyOrder(ids) {
  const set = new Set(ids),
    slots = data.tasks.flatMap((t, i) => (set.has(t.id) ? [i] : [])),
    byId = Object.fromEntries(data.tasks.map((t) => [t.id, t])),
    next = [...data.tasks];
  ids.forEach((id, k) => (next[slots[k]] = byId[id]));
  data.tasks = next;
  save();
  render();
}

// Arrastar: a linha vira um bloco flutuante que segue o ponteiro; as demais abrem espaço com animação
let drag = null;
const rowIds = (tbody) => [...tbody.children].map((r) => r.dataset.id);
document.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".draghandle");
  if (!handle || e.button > 0) return;
  const row = handle.closest("tr"),
    rect = row.getBoundingClientRect(),
    table = document.createElement("table"),
    clone = row.cloneNode(true);
  table.className = row.closest("table").className + " dragfloat";
  [...clone.children].forEach(
    (td, k) => (td.style.width = row.children[k].getBoundingClientRect().width + "px"),
  );
  Object.assign(table.style, { width: rect.width + "px", left: rect.left + "px", top: rect.top + "px" });
  table.appendChild(document.createElement("tbody")).appendChild(clone);
  document.body.appendChild(table);
  row.classList.add("placeholder");
  drag = {
    row,
    tbody: row.parentElement,
    table,
    dy: e.clientY - rect.top,
    y: e.clientY,
    before: rowIds(row.parentElement),
  };
  try {
    handle.setPointerCapture(e.pointerId);
  } catch {}
  e.preventDefault();
});
function dragTo(y) {
  const { row, tbody, table, dy } = drag;
  drag.y = y;
  table.style.top = y - dy + "px";
  const others = [...tbody.children].filter((r) => r !== row),
    ref =
      others.find((r) => {
        const b = r.getBoundingClientRect();
        return y < b.top + b.height / 2;
      }) || null;
  if (ref === row.nextElementSibling || (!ref && row === tbody.lastElementChild)) return;
  // Animação FLIP: mede antes, move o espaço vazio e anima as linhas até a nova posição
  const tops = new Map(others.map((r) => [r, r.getBoundingClientRect().top]));
  tbody.insertBefore(row, ref);
  others.forEach((r) => {
    const d = tops.get(r) - r.getBoundingClientRect().top;
    if (d)
      r.animate([{ transform: `translateY(${d}px)` }, { transform: "none" }], {
        duration: 160,
        easing: "ease-out",
      });
  });
}
document.addEventListener(
  "pointermove",
  (e) => {
    if (!drag) return;
    e.preventDefault();
    dragTo(e.clientY);
  },
  { passive: false },
);
// Rola a página enquanto o bloco está perto da borda
setInterval(() => {
  if (!drag) return;
  const step = drag.y > innerHeight - 70 ? 14 : drag.y < 70 ? -14 : 0;
  if (step) {
    window.scrollBy(0, step);
    dragTo(drag.y);
  }
}, 30);
function endDrag(cancel) {
  if (!drag) return;
  const { row, tbody, table, before } = drag,
    target = row.getBoundingClientRect();
  drag = null;
  const done = () => {
    table.remove();
    row.classList.remove("placeholder");
    const ids = rowIds(tbody);
    if (cancel) render();
    else if (ids.join() !== before.join()) applyOrder(ids);
  };
  // O bloco desliza até o lugar onde vai ficar antes de ser solto
  const anim = table.animate([{ top: table.style.top }, { top: target.top + "px" }], {
    duration: 140,
    easing: "ease-out",
  });
  anim.onfinish = done;
  anim.oncancel = done;
}
document.addEventListener("pointerup", () => endDrag(false));
document.addEventListener("pointercancel", () => endDrag(true));
