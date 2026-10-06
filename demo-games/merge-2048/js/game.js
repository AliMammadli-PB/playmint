const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return this._m?.[k] ?? d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { (this._m ??= {})[k] = v; } } };
const colors = { 2: "#2f3a55", 4: "#35466b", 8: "#1f8f68", 16: "#26b07f", 32: "#3dffb0", 64: "#9dff6b", 128: "#ffd166", 256: "#ffb347", 512: "#ff7b54", 1024: "#ff4f81", 2048: "#c86bff" };
const board = document.getElementById("board"), scoreEl = document.getElementById("score"), bestEl = document.getElementById("best");
let grid, score, best = store.get("merge-2048-best", 0);
const cells = [...Array(16)].map(() => board.appendChild(Object.assign(document.createElement("div"), { className: "cell" })));
function add() {
  const empty = []; grid.forEach((v, i) => !v && empty.push(i));
  if (empty.length) grid[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
}
function render(popped = []) {
  grid.forEach((v, i) => {
    const el = cells[i]; el.textContent = v || ""; el.style.background = v ? colors[v] || "#fff" : "";
    el.style.color = v >= 32 && v <= 512 ? "#10141f" : "#fff"; el.classList.toggle("pop", popped.includes(i));
  });
  scoreEl.textContent = score; bestEl.textContent = best;
  if (popped.length) setTimeout(() => popped.forEach((i) => cells[i].classList.remove("pop")), 90);
}
function slide(line) {
  const vals = line.filter(Boolean), out = [], merged = [];
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); score += vals[i] * 2; merged.push(out.length - 1); i++; }
    else out.push(vals[i]);
  }
  while (out.length < 4) out.push(0);
  return { out, merged };
}
function move(dir) {
  const before = grid.join(), popped = [];
  for (let r = 0; r < 4; r++) {
    const idx = [0, 1, 2, 3].map((c) => dir === "left" ? r * 4 + c : dir === "right" ? r * 4 + 3 - c : dir === "up" ? c * 4 + r : (3 - c) * 4 + r);
    const { out, merged } = slide(idx.map((i) => grid[i]));
    idx.forEach((i, k) => (grid[i] = out[k])); merged.forEach((k) => popped.push(idx[k]));
  }
  if (grid.join() === before) return;
  add();
  if (score > best) { best = score; store.set("merge-2048-best", best); }
  render(popped);
}
function newGame() { grid = Array(16).fill(0); score = 0; add(); add(); render(); }
addEventListener("keydown", (e) => {
  const m = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[e.key];
  if (m) { e.preventDefault(); move(m); }
});
let sx, sy;
addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
});
document.getElementById("new").onclick = newGame;
newGame();
