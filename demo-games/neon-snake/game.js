const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return this._m?.[k] ?? d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { (this._m ??= {})[k] = v; } } };
const N = 24, canvas = document.getElementById("c"), ctx = canvas.getContext("2d"), S = canvas.width / N;
const scoreEl = document.getElementById("score"), bestEl = document.getElementById("best"), overlay = document.getElementById("overlay"), msg = document.getElementById("msg");
let snake, dir, nextDir, food, score, best = store.get("neon-snake-best", 0), running = false, last = 0, speed;
bestEl.textContent = best;

function reset() {
  snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
  dir = nextDir = { x: 1, y: 0 }; score = 0; speed = 110; scoreEl.textContent = 0; placeFood();
}
function placeFood() {
  do { food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
  while (snake.some((s) => s.x === food.x && s.y === food.y));
}
function step() {
  dir = nextDir;
  const head = { x: (snake[0].x + dir.x + N) % N, y: (snake[0].y + dir.y + N) % N };
  if (snake.some((s) => s.x === head.x && s.y === head.y)) return over();
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10; scoreEl.textContent = score; speed = Math.max(55, speed - 2); placeFood();
  } else snake.pop();
}
function over() {
  running = false;
  if (score > best) { best = score; store.set("neon-snake-best", best); bestEl.textContent = best; }
  msg.textContent = "Score " + score + " — play again?"; overlay.classList.remove("hidden");
}
function draw(t) {
  ctx.fillStyle = "#070b14"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#0e1726"; ctx.lineWidth = 1;
  for (let i = 1; i < N; i++) { ctx.beginPath(); ctx.moveTo(i * S, 0); ctx.lineTo(i * S, canvas.height); ctx.moveTo(0, i * S); ctx.lineTo(canvas.width, i * S); ctx.stroke(); }
  const pulse = 0.6 + 0.4 * Math.sin(t / 150);
  ctx.shadowBlur = 20; ctx.shadowColor = "#ff3d8b"; ctx.fillStyle = "rgba(255,61,139," + pulse + ")";
  ctx.beginPath(); ctx.arc(food.x * S + S / 2, food.y * S + S / 2, S * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = "#3dffb0";
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? "#b9ffe4" : "hsl(" + (155 + i * 2) + ",100%," + Math.max(35, 62 - i) + "%)";
    ctx.fillRect(s.x * S + 2, s.y * S + 2, S - 4, S - 4);
  });
  ctx.shadowBlur = 0;
}
function loop(t) {
  if (running && t - last > speed) { last = t; step(); }
  draw(t); requestAnimationFrame(loop);
}
function turn(x, y) { if (x !== -dir.x || y !== -dir.y) nextDir = { x, y }; }
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "arrowup" || k === "w") turn(0, -1);
  else if (k === "arrowdown" || k === "s") turn(0, 1);
  else if (k === "arrowleft" || k === "a") turn(-1, 0);
  else if (k === "arrowright" || k === "d") turn(1, 0);
  else if ((k === " " || k === "enter") && !running) start();
  else return;
  e.preventDefault();
});
let tx, ty;
addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
  Math.abs(dx) > Math.abs(dy) ? turn(Math.sign(dx), 0) : turn(0, Math.sign(dy));
});
function start() { reset(); overlay.classList.add("hidden"); running = true; }
document.getElementById("go").onclick = start;
reset(); requestAnimationFrame(loop);
