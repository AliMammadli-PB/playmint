const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return this._m?.[k] ?? d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { (this._m ??= {})[k] = v; } } };
const c = document.getElementById("c"), ctx = c.getContext("2d");
let W, H, bird, pipes, score, best = store.get("mint-hopper-best", 0), state = "ready", t0 = 0, clouds = [];
function resize() { W = c.width = innerWidth * devicePixelRatio; H = c.height = innerHeight * devicePixelRatio; }
addEventListener("resize", resize); resize();
for (let i = 0; i < 6; i++) clouds.push({ x: Math.random(), y: Math.random() * 0.5, s: 0.5 + Math.random() });
const u = () => H / 100; // world unit
function reset() { bird = { y: 45, v: 0 }; pipes = []; score = 0; t0 = 0; }
function flap() {
  if (state === "ready") { state = "play"; reset(); }
  if (state === "over") { if (performance.now() - t0 > 500) { state = "ready"; reset(); } return; }
  bird.v = -2.2;
}
addEventListener("pointerdown", flap);
addEventListener("keydown", (e) => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); } });
reset();
let last = performance.now();
function frame(now) {
  const dt = Math.min(2, (now - last) / 16.67); last = now;
  const U = u(), birdX = W * 0.28, gap = 30, speed = 0.55 * dt;
  if (state === "play") {
    bird.v += 0.13 * dt; bird.y += bird.v * dt;
    if (!pipes.length || pipes[pipes.length - 1].x < W / U - 45) pipes.push({ x: W / U + 10, gapY: 22 + Math.random() * 50, passed: false });
    for (const p of pipes) {
      p.x -= speed;
      if (!p.passed && p.x * U + 12 * U < birdX) { p.passed = true; score++; }
      const inX = birdX + 3.5 * U > p.x * U && birdX - 3.5 * U < p.x * U + 12 * U;
      if (inX && (bird.y - 3.5 < p.gapY - gap / 2 || bird.y + 3.5 > p.gapY + gap / 2)) die(now);
    }
    pipes = pipes.filter((p) => p.x > -20);
    if (bird.y > 96 || bird.y < 0) die(now);
  } else if (state === "ready") bird.y = 45 + Math.sin(now / 300) * 2;
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0f3443"); g.addColorStop(1, "#34e89e"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,.12)";
  for (const cl of clouds) { cl.x -= 0.0004 * cl.s * dt; if (cl.x < -0.2) cl.x = 1.2; ctx.beginPath(); ctx.ellipse(cl.x * W, cl.y * H, 60 * cl.s * devicePixelRatio, 22 * cl.s * devicePixelRatio, 0, 0, 7); ctx.fill(); }
  // pipes
  for (const p of pipes) {
    ctx.fillStyle = "#0b4f3c"; ctx.strokeStyle = "#3dffb0"; ctx.lineWidth = 0.5 * U;
    const x = p.x * U, w = 12 * U, top = (p.gapY - gap / 2) * U, bot = (p.gapY + gap / 2) * U;
    ctx.fillRect(x, 0, w, top); ctx.strokeRect(x, -10, w, top + 10);
    ctx.fillRect(x, bot, w, H - bot); ctx.strokeRect(x, bot, w, H);
  }
  // bird
  ctx.save(); ctx.translate(birdX, bird.y * U); ctx.rotate(Math.max(-0.5, Math.min(1.2, bird.v * 0.25)));
  ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(0, 0, 3.6 * U, 0, 7); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(1.4 * U, -1 * U, 1.2 * U, 0, 7); ctx.fill();
  ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(1.8 * U, -1 * U, 0.55 * U, 0, 7); ctx.fill();
  ctx.fillStyle = "#ff7b54"; ctx.beginPath(); ctx.moveTo(3 * U, 0); ctx.lineTo(5.4 * U, 0.6 * U); ctx.lineTo(3 * U, 1.4 * U); ctx.fill();
  ctx.restore();
  // text
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "bold " + 9 * U + "px system-ui"; ctx.fillText(score, W / 2, 14 * U);
  ctx.font = "600 " + 3.2 * U + "px system-ui";
  if (state === "ready") ctx.fillText("Tap / Space to hop", W / 2, 70 * U);
  if (state === "over") { ctx.fillText("Game over · best " + best, W / 2, 62 * U); ctx.fillText("Tap to retry", W / 2, 68 * U); }
  requestAnimationFrame(frame);
}
function die(now) {
  state = "over"; t0 = now;
  if (score > best) { best = score; store.set("mint-hopper-best", best); }
}
requestAnimationFrame(frame);
