// The hero's rising poison, live: a port of the game's tide (lib/game/frame/layers/tide_sim.dart and tide_layer.dart in
// the CoconutRocket repo), in the same game px as the rest of the scene (390 wide, y down).
//
// The surface is 80 columns, each with a height h and a speed v, run by the damped 1D wave equation
//
//   dv/dt = c² · ∂²h/∂x² − k·h − d·v        dh/dt = v
//
// at a fixed 1/120 s step (semi-implicit Euler), with a little viscosity on the speeds and a Catmull-Rom curve through
// the columns. The jungle's walls are the ends, so ripples bounce off the rock. Spouts, coins falling in and droplets
// landing are pushes on the speeds. That is a few hundred multiply-adds a frame, and nothing runs while the scene is
// out of view or the tab is hidden.
window.createPoison = function createPoison(canvas, opts) {
  const W = opts.W, TOP = opts.top, REST = opts.rest, H = opts.H;
  const walls = opts.walls; // {y0, step, L, R}: the rock's inner edges every [step] game px from y0 down
  const ctx = canvas.getContext('2d');

  const PAL = {
    glow: [196, 84, 255], back: [92, 22, 140], lip: [236, 150, 255], top: [192, 78, 246], mid: [134, 40, 206],
    deep: [78, 14, 140], abyss: [36, 4, 70], rim: [250, 196, 255], hi: [255, 244, 255], vein: [255, 120, 236],
    fume: [176, 96, 236],
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${(a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3)})`;
  const hh = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
  const fract = v => v - Math.floor(v);
  const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const TAU = Math.PI * 2;

  // ---- the fluid ----
  const X0 = -40, X1 = W + 40, N = 80, DX = (X1 - X0) / (N - 1);
  const C = 230, K = 5, DAMP = 1.4, GRAVITY = 1100, VISC = 0.12, SDT = 1 / 120;
  const h = new Float64Array(N), v = new Float64Array(N), vs = new Float64Array(N);
  const drops = [];
  let seed = 0x2f6b1d, acc = 0;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const col = x => Math.max(0, Math.min(N - 1, Math.round((x - X0) / DX)));

  function wallAt(y) {
    const i = Math.max(0, Math.min(walls.L.length - 1, Math.round((y - walls.y0) / walls.step)));
    return [walls.L[i], walls.R[i]];
  }
  const [wl, wr] = wallAt(REST);
  const lo = col(wl), hi = Math.max(lo + 1, col(wr));

  // the surface height (up is positive) at x
  function at(x) {
    const u = Math.max(0, Math.min(N - 1, (x - X0) / DX));
    const i = Math.min(N - 2, Math.floor(u)), f = u - i;
    const p0 = h[i > 0 ? i - 1 : i], p1 = h[i], p2 = h[i + 1], p3 = h[i + 2 < N ? i + 2 : i + 1];
    return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
  }
  function push(x, dv, width) {
    const c0 = (x - X0) / DX, r = Math.ceil(width * 2.2 / DX), w2 = (width / DX) ** 2;
    for (let i = Math.floor(c0 - r); i <= Math.ceil(c0 + r); i++) {
      if (i < lo || i > hi) continue;
      const d = i - c0;
      v[i] += dv * Math.exp(-d * d / w2);
    }
  }
  function spray(x, count, speed, spread) {
    for (let i = 0; i < count && drops.length < 90; i++) {
      const a = (rand() - 0.5) * spread, sp = speed * (0.6 + 0.6 * rand());
      drops.push({ x: x + (rand() - 0.5) * 6, alt: at(x) + 2, vx: Math.sin(a) * sp, va: Math.cos(a) * sp, r: 1.8 + 2.2 * rand() });
    }
  }
  function simStep(dt, t, ambient) {
    acc += Math.min(dt, 0.05);
    const cc = C * C / (DX * DX);
    while (acc >= SDT) {
      acc -= SDT;
      v[lo] += ambient * 22 * Math.sin(t * 1.7) * SDT * 60;
      v[hi] += ambient * 22 * Math.sin(t * 1.3 + 2) * SDT * 60;
      if (rand() < ambient * 4 * SDT) push(X0 + (lo + (hi - lo) * rand()) * DX, (rand() - 0.4) * 160, 10 + 14 * rand());
      for (let i = lo; i <= hi; i++) {
        const l = i > lo ? h[i - 1] : h[i], r = i < hi ? h[i + 1] : h[i];
        v[i] += (cc * (l + r - 2 * h[i]) - K * h[i] - DAMP * v[i]) * SDT;
      }
      for (let i = lo + 1; i < hi; i++) vs[i] = v[i] + VISC * (v[i - 1] + v[i + 1] - 2 * v[i]);
      for (let i = lo + 1; i < hi; i++) v[i] = vs[i];
      for (let i = lo; i <= hi; i++) h[i] += v[i] * SDT;
      for (let j = drops.length - 1; j >= 0; j--) {
        const d = drops[j];
        d.va -= GRAVITY * SDT;
        d.x += d.vx * SDT;
        d.alt += d.va * SDT;
        if (d.va < 0 && d.alt <= at(d.x)) { push(d.x, d.va * 0.06 * d.r, 5 + d.r); drops.splice(j, 1); }
        else if (d.alt < -400) drops.splice(j, 1);
      }
    }
  }

  // ---- what falls in: a splash and ripples going in, a gulp as it closes over, then a glint sinking away ----
  const sinks = [];
  const SINK_LIFE = 1.6;
  const state = new Map(); // item -> 0 above, 1 half in, 2 under
  let spoutT = 1.5, time = 0;
  const amp = 2.2; // the fine ripple on top of the simulated waves
  const ambient = 0.75;

  function surfaceY(x) { return REST - at(x); }
  function wave(x, t, shift) {
    const u = x + shift, body = -at(x);
    if (!shift) return body + amp * (0.6 * Math.sin(u * 0.11 + t * 5.3) + 0.4 * Math.sin(u * 0.067 - t * 4.1));
    return 0.55 * body + amp * 3 * (0.6 * Math.sin(u * 0.021 + t * 1.2) + 0.4 * Math.sin(u * 0.047 - t * 1.9));
  }

  // [items]: {x, y, r} in game px, falling. Returns nothing; the items keep falling under the body, which hides them.
  function feed(items) {
    for (const it of items) {
      const sy = surfaceY(it.x);
      const was = state.get(it) || 0;
      let now = it.y + it.r * 0.6 < sy ? 0 : it.y - it.r * 0.9 > sy ? 2 : 1;
      if (now < was && it.y > sy - 40) now = was; // (slack, so a wave lapping at it never splashes it twice)
      if (was === 0 && now >= 1) { push(it.x, -420, 10); spray(it.x, 4, 260, 1.2); }
      if (was < 2 && now === 2) { push(it.x, 260, 8); sinks.push({ x: it.x, y: sy + 6, t0: time, r: it.r }); }
      if (it.y < sy - 60) state.delete(it); else state.set(it, now);
    }
  }

  function update(dt) {
    time += dt;
    spoutT -= dt;
    if (spoutT <= 0) {
      spoutT = 0.9 + 1.7 * rand();
      const x = wl + (wr - wl) * (0.15 + 0.7 * rand());
      push(x, 900 + 400 * rand(), 13);
      spray(x, 4 + Math.floor(rand() * 4), 340, 0.7);
    }
    simStep(dt, time, ambient);
    for (let i = sinks.length - 1; i >= 0; i--) if (time - sinks[i].t0 > SINK_LIFE) sinks.splice(i, 1);
  }

  // ---- drawing (the game's layers, in order) ----
  let scale = 1, dpr = 1;
  function resize(s) {
    scale = s;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * s * dpr);
    canvas.height = Math.round((H - TOP) * s * dpr);
  }

  function surfacePath(x0, x1, top, t, a, shift, bottom) {
    const step = 5;
    ctx.beginPath();
    ctx.moveTo(x0, top + wave(x0, t, shift));
    for (let x = x0 + step; x < x1 + step; x += step) ctx.lineTo(x, top + wave(x, t, shift));
    if (bottom != null) { ctx.lineTo(x1 + step, bottom); ctx.lineTo(x0, bottom); ctx.closePath(); }
  }
  function clipToWalls() {
    ctx.beginPath();
    const y0 = TOP, n = walls.L.length;
    ctx.moveTo(walls.L[0], y0);
    for (let i = 0; i < n; i++) ctx.lineTo(walls.L[i], walls.y0 + i * walls.step);
    ctx.lineTo(walls.L[n - 1], H + 2);
    ctx.lineTo(walls.R[n - 1], H + 2);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(walls.R[i], walls.y0 + i * walls.step);
    ctx.lineTo(walls.R[0], y0);
    ctx.closePath();
    ctx.clip();
  }
  function drop(x, y, r, a) {
    if (r <= 0.3 || a <= 0) return;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, rgba(PAL.lip, a)); g.addColorStop(0.7, rgba(PAL.top, a)); g.addColorStop(1, rgba(PAL.mid, a));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(PAL.hi, 0.9 * a);
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.38, r * 0.28, 0, TAU); ctx.fill();
  }

  function draw() {
    const t = time, top = REST, x0 = -10, x1 = W + 10, bottom = H + 60, span = x1 - x0, prox = 0.45;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = scale * dpr;
    ctx.setTransform(k, 0, 0, k, 0, -TOP * k);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    clipToWalls();

    // light thrown up above it
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gh = 230 + 130 * prox;
    const gl = ctx.createLinearGradient(0, top - gh, 0, top + 10);
    gl.addColorStop(0, rgba(PAL.glow, 0));
    gl.addColorStop(0.7, rgba(PAL.glow, 0.12 + 0.1 * prox));
    gl.addColorStop(1, rgba(PAL.glow, 0.3 + 0.18 * prox));
    ctx.fillStyle = gl;
    ctx.fillRect(x0, top - gh, span, gh + 10);
    ctx.restore();

    // slow toxic vapour curling up off it, and glinting motes rising in it
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const ph = fract(t * (0.2 + 0.12 * hh(i, 1)) + hh(i, 2));
      const x = x0 + span * hh(i, 3) + Math.sin(t * 0.7 + i) * 26 * ph;
      const y = top - ph * (130 + 90 * hh(i, 4));
      const r = (24 + 26 * hh(i, 5)) * (0.55 + 0.9 * ph);
      const a = 0.26 * Math.sin(Math.PI * ph) * (0.7 + 0.3 * prox);
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, rgba(PAL.fume, a)); g.addColorStop(0.6, rgba(PAL.fume, a * 0.45)); g.addColorStop(1, rgba(PAL.fume, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const ph = fract(t * (0.22 + 0.2 * hh(i, 11)) + hh(i, 12));
      const x = x0 + span * hh(i, 13) + Math.sin(t * 2 + i) * 10;
      const y = top - ph * (90 + 110 * hh(i, 14));
      const r = 1.6 + 1.6 * hh(i, 15), a = Math.sin(Math.PI * ph);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, rgba(PAL.rim, 0.5 * a)); g.addColorStop(1, rgba(PAL.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    }
    ctx.restore();

    // the back swell, a shade darker, rolling the other way
    const bg = ctx.createLinearGradient(0, top - 22, 0, top + 120);
    bg.addColorStop(0, rgba(PAL.back, 0.95)); bg.addColorStop(1, rgba(PAL.abyss, 1));
    ctx.fillStyle = bg;
    surfacePath(x0, x1, top - 13, -t * 0.8, amp * 1.25, 230, bottom);
    ctx.fill();
    ctx.strokeStyle = rgba(PAL.mid, 0.9);
    ctx.lineWidth = 3;
    surfacePath(x0, x1, top - 13, -t * 0.8, amp * 1.25, 230);
    ctx.stroke();

    // the body
    const body = ctx.createLinearGradient(0, top - amp, 0, top + 320);
    body.addColorStop(0, rgba(PAL.top, 1)); body.addColorStop(0.1, rgba(PAL.mid, 1));
    body.addColorStop(0.45, rgba(PAL.deep, 1)); body.addColorStop(1, rgba(PAL.abyss, 1));
    ctx.fillStyle = body;
    surfacePath(x0, x1, top, t, amp, 0, bottom);
    ctx.fill();

    // inside it: slow currents, rising bubbles, what it swallowed sinking away, and the glossy lip
    ctx.save();
    surfacePath(x0, x1, top, t, amp, 0, bottom);
    ctx.clip();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const dir = i % 2 ? -1 : 1;
      const cx = x0 + span * fract(hh(i, 41) + dir * t * (0.035 + 0.035 * hh(i, 42)));
      const cy = top + 34 + 230 * hh(i, 43);
      const rx = 70 + 90 * hh(i, 44), ry = 4 + 5 * hh(i, 45);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      g.addColorStop(0, rgba(PAL.vein, 0.22)); g.addColorStop(1, rgba(PAL.vein, 0));
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(0.06 * Math.sin(t * 0.6 + i)); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, rx, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    for (let i = 0; i < 20; i++) {
      const ph = fract(t * (0.28 + 0.24 * hh(i, 51)) + hh(i, 52));
      const x = x0 + span * hh(i, 53) + Math.sin(t * 1.8 + i) * 7;
      const y = top + 8 + (1 - ph) * (240 + 80 * hh(i, 54));
      const r = (2.5 + 6.5 * hh(i, 55) * hh(i, 56)) * (0.7 + 0.3 * ph);
      const a = smooth(0, 0.25, ph) * (1 - smooth(0.92, 1, ph));
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, rgba(PAL.lip, 0.05 * a)); g.addColorStop(0.75, rgba(PAL.lip, 0.28 * a)); g.addColorStop(1, rgba(PAL.rim, 0.75 * a));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(PAL.hi, 0.9 * a);
      ctx.beginPath(); ctx.arc(x - r * 0.36, y - r * 0.36, r * 0.24, 0, TAU); ctx.fill();
    }
    for (const s of sinks) {
      const e = time - s.t0, q = e / SINK_LIFE, fade = (1 - q) * (1 - q);
      const x = s.x, y = s.y + 44 * e, rr = Math.max(6, s.r) * (1 - 0.35 * q);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 2.2);
      g.addColorStop(0, `rgba(255,214,90,${(0.75 * fade).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(255,214,90,${(0.3 * fade).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rr * 2.2, 0, TAU); ctx.fill();
      const tw = 0.5 + 0.5 * Math.sin(e * 14 + s.x), sp = rr * (0.9 + 0.5 * tw);
      ctx.strokeStyle = `rgba(255,250,220,${(0.8 * fade * tw).toFixed(3)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - sp, y); ctx.lineTo(x + sp, y); ctx.moveTo(x, y - sp); ctx.lineTo(x, y + sp); ctx.stroke();
      for (let i = 0; i < 3; i++) { // bubbles trailing up off it, bursting at the surface
        const ph = hh(i, Math.floor(s.x) + 31), rise = (e - 0.12 * i) * (150 + 90 * ph);
        if (rise <= 0) continue;
        const bx = x + (ph - 0.5) * 1.6 * rr + 3 * Math.sin(e * 9 + i * 2.1 + ph * 6), by = y - rise;
        if (by < top + wave(bx, t, 0) - 2) continue;
        const br = 2 + 3 * hh(i, Math.floor(s.x) + 47);
        ctx.strokeStyle = rgba(PAL.lip, 0.75 * fade); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.stroke();
        ctx.fillStyle = rgba(PAL.hi, 0.7 * fade);
        ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.3, 0, TAU); ctx.fill();
      }
    }
    const lipG = ctx.createLinearGradient(0, top - 14, 0, top + 24);
    lipG.addColorStop(0, rgba(PAL.lip, 0.85)); lipG.addColorStop(0.45, rgba(PAL.lip, 0.35)); lipG.addColorStop(1, rgba(PAL.lip, 0));
    ctx.fillStyle = lipG;
    ctx.fillRect(x0, top - 80, span, 108);
    ctx.restore();

    // the rim and the shine streaks riding the crests
    ctx.strokeStyle = rgba(PAL.rim, 0.95);
    ctx.lineWidth = 4.5;
    surfacePath(x0, x1, top, t, amp, 0);
    ctx.stroke();
    ctx.strokeStyle = rgba(PAL.hi, 0.85);
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 9; i++) {
      const cx = x0 + span * fract(hh(i, 7) + t * 0.025 * (i % 2 ? -1 : 1)), w = 18 + 26 * hh(i, 8);
      ctx.beginPath();
      for (let j = 0; j <= 8; j++) {
        const x = cx - w / 2 + w * j / 8, y = top + wave(x, t, 0) + 4.5;
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    // blisters swelling on the surface, and their pops
    for (let i = 0; i < 7; i++) {
      const period = 1.1 + 0.9 * hh(i, 71), ph = fract(t / period + hh(i, 72));
      const x = x0 + span * fract(hh(i, 73) + 0.37 * Math.floor(t / period - ph));
      const sy = top + wave(x, t, 0), R = 9 + 10 * hh(i, 74);
      if (ph < 0.78) {
        const r = R * smooth(0, 0.78, ph);
        if (r < 1) continue;
        const g = ctx.createRadialGradient(x - r * 0.3, sy - r * 0.6, r * 0.1, x, sy, r);
        g.addColorStop(0, rgba(PAL.lip, 1)); g.addColorStop(0.6, rgba(PAL.top, 1)); g.addColorStop(1, rgba(PAL.mid, 1));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x, sy + 1.5, r, r * 0.82, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(PAL.rim, 0.9); ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(x, sy + 1.5, r, r * 0.82, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        ctx.fillStyle = rgba(PAL.hi, 0.9);
        ctx.beginPath(); ctx.ellipse(x - r * 0.35, sy - r * 0.45, r * 0.22, r * 0.14, -0.5, 0, TAU); ctx.fill();
      } else {
        const q = (ph - 0.78) / 0.22;
        ctx.strokeStyle = rgba(PAL.rim, 0.8 * (1 - q)); ctx.lineWidth = 2 * (1 - q) + 0.5;
        ctx.beginPath(); ctx.ellipse(x, sy + 1, R * (0.8 + 1.2 * q), R * 0.3 * (0.8 + q), 0, 0, TAU); ctx.stroke();
        for (let d = 0; d < 5; d++) {
          const ang = -Math.PI / 2 + (d - 2) * 0.42 + 0.2 * (hh(i, 80 + d) - 0.5), vv = R * (2.2 + 1.4 * hh(i, 90 + d));
          drop(x + Math.cos(ang) * vv * q, sy + Math.sin(ang) * vv * q + 2.6 * R * q * q, (2.6 + 1.6 * hh(i, 100 + d)) * (1 - 0.6 * q), 1 - q * q);
        }
      }
    }
    for (const d of drops) drop(d.x, REST - d.alt, d.r, 1);
    ctx.restore();
  }

  // let it settle into motion before the first frame
  for (let i = 0; i < 240; i++) update(1 / 60);
  return { resize, update, draw, feed, surfaceY };
};
