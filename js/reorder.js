// Reordenação de pendências (setas e arrastar)
function moveTask(id, step) {
  const i = data.tasks.findIndex((t) => t.id === id),
    j = i + step;
  if (i < 0 || j < 0 || j >= data.tasks.length) return;
  [data.tasks[i], data.tasks[j]] = [data.tasks[j], data.tasks[i]];
  save();
  render();
}
function reorderTask(id, target, after) {
  if (id === target) return;
  const from = data.tasks.findIndex((t) => t.id === id);
  if (from < 0) return;
  const [item] = data.tasks.splice(from, 1);
  const to = data.tasks.findIndex((t) => t.id === target);
  if (to < 0) {
    data.tasks.splice(from, 0, item);
    return;
  }
  data.tasks.splice(to + (after ? 1 : 0), 0, item);
  save();
  render();
}
let dragging = null;
document.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".draghandle");
  if (!handle) return;
  const row = handle.closest("tr");
  dragging = { id: row.dataset.id, handle, target: null, after: false };
  handle.setPointerCapture(e.pointerId);
  row.classList.add("dragging");
  e.preventDefault();
});
document.addEventListener(
  "pointermove",
  (e) => {
    if (!dragging) return;
    e.preventDefault();
    document.querySelectorAll(".drop-target").forEach((r) => r.classList.remove("drop-target"));
    const row = document.elementFromPoint(e.clientX, e.clientY)?.closest("tr[data-id]");
    if (row && row.dataset.id !== dragging.id) {
      dragging.target = row.dataset.id;
      dragging.after = e.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      row.classList.add("drop-target");
    } else dragging.target = null;
    if (e.clientY > innerHeight - 65) window.scrollBy(0, 12);
    if (e.clientY < 65) window.scrollBy(0, -12);
  },
  { passive: false },
);
document.addEventListener("pointerup", () => {
  if (!dragging) return;
  const d = dragging;
  dragging = null;
  document
    .querySelectorAll(".dragging,.drop-target")
    .forEach((r) => r.classList.remove("dragging", "drop-target"));
  if (d.target) reorderTask(d.id, d.target, d.after);
});
document.addEventListener("pointercancel", () => {
  dragging = null;
  document
    .querySelectorAll(".dragging,.drop-target")
    .forEach((r) => r.classList.remove("dragging", "drop-target"));
});
