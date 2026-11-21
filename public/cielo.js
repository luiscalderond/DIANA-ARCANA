// Cielo estrellado de fondo: estrellas que titilan en capas, nebulosas, estrellas fugaces,
// constelaciones que se dibujan cerca del dedo o el mouse y paralaje al mover o inclinar el celular.
(() => {
  const cv = document.getElementById("cielo");
  if (!cv || !cv.getContext) return;
  const cx = cv.getContext("2d");
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, dpr = 1, estrellas = [], nebulosa = null, fugaces = [];
  const puntero = { x: -1e4, y: -1e4, activo: false };
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  const colores = ["255,255,255", "255,244,220", "220,230,255", "255,226,180", "235,215,255"];

  function crear() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(750, Math.round((W * H) / 1400));
    estrellas = Array.from({ length: n }, () => {
      const capa = Math.random() < 0.6 ? 0 : Math.random() < 0.75 ? 1 : 2;
      return {
        x: Math.random() * W, y: Math.random() * H, capa,
        r: [0.7, 1.1, 1.9][capa] * (0.6 + Math.random() * 0.8),
        c: colores[(Math.random() * colores.length) | 0],
        fase: Math.random() * Math.PI * 2, vel: 0.6 + Math.random() * 1.8, brillo: 0,
      };
    });
    // Nebulosas suaves pintadas una vez.
    nebulosa = document.createElement("canvas");
    nebulosa.width = W * dpr; nebulosa.height = H * dpr;
    const nx = nebulosa.getContext("2d"); nx.scale(dpr, dpr);
    const manchas = [
      [0.15, 0.25, 0.55, "120,70,170", 0.22], [0.85, 0.15, 0.45, "60,90,170", 0.18],
      [0.7, 0.75, 0.6, "150,60,120", 0.16], [0.3, 0.85, 0.4, "217,180,106", 0.07],
    ];
    for (const [px, py, pr, c, a] of manchas) {
      const r = pr * Math.max(W, H), g = nx.createRadialGradient(px * W, py * H, 0, px * W, py * H, r);
      g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(0.5, `rgba(${c},${a * 0.35})`); g.addColorStop(1, `rgba(${c},0)`);
      nx.fillStyle = g; nx.fillRect(0, 0, W, H);
    }
    // Una franja tenue, como la Vía Láctea.
    nx.save(); nx.translate(W / 2, H / 2); nx.rotate(-0.5);
    const vg = nx.createLinearGradient(0, -H * 0.18, 0, H * 0.18);
    vg.addColorStop(0, "rgba(200,190,255,0)"); vg.addColorStop(0.5, "rgba(200,190,255,0.06)"); vg.addColorStop(1, "rgba(200,190,255,0)");
    nx.fillStyle = vg; nx.fillRect(-W * 1.5, -H * 0.18, W * 3, H * 0.36); nx.restore();
  }

  function fugaz() {
    const ang = Math.PI * (0.15 + Math.random() * 0.2), v = 9 + Math.random() * 6;
    fugaces.push({ x: Math.random() * W * 0.8, y: Math.random() * H * 0.4, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 1 });
  }

  function pintar(t) {
    cx.clearRect(0, 0, W, H);
    cx.drawImage(nebulosa, 0, 0, W, H);
    par.x += (par.tx - par.x) * 0.05; par.y += (par.ty - par.y) * 0.05;
    const cercanas = [];
    for (const e of estrellas) {
      const d = [4, 10, 18][e.capa];
      let x = e.x + par.x * d, y = e.y + par.y * d;
      x = ((x % W) + W) % W; y = ((y % H) + H) % H;
      const tw = quieto ? 0.85 : 0.6 + 0.4 * Math.sin(t * 0.001 * e.vel + e.fase);
      let extra = 0;
      if (puntero.activo) {
        const dx = x - puntero.x, dy = y - puntero.y, dist = Math.hypot(dx, dy);
        if (dist < 140) { extra = (1 - dist / 140) * 0.9; if (e.capa > 0) cercanas.push({ x, y, dist }); }
      }
      e.brillo += (extra - e.brillo) * 0.12;
      const a = Math.min(1, tw + e.brillo), r = e.r * (1 + e.brillo * 0.8);
      cx.fillStyle = `rgba(${e.c},${a})`;
      cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.fill();
      if (e.capa === 2 || e.brillo > 0.3) {
        const g = cx.createRadialGradient(x, y, 0, x, y, r * 5);
        g.addColorStop(0, `rgba(${e.c},${0.25 * a})`); g.addColorStop(1, `rgba(${e.c},0)`);
        cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 5, 0, Math.PI * 2); cx.fill();
      }
    }
    // Constelación: une las estrellas más cercanas al puntero.
    if (cercanas.length > 1) {
      cercanas.sort((a, b) => a.dist - b.dist);
      const sel = cercanas.slice(0, 6);
      cx.strokeStyle = "rgba(217,180,106,0.35)"; cx.lineWidth = 0.8; cx.beginPath();
      for (let i = 0; i < sel.length - 1; i++) { cx.moveTo(sel[i].x, sel[i].y); cx.lineTo(sel[i + 1].x, sel[i + 1].y); }
      cx.stroke();
    }
    for (const f of fugaces) {
      const g = cx.createLinearGradient(f.x, f.y, f.x - f.vx * 9, f.y - f.vy * 9);
      g.addColorStop(0, `rgba(255,250,235,${f.vida})`); g.addColorStop(1, "rgba(255,250,235,0)");
      cx.strokeStyle = g; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(f.x, f.y); cx.lineTo(f.x - f.vx * 9, f.y - f.vy * 9); cx.stroke();
      f.x += f.vx; f.y += f.vy; f.vida -= 0.018;
    }
    fugaces = fugaces.filter((f) => f.vida > 0);
  }

  let proxima = 3000;
  function bucle(t) {
    if (!document.hidden) {
      pintar(t);
      if (t > proxima) { fugaz(); proxima = t + 5000 + Math.random() * 9000; }
    }
    requestAnimationFrame(bucle);
  }

  const mover = (x, y) => { puntero.x = x; puntero.y = y; puntero.activo = true; par.tx = (x / W - 0.5) * -2; par.ty = (y / H - 0.5) * -2; };
  addEventListener("pointermove", (e) => mover(e.clientX, e.clientY), { passive: true });
  addEventListener("pointerdown", (e) => mover(e.clientX, e.clientY), { passive: true });
  addEventListener("pointerleave", () => { puntero.activo = false; });
  addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") setTimeout(() => { puntero.activo = false; }, 900); });
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    par.tx = Math.max(-1, Math.min(1, e.gamma / 30)); par.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  }, { passive: true });
  addEventListener("resize", () => { crear(); if (quieto) pintar(0); });

  crear();
  if (quieto) pintar(0); else requestAnimationFrame(bucle);
})();
