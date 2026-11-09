/* =====================================================================
 * TinyQuit · Minijuego «Minigolf» (v7) — canvas 2D
 * API: window.TQGolf = { mount(el), unmount(), again() }
 * Física en golf_fisica.js (TQGolfPhys), hoyos en golf_hoyos.js (TQGolfHoles).
 * Elige 5, 10 o 15 hoyos. Arrastra hacia atrás desde la bola para apuntar y suelta.
 * Puente: TQ_TR (textos), TQ_BEST (mejor «frente al par»), TQBridge.postMessage({game:'golf', strokes, par, holes, ms}).
 * ===================================================================== */
(function (root) {
  'use strict';
  function TQT(s) { try { const d = root.TQ_TR; return (d && typeof d[s] === 'string' && d[s]) || s; } catch (e) { return s; } }
  function tqSend(o) { try { if (root.TQBridge && root.TQBridge.postMessage) root.TQBridge.postMessage(JSON.stringify(o)); } catch (e) { /* sin app */ } }
  function vib(p) { try { if (root.TQBridge) tqSend({ ev: 'vib', p: p }); else if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  const Ph = root.TQGolfPhys, P = Ph.P;
  const W0 = 330, H0 = 525;
  const FD = '"Fredoka","Trebuchet MS",sans-serif';
  const COL = { ink: '#22324F', muted: '#5B6478', g1: '#8BE39A', g2: '#7DDA8D', rough: '#58B96A', rough2: '#4FAE60', rail: '#FFFFFF', railS: '#2F8A43', sand: '#FFE29A', sandE: '#E6C46A', water: '#8FD3FF', waterE: '#5BB8F0' };
  // ambientes: cada hoyo tiene el suyo (colores del césped, del fondo y su decoración)
  const THEMES = {
    prado:    { g1: '#8BE39A', g2: '#7DDA8D', r1: '#58B96A', r2: '#4FAE60', deco: ['tree', 'flower', 'rock'] },
    desierto: { g1: '#A8DC7E', g2: '#9AD272', r1: '#F2C98A', r2: '#EBBE7A', deco: ['cactus', 'rock', 'cactus'] },
    nieve:    { g1: '#9FE3C2', g2: '#90DAB6', r1: '#EEF5FB', r2: '#E2EDF7', deco: ['pine', 'snowrock', 'pine'] },
    otono:    { g1: '#9BDC8A', g2: '#8DD27D', r1: '#E9A05A', r2: '#DF934C', deco: ['autumn', 'leaf', 'rock'] },
    playa:    { g1: '#8FE3A6', g2: '#80DA99', r1: '#FFE3A8', r2: '#F8D894', deco: ['palm', 'shell', 'palm'] },
    noche:    { g1: '#5FBF86', g2: '#55B47C', r1: '#2C3E66', r2: '#283A60', deco: ['lamp', 'star', 'star'] },
    sakura:   { g1: '#93E2A0', g2: '#85D893', r1: '#F6C9DA', r2: '#F0BCD0', deco: ['cherry', 'petal', 'cherry'] },
  };
  const themeOf = (L) => THEMES[L.theme] || THEMES.prado;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function pill(ctx, txt, x, y, align) {
    ctx.font = `600 13px ${FD}`; const w = ctx.measureText(txt).width + 22, x0 = align === 'right' ? x - w : x;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(ctx, x0, y, w, 26, 13); ctx.fill();
    ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x0 + 11, y + 13.5);
  }
  /** texto centrado en varias líneas (para que nunca se salga de la tarjeta, en ningún idioma) */
  function wrap(ctx, txt, x, y, maxW, lh) {
    const words = String(txt).split(' '), out = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
    if (cur) out.push(cur);
    out.forEach((l, k) => ctx.fillText(l, x, y + (k - (out.length - 1) / 2) * lh));
  }
  /* ---------------------------------------------------------------- sonidos (Web Audio, sin archivos). TQ_SFX === false los apaga */
  let AC = null;
  function ac() { if (root.TQ_SFX === false) return null; try { if (!AC) AC = new (root.AudioContext || root.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } }
  let OUT = null;
  function out(c) { if (!OUT) { const g = c.createGain(), f = c.createBiquadFilter(); g.gain.value = 0.32; f.type = 'lowpass'; f.frequency.value = 1800; g.connect(f).connect(c.destination); OUT = g; } return OUT; }
  function tone(f0, f1, dur, type, vol, delay) { const c = ac(); if (!c) return; const t0 = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g).connect(out(c)); o.start(t0); o.stop(t0 + dur + 0.02); }
  function noise(dur, vol, fc, delay) { const c = ac(); if (!c) return; const t0 = c.currentTime + (delay || 0), n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = buf; f.type = 'bandpass'; f.frequency.value = fc; g.gain.value = vol; f.Q.value = 0.7; src.connect(f).connect(g).connect(out(c)); src.start(t0); }
  const SND = {
    hit: (k) => { tone(420 + k * 120, 260, 0.09, 'sine', 0.5); noise(0.025, 0.12, 1200); },          // «toc» suave del putter
    wall: () => tone(330, 260, 0.06, 'sine', 0.18),                                                  // rebote: «tuc»
    bump: () => tone(300, 480, 0.18, 'sine', 0.35),                                                  // nube: «bup» blandito
    water: () => { noise(0.4, 0.25, 600); tone(380, 180, 0.3, 'sine', 0.15); },                     // ¡al agua! (chapoteo)
    jump: () => tone(280, 560, 0.25, 'sine', 0.25),
    pipe: () => { tone(260, 420, 0.16, 'sine', 0.25); tone(420, 300, 0.16, 'sine', 0.2, 0.18); },  // la nube la traga y la escupe
    lip: () => tone(700, 620, 0.06, 'sine', 0.15),
    sink: () => { tone(520, 420, 0.07, 'sine', 0.4); tone(470, 380, 0.07, 'sine', 0.3, 0.08); tone(430, 350, 0.09, 'sine', 0.22, 0.15); // tac-tac al caer
      [523, 659, 784].forEach((f, i) => tone(f, f, 0.32, 'sine', 0.22, 0.32 + i * 0.1)); },        // y un «ding» alegre y suave
  };
  { const VB = { hit: 30, wall: 15, bump: 20, water: [60, 40, 60], jump: 25, pipe: 20, lip: 25, sink: [30, 40, 90] }; Object.keys(SND).forEach((k) => { const f = SND[k]; SND[k] = (...a) => { if (VB[k]) vib(VB[k]); return f(...a); }; }); }
  // números «aleatorios» fijos por hoyo (para la decoración)
  function seeded(n) { let s = n * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  /* ---------------------------------------------------------------- estado */
  function createState() { return { phase: 'start', t: 0, nHoles: 5, list: [], i: 0, strokes: 0, total: 0, par: 0, msg: '', msgT: 0, ui: { pressed: null }, ms0: 0 }; }
  function pickHoles(n) {
    const bank = root.TQGolfHoles || root.TQGolfDemo || [];
    const sh = (arr) => arr.sort(() => Math.random() - 0.5);
    // reparto por par: 40 % cortos (par 3 o menos), 40 % par 4, 20 % largos (par 5 o más); si falta de uno, de otro
    const cut = n >= bank.length ? bank.map((_, k) => k) : null;
    let out = [];
    if (cut) out = cut;
    else {
      const g = [sh(bank.map((h, k) => k).filter((k) => bank[k].par <= 3)), sh(bank.map((h, k) => k).filter((k) => bank[k].par === 4)), sh(bank.map((h, k) => k).filter((k) => bank[k].par >= 5))];
      const want = [Math.round(n * 0.4), Math.round(n * 0.4)]; want.push(n - want[0] - want[1]);
      g.forEach((gr, j) => { out = out.concat(gr.slice(0, want[j])); });
      const rest = sh(bank.map((_, k) => k).filter((k) => !out.includes(k)));
      while (out.length < n && rest.length) out.push(rest.pop());
    }
    // orden: al azar, sin dos ambientes iguales seguidos y el más largo nunca el primero
    out = sh(out); const res = [];
    while (out.length) { const last = res.length ? bank[res[res.length - 1]].theme : null; let k = out.findIndex((x) => bank[x].theme !== last && (res.length || bank[x].par <= 4)); if (k < 0) k = 0; res.push(out.splice(k, 1)[0]); }
    return res;
  }
  function startPlay(s, n) {
    tqSend({ ev: 'play' });
    s.nHoles = n; s.list = pickHoles(n); s.i = 0; s.total = 0; s.par = 0; s.aces = 0; s.phase = 'play'; s.ms0 = Date.now();
    loadHole(s);
  }
  function hole(s) { const bank = root.TQGolfHoles || root.TQGolfDemo; return bank[s.list[s.i]]; }
  function loadHole(s) {
    const L = hole(s); s.W = Ph.build(L); s.b = Ph.newBall(L); s.ht = 0; s.strokes = 0; s.aim = null; s.drag = null; s.sinkT = 0; s.sinkFrom = null; s.burst = null; s.bumpT = {};
    say(s, TQT(L.name)); s.deco = makeDeco(L, s.list[s.i]);
  }
  function say(s, m, t) { s.msg = m; s.msgT = t || 1.6; }

  /* ---------------------------------------------------------------- bucle */
  function update(s, dt) {
    s.t += dt;
    if (s.msgT > 0) s.msgT -= dt;
    if (s.phase !== 'play') return;
    const b = s.b;
    // la física va a pasos fijos; s.ht = reloj del hoyo (mueve aspas y bloques), siempre al mismo ritmo que la física
    s.acc = Math.min(0.1, (s.acc || 0) + dt);
    while (s.acc >= P.DT) {
      s.acc -= P.DT;
      const px = b.x, py = b.y;
      Ph.step(s.W, b, s.ht); s.ht += P.DT;
      if (b.sunk && !s.sinkFrom) s.sinkFrom = { x: px, y: py };
      if (b.events.length) { onEvents(s, b.events); b.events.length = 0; }
    }
    if (b.splash > 0) b.splash = Math.max(0, b.splash - dt * 1.6);
    if (b.sunk) {
      s.sinkT += dt;
      if (s.sinkT > 1.6) {
        s.total += s.strokes; s.par += hole(s).par; if (s.strokes === 1) s.aces = (s.aces || 0) + 1;
        if (s.i + 1 >= s.list.length) finish(s); else { s.i++; loadHole(s); }
      }
    }
  }
  function onEvents(s, ev) {
    if (ev.includes('water')) { s.strokes++; say(s, TQT('¡Al agua! +1 golpe')); SND.water(); }
    if (ev.includes('wall') && s.t - (s.wallT || 0) > 0.08) { s.wallT = s.t; SND.wall(); }
    if (ev.includes('bump')) { SND.bump(); const L = hole(s); let bi = -1, bd = 1e9; (L.bumpers || []).forEach((p, i) => { const d = Math.hypot(s.b.x - p[0], s.b.y - p[1]) - p[2]; if (d < bd) { bd = d; bi = i; } }); if (bi >= 0) (s.bumpT = s.bumpT || {})[bi] = s.t; }
    if (ev.includes('lip')) SND.lip();
    if (ev.includes('lipout')) say(s, TQT('¡Uy, casi!'), 1.2);
    if (ev.includes('jump')) { say(s, TQT('¡Vuela!'), 0.8); SND.jump(); }
    if (ev.includes('pipe') || ev.includes('portal')) { say(s, TQT('¡Por la nube!'), 0.8); SND.pipe(); s.pipeT = s.t; }
    if (ev.includes('sink')) {
      const L = hole(s), k = s.strokes;
      say(s, TQT(k === 1 ? '¡Hoyo en uno!' : (k < L.par - 1 ? '¡Eagle!' : (k < L.par ? '¡Birdie!' : (k === L.par ? '¡Al par!' : '¡Dentro!')))), 1.4);
      SND.sink(); s.burst = makeBurst(L.cup[0], L.cup[1], k === 1 ? 26 : 16);
    }
  }
  /* ---------------------------------------------------------------- récords por número de hoyos (frente al par)
   * En la app vienen en TQ_GOLF_REC = {5: rel, 10: rel, 15: rel} (null si aún no hay); fuera de la app, en el navegador. */
  function recs() {
    const out = { 5: null, 10: null, 15: null };
    try { const r = root.TQ_GOLF_REC; if (r) for (const k of [5, 10, 15]) if (r[k] != null) out[k] = +r[k]; } catch (e) { /* nada */ }
    try { const l = JSON.parse(root.localStorage.getItem('tq.golf.rec') || '{}'); for (const k of [5, 10, 15]) if (l[k] != null && (out[k] == null || l[k] < out[k])) out[k] = +l[k]; } catch (e) { /* sin almacenamiento */ }
    return out;
  }
  function saveRec(n, rel) {
    const r = recs(); const isNew = r[n] == null || rel < r[n];
    if (isNew) { r[n] = rel; try { root.localStorage.setItem('tq.golf.rec', JSON.stringify(r)); } catch (e) { /* nada */ } if (root.TQ_GOLF_REC) root.TQ_GOLF_REC[n] = rel; }
    return isNew;
  }
  const relTxt = (d) => (d === 0 ? TQT('Al par') : (d < 0 ? '−' + -d : '+' + d));
  /** medalla: bronce (5), plata (10) y oro (15), con el récord debajo */
  function medal(ctx, x, y, n, rel, t, shine) {
    const c = n === 5 ? ['#E3A06B', '#B86F3C'] : (n === 10 ? ['#E4ECF5', '#A9B8CA'] : ['#FFE27A', '#E0A800']);
    ctx.strokeStyle = n === 5 ? '#FF7EB6' : (n === 10 ? '#8FD3FF' : '#7BE88A'); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 5, y - 20); ctx.lineTo(x - 2, y - 8); ctx.moveTo(x + 5, y - 20); ctx.lineTo(x + 2, y - 8); ctx.stroke();
    const k = 1 + (shine ? Math.sin(t * 6) * 0.08 : 0);
    ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(x, y, 11 * k, 0, 7); ctx.fill(); ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(x, y - 0.8, 9 * k, 0, 7); ctx.fill();
    ctx.fillStyle = c[1]; ctx.font = `700 9px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), x, y - 0.5);
    if (rel === undefined) return;
    ctx.fillStyle = rel == null ? COL.muted : (rel <= 0 ? '#1F9E5A' : COL.ink); ctx.font = `${rel == null ? 500 : 700} ${rel == null ? 11 : 14}px ${FD}`;
    ctx.fillText(rel == null ? TQT('sin récord') : relTxt(rel), x, y + 22);
  }
  function finish(s) {
    s.phase = 'over'; s.overT = 0;
    s.newRec = saveRec(s.list.length, s.total - s.par);
    tqSend({ game: 'golf', strokes: s.total, par: s.par, holes: s.list.length, aces: s.aces || 0, ms: Date.now() - s.ms0 });
  }

  /* ---------------------------------------------------------------- dibujo */
  function makeDeco(L, n) {
    const r = seeded(n + 7), out = [];
    for (let k = 0; k < 40; k++) {
      const x = r() * W0, y = 46 + r() * (H0 - 46);
      if (Ph.inPoly(L.shape, x, y)) continue;
      // lejos del césped
      let ok = true; for (const p of L.shape) if (Math.hypot(p[0] - x, p[1] - y) < 10) ok = false;
      const th = themeOf(L).deco, q = r();
      if (ok) out.push({ x, y, k: q < 0.55 ? th[0] : (q < 0.8 ? th[1] : th[2]), s: 0.7 + r() * 0.6, c: ['#FF7EB6', '#FFD23F', '#FFFFFF', '#A68FFF'][Math.floor(r() * 4)] });
    }
    return out;
  }
  function polyPath(ctx, poly) { ctx.beginPath(); poly.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
  function drawCourse(ctx, s) {
    const L = hole(s), t = s.ht;
    // fondo: hierba alta con decoración
    const TH = themeOf(L);
    ctx.fillStyle = TH.r1; ctx.fillRect(-60, -60, W0 + 120, H0 + 120);
    for (let y = -60; y < H0 + 60; y += 26) { ctx.fillStyle = TH.r2; ctx.fillRect(-60, y, W0 + 120, 13); }
    s.deco.forEach((d) => {
      if (d.k === 'tree') { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(d.x, d.y + 10 * d.s, 13 * d.s, 5 * d.s, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2F9E4E'; ctx.beginPath(); ctx.arc(d.x, d.y, 13 * d.s, 0, 7); ctx.fill(); ctx.fillStyle = '#43B862'; ctx.beginPath(); ctx.arc(d.x - 3 * d.s, d.y - 3 * d.s, 8 * d.s, 0, 7); ctx.fill(); }
      else if (d.k === 'flower') { ctx.fillStyle = d.c; for (let a = 0; a < 5; a++) { ctx.beginPath(); ctx.arc(d.x + Math.cos(a * 1.256) * 3, d.y + Math.sin(a * 1.256) * 3, 2.4, 0, 7); ctx.fill(); } ctx.fillStyle = '#FFB000'; ctx.beginPath(); ctx.arc(d.x, d.y, 1.8, 0, 7); ctx.fill(); }
      else if (decoX(ctx, d, t)) { /* dibujado */ }
      else { ctx.fillStyle = '#B9C6D8'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 7 * d.s, 5 * d.s, 0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#D8E2EE'; ctx.beginPath(); ctx.ellipse(d.x - 1.5, d.y - 1.5, 4 * d.s, 2.6 * d.s, 0.3, 0, 7); ctx.fill(); }
    });
    // césped a franjas, con su borde
    ctx.save(); ctx.translate(0, 4); polyPath(ctx, L.shape); ctx.fillStyle = COL.railS; ctx.fill(); ctx.restore();
    ctx.save(); polyPath(ctx, L.shape); ctx.clip();
    for (let y = 0; y < H0; y += 36) { ctx.fillStyle = (y / 36) % 2 ? TH.g2 : TH.g1; ctx.fillRect(0, y, W0, 36); }
    (L.ice || []).forEach((r) => iceZone(ctx, r, t));
    if (L.wind) windLines(ctx, L.wind[0], t);
    // cuestas: tilt (flechas suaves), colina (más clara) y hondonada (más oscura)
    (L.slopes || []).forEach((sl) => {
      if (sl.rect) { const [x, y, w, h] = sl.rect, cx = x + w / 2, cy = y + h / 2, dx = Math.cos(sl.ang), dy = Math.sin(sl.ang), ext = Math.abs(dx) * w / 2 + Math.abs(dy) * h / 2;
        const gr = ctx.createLinearGradient(cx - dx * ext, cy - dy * ext, cx + dx * ext, cy + dy * ext); gr.addColorStop(0, 'rgba(255,255,255,.26)'); gr.addColorStop(1, 'rgba(20,90,40,.16)'); ctx.fillStyle = gr; ctx.fillRect(x, y, w, h); arrows(ctx, x, y, w, h, sl.ang, 'rgba(34,90,50,.22)', t); }
      if (sl.c) {
        const [x, y] = sl.c, r = sl.r, isVolc = sl.g > 0 && Math.hypot(L.cup[0] - x, L.cup[1] - y) < r * 0.3;
        if (isVolc) volcano(ctx, x, y, r, t);
        else if (sl.g > 0) mound(ctx, x, y, r);
        else hollow(ctx, x, y, r);
      }
    });
    (L.water || []).forEach((e) => { ctx.fillStyle = COL.waterE; ctx.beginPath(); ctx.ellipse(e[0], e[1], e[2] + 3, e[3] + 3, 0, 0, 7); ctx.fill(); waterFill(ctx, () => { ctx.beginPath(); ctx.ellipse(e[0], e[1], e[2], e[3], 0, 0, 7); }, t); });
    (L.pond || []).forEach((r) => { ctx.fillStyle = COL.waterE; rr(ctx, r[0] - 3, r[1] - 3, r[2] + 6, r[3] + 6, 12); ctx.fill(); waterFill(ctx, () => rr(ctx, r[0], r[1], r[2], r[3], 10), t); });
    (L.sand || []).forEach((e) => {
      // búnker de forma irregular (la misma que usa la física)
      const path = (grow) => { ctx.beginPath(); for (let k = 0; k <= 48; k++) { const an = (k / 48) * Math.PI * 2, r = Ph.sandR(e, an), x = e[0] + Math.cos(an) * (e[2] * r + grow), y = e[1] + Math.sin(an) * (e[3] * r + grow); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); };
      ctx.fillStyle = COL.sandE; path(2.5); ctx.fill(); ctx.fillStyle = COL.sand; path(0); ctx.fill();
      ctx.save(); path(0); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(e[0] - e[2] * 0.25, e[1] - e[3] * 0.3, e[2] * 0.5, e[3] * 0.35, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(200,150,60,.35)'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(e[0] + Math.cos(k * 2.1) * e[2] * 0.55, e[1] + Math.sin(k * 1.7) * e[3] * 0.55, 1.1, 0, 7); ctx.fill(); } ctx.restore();
    });
    (L.belt || []).forEach((c) => belt(ctx, c, t));
    (L.boost || []).forEach((p) => boost(ctx, p, t));
    (L.bridge || []).forEach((b) => bridge(ctx, b));
    (L.jump || []).forEach((j) => jumpRamp(ctx, j));
    ctx.restore();
    // borde (barandilla blanca)
    polyPath(ctx, L.shape); ctx.lineJoin = 'round'; ctx.strokeStyle = COL.rail; ctx.lineWidth = 6; ctx.stroke();
    // muros, bloques, postes y nubes rebotonas
    (L.walls || []).forEach((w) => { const th = (w[4] == null ? 4 : w[4]) * 2; ctx.lineCap = 'round'; ctx.strokeStyle = COL.railS; ctx.lineWidth = th; ctx.beginPath(); ctx.moveTo(w[0], w[1] + 3); ctx.lineTo(w[2], w[3] + 3); ctx.stroke(); ctx.strokeStyle = COL.rail; ctx.beginPath(); ctx.moveTo(w[0], w[1]); ctx.lineTo(w[2], w[3]); ctx.stroke(); });
    (L.polys || []).forEach((pg) => { ctx.save(); ctx.translate(0, 4); polyPath(ctx, pg); ctx.fillStyle = COL.railS; ctx.fill(); ctx.restore(); polyPath(ctx, pg); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#EAF3FB'; ctx.lineWidth = 2; ctx.stroke(); });
    (L.blocks || []).forEach((b) => { ctx.fillStyle = COL.railS; rr(ctx, b[0], b[1] + 4, b[2], b[3], 6); ctx.fill(); ctx.fillStyle = '#FFFFFF'; rr(ctx, b[0], b[1], b[2], b[3], 6); ctx.fill(); ctx.fillStyle = '#EAF3FB'; rr(ctx, b[0] + 3, b[1] + b[3] - 6, b[2] - 6, 3, 1.5); ctx.fill(); });
    (L.posts || []).forEach((p) => { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(p[0], p[1] + 3, p[2] + 1, 0, 7); ctx.fill(); ctx.fillStyle = '#B9814D'; ctx.beginPath(); ctx.arc(p[0], p[1], p[2] + 1, 0, 7); ctx.fill(); ctx.fillStyle = '#E9B57D'; ctx.beginPath(); ctx.arc(p[0], p[1], p[2] - 1.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#C98B55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p[0], p[1], p[2] * 0.45, 0, 7); ctx.stroke(); });
    (L.bumpers || []).forEach((p, i) => cloudBumper(ctx, p, t, s.bumpT && s.bumpT[i] != null ? s.t - s.bumpT[i] : 9));
    (L.pyramids || []).forEach((q) => pyramid(ctx, q));
    (L.pipe || []).forEach((pp) => cloudPair(ctx, pp[0], pp[1], pp[2], pp[3], pp[4], t, s.pipeT != null ? s.pipeT - (s.t - t) : null));
    (L.portal || []).forEach((pt) => cloudPair(ctx, pt[0], pt[1], pt[2], pt[3], null, t, null));
    // piezas que se mueven
    (L.slider || []).forEach((sl) => {
      const [x, y, w, h, dx, dy, per] = sl, u = Math.sin(((Math.PI * 2) / per) * t), ox = x + (dx * (u + 1)) / 2, oy = y + (dy * (u + 1)) / 2;
      ctx.fillStyle = '#C2410C'; rr(ctx, ox, oy + 3, w, h, 5); ctx.fill(); ctx.fillStyle = '#FF8A3D'; rr(ctx, ox, oy, w, h, 5); ctx.fill();
      ctx.save(); rr(ctx, ox, oy, w, h, 5); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; for (let k = -h; k < w; k += 10) { ctx.beginPath(); ctx.moveTo(ox + k, oy + h); ctx.lineTo(ox + k + h, oy); ctx.stroke(); } ctx.restore();
    });
    (L.mill || []).forEach((m) => mill(ctx, m, t));
    (L.windmill || []).forEach((m) => windmill(ctx, m, t));
    // hoyo con bandera
    const cx = L.cup[0], cy = L.cup[1];
    // el hoyo: borde blanco (como los de verdad) y el agujero oscuro algo más pequeño, para que se vea a la medida de la bola
    const gulp = s.b.sunk ? Math.max(0, Math.sin(Math.min(1, s.sinkT / 0.35) * Math.PI)) * 0.18 : 0, CR = 9.6 * (1 + gulp);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(cx, cy + 1.5, P.CUP + 1.5, P.CUP + 0.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, P.CUP * (1 + gulp), 0, 7); ctx.fill();
    const cg = ctx.createRadialGradient(cx, cy - 3, 1, cx, cy, CR); cg.addColorStop(0, '#0B1226'); cg.addColorStop(1, '#22324F');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, CR, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(cx, cy + 2, CR - 2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.fill();
    if (s.b.sunk) drawSink(ctx, s, cx, cy);
    // la bandera: se levanta cuando la bola se acerca y salta de alegría al entrar
    const jumpUp = s.b.sunk ? Math.max(0, Math.sin(Math.min(1, (s.sinkT - 0.2) / 0.5) * Math.PI)) * 16 : 0;
    flag(ctx, cx, cy, t, Math.hypot(s.b.x - cx, s.b.y - cy) < 50 || s.b.sunk, jumpUp);
  }
  /** decoración de cada ambiente */
  function decoX(ctx, d, t) {
    const x = d.x, y = d.y, k = d.s;
    const shadow = (w) => { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(x, y + 10 * k, w * k, 4 * k, 0, 0, 7); ctx.fill(); };
    const ball = (c, ox, oy, r) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + ox * k, y + oy * k, r * k, 0, 7); ctx.fill(); };
    switch (d.k) {
      case 'cactus': shadow(8); ctx.fillStyle = '#3FA66A'; rr(ctx, x - 4 * k, y - 14 * k, 8 * k, 24 * k, 4 * k); ctx.fill(); rr(ctx, x - 11 * k, y - 6 * k, 6 * k, 10 * k, 3 * k); ctx.fill(); rr(ctx, x + 5 * k, y - 10 * k, 6 * k, 9 * k, 3 * k); ctx.fill(); ball('#FF7EB6', 0, -15, 2.2); return true;
      case 'pine': shadow(10); ctx.fillStyle = '#2E8C5A'; for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x, y - (18 - j * 6) * k); ctx.lineTo(x - (8 + j * 3) * k, y - (4 - j * 6) * k); ctx.lineTo(x + (8 + j * 3) * k, y - (4 - j * 6) * k); ctx.fill(); } ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(x, y - 18 * k); ctx.lineTo(x - 4 * k, y - 12 * k); ctx.lineTo(x + 4 * k, y - 12 * k); ctx.fill(); return true;
      case 'snowrock': ball('#C9D6E6', 0, 0, 7); ball('#FFFFFF', -1, -3, 5); return true;
      case 'autumn': shadow(12); ball('#C8571E', 0, 0, 13); ball('#F08A2C', -3, -3, 8); return true;
      case 'leaf': ctx.fillStyle = d.c === '#FFFFFF' ? '#F2B33D' : '#D9622B'; ctx.beginPath(); ctx.ellipse(x, y, 4 * k, 2.2 * k, (x % 3), 0, 7); ctx.fill(); return true;
      case 'palm': shadow(12); ctx.strokeStyle = '#B9814D'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.moveTo(x, y + 8 * k); ctx.quadraticCurveTo(x + 4 * k, y - 2 * k, x + 2 * k, y - 10 * k); ctx.stroke(); ctx.fillStyle = '#3FB36B'; for (let j = 0; j < 5; j++) { const a = j * 1.256 + 0.3; ctx.beginPath(); ctx.ellipse(x + 2 * k + Math.cos(a) * 7 * k, y - 10 * k + Math.sin(a) * 4 * k, 8 * k, 3 * k, a, 0, 7); ctx.fill(); } return true;
      case 'shell': ctx.fillStyle = '#FFB3A7'; ctx.beginPath(); ctx.arc(x, y, 4 * k, Math.PI, 0); ctx.fill(); return true;
      case 'lamp': shadow(6); ctx.fillStyle = 'rgba(255,230,140,.18)'; ctx.beginPath(); ctx.arc(x, y - 14 * k, 16 * k, 0, 7); ctx.fill(); ctx.strokeStyle = '#1C2846'; ctx.lineWidth = 2.5 * k; ctx.beginPath(); ctx.moveTo(x, y + 8 * k); ctx.lineTo(x, y - 12 * k); ctx.stroke(); ball('#FFE38A', 0, -14, 4.5); return true;
      case 'star': { const tw = 0.5 + 0.5 * Math.sin(t * 2 + x); ctx.fillStyle = `rgba(255,240,180,${0.4 + tw * 0.6})`; ctx.beginPath(); ctx.arc(x, y, 1.6 * k, 0, 7); ctx.fill(); return true; }
      case 'cherry': shadow(12); ball('#E98FB0', 0, 0, 13); ball('#FFC2D6', -3, -3, 8); return true;
      case 'petal': ctx.fillStyle = '#FF9EC0'; ctx.beginPath(); ctx.ellipse(x, y, 3 * k, 1.8 * k, x, 0, 7); ctx.fill(); return true;
    }
    return false;
  }
  function iceZone(ctx, r, t) {
    const [x, y, w, h] = r; ctx.fillStyle = '#D6F1FF'; rr(ctx, x, y, w, h, 10); ctx.fill(); ctx.strokeStyle = '#A9DDF7'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); rr(ctx, x, y, w, h, 10); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; for (let k = -h; k < w + h; k += 34) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h * 0.6, y); ctx.stroke(); } ctx.restore();
  }
  function windLines(ctx, ang, t) {
    const dx = Math.cos(ang), dy = Math.sin(ang); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let k = 0; k < 14; k++) { const ph = ((t * 0.5 + k * 0.137) % 1), bx = ((k * 97) % 330), by = 60 + ((k * 61) % 440), px = bx + dx * (ph * 120 - 60), py = by + dy * (ph * 120 - 60);
      ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + dx * 10 - dy * 3, py + dy * 10 + dx * 3, px + dx * 22, py + dy * 22); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  /** nube que traga la bola (A) y otra que la escupe (B) en la dirección de la flecha */
  function cloudPair(ctx, ax, ay, bx, by, ea, t, hitT) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.setLineDash([2, 9]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    const pop = hitT != null ? Math.max(0, 1 - (t - hitT) * 4) : 0;
    for (const [x, y, out] of [[ax, ay, 0], [bx, by, 1]]) {
      const k = 1 + Math.sin(t * 2.2 + x) * 0.03 + pop * 0.15;
      puff(ctx, x, y + 2, 40 * k, '#FFFFFF', out ? '#BFE3FF' : '#D9CCFF');
      ctx.fillStyle = out ? '#3BA0E6' : '#5A3FD0'; ctx.beginPath(); ctx.ellipse(x, y + 4, 8.5, 6.5, 0, 0, 7); ctx.fill();   // boca
      ctx.fillStyle = '#1B2440'; ctx.beginPath(); ctx.ellipse(x, y + 5, 5.5, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(x - 7, y - 4, 1.5, 0, 7); ctx.arc(x + 7, y - 4, 1.5, 0, 7); ctx.fill();   // ojitos
    }
    if (ea != null) { const dx = Math.cos(ea), dy = Math.sin(ea), px = bx + dx * 26, py = by + dy * 26 + 2, o = ((t * 2) % 1) * 4; ctx.strokeStyle = '#3BA0E6'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(px + dx * o - dx * 5 - dy * 5, py + dy * o - dy * 5 + dx * 5); ctx.lineTo(px + dx * o + dx * 2, py + dy * o + dy * 2); ctx.lineTo(px + dx * o - dx * 5 + dy * 5, py + dy * o - dy * 5 - dx * 5); ctx.stroke(); }
  }
  /** volcán: cono de roca con lava en el cráter (donde está el hoyo) y humo */
  function volcano(ctx, x, y, r, t) {
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#E9A86A'); g.addColorStop(0.55, '#C9763E'); g.addColorStop(0.9, '#9C5A2E'); g.addColorStop(1, 'rgba(110,70,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    // aristas de roca que bajan desde el cráter
    ctx.strokeStyle = 'rgba(90,50,25,.28)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let k = 0; k < 10; k++) { const a = k * 0.628 + 0.2, r0 = 22 + (k % 3) * 3, r1 = r * (0.8 + (k % 2) * 0.12); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.quadraticCurveTo(x + Math.cos(a + 0.12) * (r0 + r1) / 2, y + Math.sin(a + 0.12) * (r0 + r1) / 2, x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
    // cráter con borde de lava que late
    const glow = 0.55 + 0.25 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(255,110,40,${glow})`; ctx.beginPath(); ctx.arc(x, y, 21, 0, 7); ctx.fill();
    ctx.fillStyle = '#7A3E1E'; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill();
    // humo
    for (let k = 0; k < 3; k++) { const ph = (t * 0.35 + k / 3) % 1, sx = x - 18 + k * 8 + Math.sin(t + k) * 4, sy = y - 26 - ph * 50; ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - ph)})`; ctx.beginPath(); ctx.arc(sx, sy, 5 + ph * 9, 0, 7); ctx.fill(); }
  }
  /** colina de césped: luz arriba a la izquierda, sombra abajo a la derecha */
  function mound(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.42)'); g.addColorStop(0.6, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(20,90,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    const sh = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.5, x, y, r); sh.addColorStop(0, 'rgba(20,90,40,0)'); sh.addColorStop(0.85, 'rgba(20,90,40,.16)'); sh.addColorStop(1, 'rgba(20,90,40,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  /** hondonada: se ve hundida (sombra en el borde de arriba, luz en el de abajo) y la bola se queda dentro */
  function hollow(ctx, x, y, r) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
    const g = ctx.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, 'rgba(15,70,35,.30)'); g.addColorStop(0.7, 'rgba(15,70,35,.14)'); g.addColorStop(1, 'rgba(15,70,35,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const l = ctx.createLinearGradient(x - r * 0.7, y - r * 0.7, x + r * 0.7, y + r * 0.7); l.addColorStop(0, 'rgba(10,60,30,.28)'); l.addColorStop(0.5, 'rgba(10,60,30,0)'); l.addColorStop(1, 'rgba(255,255,255,.22)');
    ctx.fillStyle = l; ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(10,60,30,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 0.97, Math.PI * 0.95, Math.PI * 1.75); ctx.stroke();
  }
  /** pirámide vista desde arriba: 4 caras con su luz y filas de ladrillos */
  function pyramid(ctx, q) {
    const pts = Ph.pyrPts(q), cx = q[0], cy = q[1], shades = ['#F2D08A', '#E3B465', '#C99446', '#DDB066'];
    ctx.fillStyle = 'rgba(90,60,20,.25)'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] + 5, p[1] + 6) : ctx.moveTo(p[0] + 5, p[1] + 6))); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) % 4], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      // la luz viene de arriba a la izquierda: la cara que mira hacia allí es la más clara
      const face = Math.atan2(my - cy, mx - cx), lit = Math.cos(face - Math.PI * 1.25);
      ctx.fillStyle = lit > 0.5 ? shades[0] : (lit > -0.2 ? shades[3] : (lit > -0.7 ? shades[1] : shades[2]));
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
      // ladrillos: líneas paralelas a la base y juntas alternas
      ctx.strokeStyle = 'rgba(120,80,30,.35)'; ctx.lineWidth = 1;
      for (let f = 0.2; f < 1; f += 0.2) { ctx.beginPath(); ctx.moveTo(cx + (a[0] - cx) * f, cy + (a[1] - cy) * f); ctx.lineTo(cx + (b[0] - cx) * f, cy + (b[1] - cy) * f); ctx.stroke(); }
      for (let f = 0.3, row = 0; f < 1; f += 0.2, row++) for (let u = row % 2 ? 0.25 : 0.5; u < 1; u += 0.5) { const p0x = cx + (a[0] - cx) * f, p0y = cy + (a[1] - cy) * f, p1x = cx + (b[0] - cx) * f, p1y = cy + (b[1] - cy) * f, qx = p0x + (p1x - p0x) * u, qy = p0y + (p1y - p0y) * u, k = 0.1; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(qx + (cx - qx) * k * 0.9, qy + (cy - qy) * k * 0.9); ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(150,100,40,.5)'; ctx.lineWidth = 1.2; pts.forEach((p) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.stroke(); });
    ctx.fillStyle = '#FFE7A8'; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 7); ctx.fill();
  }
  /** nube de dibujo (como Tiny, sin cara) */
  function puff(ctx, x, y, w, fill, shade) {
    const k = w / 120, blob = (dy) => { [[-26, 6, 24], [0, -12, 30], [28, 4, 23]].forEach((c) => { ctx.beginPath(); ctx.arc(x + c[0] * k, y + (c[1] + dy) * k, c[2] * k, 0, 7); ctx.fill(); }); rr(ctx, x - 48 * k, y + dy * k, 96 * k, 36 * k, 18 * k); ctx.fill(); };
    ctx.fillStyle = shade; blob(5); ctx.fillStyle = fill; blob(0);
  }
  function waterFill(ctx, path, t) {
    path(); ctx.fillStyle = COL.water; ctx.fill();
    ctx.save(); path(); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let y = 0; y < H0; y += 18) for (let x = ((y / 18) % 2) * 20; x < W0; x += 40) { const o = Math.sin(t * 1.5 + x * 0.05 + y) * 3; ctx.beginPath(); ctx.moveTo(x + o, y); ctx.quadraticCurveTo(x + 6 + o, y - 3, x + 12 + o, y); ctx.stroke(); }
    ctx.restore();
  }
  function arrows(ctx, x, y, w, h, ang, col, t) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const dx = Math.cos(ang), dy = Math.sin(ang), off = (t * 12) % 30;
    for (let yy = y + 15; yy < y + h; yy += 30) for (let xx = x + 15; xx < x + w; xx += 30) { const cx = xx + dx * (off - 15), cy = yy + dy * (off - 15); ctx.beginPath(); ctx.moveTo(cx - dx * 5 - dy * 5, cy - dy * 5 + dx * 5); ctx.lineTo(cx + dx * 3, cy + dy * 3); ctx.lineTo(cx - dx * 5 + dy * 5, cy - dy * 5 - dx * 5); ctx.stroke(); }
    ctx.restore();
  }
  function belt(ctx, c, t) {
    const [x, y, w, h, vx, vy] = c; ctx.fillStyle = '#B9C6D8'; rr(ctx, x, y, w, h, 8); ctx.fill();
    arrows(ctx, x, y, w, h, Math.atan2(vy, vx), '#8A9BB5', t * Math.hypot(vx, vy) / 20);
  }
  function boost(ctx, p, t) {
    const [x, y, w, h, ang] = p; ctx.fillStyle = '#FFD23F'; rr(ctx, x, y, w, h, 10); ctx.fill(); ctx.fillStyle = '#FFE680'; rr(ctx, x + 4, y + 4, w - 8, h - 8, 7); ctx.fill();
    const ph = Math.floor(t * 5) % 3, dx = Math.cos(ang), dy = Math.sin(ang), cx = x + w / 2, cy = y + h / 2;
    for (let k = -1; k <= 1; k++) { const px = cx + dx * k * 13, py = cy + dy * k * 13; ctx.strokeStyle = k + 1 === ph ? '#FF8A1C' : '#E0A800'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px - dx * 6 - dy * 8, py - dy * 6 + dx * 8); ctx.lineTo(px + dx * 5, py + dy * 5); ctx.lineTo(px - dx * 6 + dy * 8, py - dy * 6 - dx * 8); ctx.stroke(); }
  }
  function bridge(ctx, b) {
    const [x, y, w, h] = b; ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x - 2, y + 4, w + 4, h); ctx.fillStyle = '#E9B57D'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#B9814D'; ctx.lineWidth = 1.5; if (h >= w) for (let yy = y + 9; yy < y + h; yy += 9) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); } else for (let xx = x + 9; xx < x + w; xx += 9) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
    ctx.strokeStyle = '#8A5A34'; ctx.lineWidth = 4; ctx.beginPath(); if (h >= w) { ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); } else { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); } ctx.stroke();
  }
  function jumpRamp(ctx, j) {
    const [x, y, w, h, ang] = j, g = ctx.createLinearGradient(x + w / 2 - Math.cos(ang) * h / 2, y + h / 2 - Math.sin(ang) * h / 2, x + w / 2 + Math.cos(ang) * h / 2, y + h / 2 + Math.sin(ang) * h / 2);
    g.addColorStop(0, '#C98B55'); g.addColorStop(1, '#FFD9A8');
    ctx.fillStyle = 'rgba(0,0,0,.18)'; rr(ctx, x, y + 4, w, h, 5); ctx.fill(); ctx.fillStyle = g; rr(ctx, x, y, w, h, 5); ctx.fill();
    ctx.strokeStyle = '#FF5A7A'; ctx.lineWidth = 3; ctx.lineCap = 'round'; const cx = x + w / 2, cy = y + h / 2, dx = Math.cos(ang), dy = Math.sin(ang);
    ctx.beginPath(); ctx.moveTo(cx - dx * 6 - dy * 8, cy - dy * 6 + dx * 8); ctx.lineTo(cx + dx * 5, cy + dy * 5); ctx.lineTo(cx - dx * 6 + dy * 8, cy - dy * 6 - dx * 8); ctx.stroke();
  }
  function portal(ctx, pt, t) {
    for (let j = 0; j < 2; j++) { const x = pt[j * 2], y = pt[j * 2 + 1]; ctx.fillStyle = j ? '#C9B8FF' : '#7A5AF8'; ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.fill(); ctx.fillStyle = j ? '#EFE8FF' : '#4B2FC9'; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); const a = t * 2 * (j ? -1 : 1); ctx.arc(x, y, 15, a, a + 2.2); ctx.stroke(); }
  }
  function cloudBumper(ctx, p, t, since) {
    const [x, y, r] = p, hit = since < 0.25 ? Math.sin((since / 0.25) * Math.PI) : 0, k = 1 + Math.sin(t * 3 + x) * 0.03 + hit * 0.25;
    ctx.save(); ctx.translate(x, y); ctx.scale(k * (1 + hit * 0.1), k * (1 - hit * 0.12));
    puff(ctx, 0, 0, r * 3.1, '#FFFFFF', '#C9D8EA');
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.05, 1.9, 0, 7); ctx.arc(r * 0.3, -r * 0.05, 1.9, 0, 7); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); if (hit > 0.05) ctx.arc(0, r * 0.32, 2.6, 0, 7); else ctx.arc(0, r * 0.18, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255,143,192,.7)'; ctx.beginPath(); ctx.ellipse(-r * 0.62, r * 0.25, 2.6, 1.7, 0, 0, 7); ctx.ellipse(r * 0.62, r * 0.25, 2.6, 1.7, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function mill(ctx, m, t) {
    const [cx, cy, len, per, n] = m;
    for (let k = 0; k < n; k++) {
      const th = ((Math.PI * 2) / per) * t + (k * Math.PI * 2) / n, ex = cx + Math.cos(th) * len, ey = cy + Math.sin(th) * len;
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy + 3); ctx.lineTo(ex, ey + 3); ctx.stroke();
      ctx.strokeStyle = '#9B82FF'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.fillStyle = '#FF8FB0'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
  }
  function windmill(ctx, m, t) {
    const [cx, cy, w, h, tw, per, n] = m, x0 = cx - w / 2, y0 = cy - h / 2;
    // casita (vista desde arriba con su fachada), túnel oscuro y tejado
    ctx.fillStyle = COL.railS; rr(ctx, x0, y0 + 5, w, h, 8); ctx.fill();
    ctx.fillStyle = '#FFF1DC'; rr(ctx, x0, y0, w, h, 8); ctx.fill();
    ctx.fillStyle = '#E0573A'; rr(ctx, x0 - 4, y0 - 6, w + 8, h * 0.45, 8); ctx.fill(); ctx.fillStyle = '#F07B55'; rr(ctx, x0, y0 - 6, w, h * 0.18, 6); ctx.fill();
    const closed = Ph.millClosed(m, t);
    ctx.fillStyle = '#22324F'; rr(ctx, cx - tw / 2, y0 + h * 0.45, tw, h * 0.55 + 1, 6); ctx.fill();
    ctx.fillStyle = closed ? '#FF5A7A' : '#4CD964'; ctx.beginPath(); ctx.arc(cx, y0 + h * 0.3, 4, 0, 7); ctx.fill();
    // aspas (giran delante de la fachada: cuando una pasa por abajo, tapa el túnel)
    const om = (Math.PI * 2) / per, len = h / 2 + 18;
    for (let k = 0; k < n; k++) {
      const a = om * t + (k * Math.PI * 2) / n, dx = Math.cos(a), dy = Math.sin(a);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(10, -5 + 3, len - 10, 10);
      ctx.fillStyle = '#8A5A34'; ctx.fillRect(0, -2, len, 4);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(12, -6, len - 12, 12); ctx.strokeStyle = '#C9B8A6'; ctx.lineWidth = 1.2;
      for (let q = 18; q < len; q += 7) { ctx.beginPath(); ctx.moveTo(q, -6); ctx.lineTo(q, 6); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = '#8A5A34'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
  }
  function flag(ctx, x, y, t, lifted, extra) {
    const up = (lifted ? 10 : 0) + (extra || 0), top = y - 40 - up;
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y - up); ctx.lineTo(x, top); ctx.stroke();
    const w = Math.sin(t * 4) * 2.5; ctx.fillStyle = '#FF5A7A'; ctx.beginPath(); ctx.moveTo(x, top); ctx.quadraticCurveTo(x + 11, top + 3 + w, x + 22, top + 6); ctx.lineTo(x, top + 13); ctx.closePath(); ctx.fill();
  }
  /** la bola cae dentro: va hacia el centro haciéndose pequeña y oscura; luego, anillo y confeti */
  function makeBurst(x, y, n) { const out = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, v = 60 + Math.random() * 90; out.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, c: ['#FFD23F', '#FF7EB6', '#7BE88A', '#8FD3FF', '#A68FFF'][i % 5], r: 2 + Math.random() * 2, rot: Math.random() * 6 }); } return out; }
  function drawSink(ctx, s, cx, cy) {
    const T = s.sinkT, f = s.sinkFrom || { x: cx, y: cy };
    if (T < 0.3) { // la bola cae
      const u = T / 0.3, e = u * u, x = f.x + (cx - f.x) * Math.min(1, u * 1.6), y = f.y + (cy - f.y) * Math.min(1, u * 1.6), r = P.R * (1 - e * 0.55);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, P.CUP, 0, 7); ctx.clip();
      const g = ctx.createRadialGradient(x - 2, y - 2.5, 0.5, x, y, r); g.addColorStop(0, `rgba(255,255,255,${1 - e * 0.6})`); g.addColorStop(1, `rgba(150,170,200,${1 - e * 0.5})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
    }
    if (T > 0.25) { // anillo que se abre y confeti
      const u = Math.min(1, (T - 0.25) / 0.6);
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - u)})`; ctx.lineWidth = 4 * (1 - u) + 1; ctx.beginPath(); ctx.arc(cx, cy, P.CUP + u * 34, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(255,210,63,${0.8 * (1 - u)})`; ctx.lineWidth = 3 * (1 - u) + 0.5; ctx.beginPath(); ctx.arc(cx, cy, P.CUP + u * 20, 0, 7); ctx.stroke();
      (s.burst || []).forEach((p) => { const dt = T - 0.25; const x = p.x + p.vx * dt, y = p.y + p.vy * dt + 160 * dt * dt; ctx.globalAlpha = Math.max(0, 1 - dt / 1.2); ctx.fillStyle = p.c; ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + dt * 6); ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2); ctx.restore(); });
      ctx.globalAlpha = 1;
    }
  }
  function drawBall(ctx, s) {
    const b = s.b; if (b.sunk) return;
    const lift = b.air > 0 ? Math.min(14, b.air * 50) : 0, sink = b.over ? Math.min(1, b.z / P.R) : 0;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(b.x + 1 + lift * 0.6, b.y + 3 + lift, P.R * (1 - sink * 0.3), P.R * 0.7, 0, 0, 7); ctx.fill();
    const r = P.R * (1 + lift / 40) * (1 - sink * 0.25);
    const sk = root.TQ_BALL; // 7.3: bola de la racha elegida en el armario o en el golf
    if (sk && sk !== 'clasica' && root.TQBalls) { b.rot = (b.rot || 0) + Math.hypot(b.x - (b.px ?? b.x), b.y - (b.py ?? b.y)) / Math.max(1, r); b.px = b.x; b.py = b.y;
      ctx.save(); ctx.translate(b.x, b.y - lift); ctx.rotate(b.rot); ctx.drawImage(root.TQBalls.icon(sk, 64), -r, -r, 2 * r, 2 * r); ctx.restore(); }
    else {
    const g = ctx.createRadialGradient(b.x - 2, b.y - lift - 2.5, 0.5, b.x, b.y - lift, r); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#D9E6F5');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y - lift, r, 0, 7); ctx.fill();
    }
    if (b.splash > 0) { ctx.strokeStyle = `rgba(255,255,255,${b.splash})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, 8 + (1 - b.splash) * 22, 0, 7); ctx.stroke(); }
  }
  function drawAim(ctx, s) {
    if (!s.aim) return; const b = s.b, len = Math.hypot(s.aim.x, s.aim.y); if (len < 6) return;
    const pw = Math.pow(clamp(len, 0, P.DRAG_MAX) / P.DRAG_MAX, 1.3), dx = s.aim.x / len, dy = s.aim.y / len, L2 = 20 + pw * 90;
    const col = `rgb(255,${Math.round(255 - pw * 165)},${Math.round(255 - pw * 133)})`;
    // puntitos de la dirección y flecha de fuerza
    // la guía de puntitos ayuda al principio; en la segunda mitad del recorrido y cerca del hoyo desaparece (más difícil)
    const cupD = Math.hypot(b.x - hole(s).cup[0], b.y - hole(s).cup[1]), guide = s.i < Math.ceil(s.list.length / 2) && cupD > 110;
    if (guide) for (let k = 1; k < 9; k++) { ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - k / 9)})`; ctx.beginPath(); ctx.arc(b.x + dx * (L2 + k * 12), b.y + dy * (L2 + k * 12), 1.6, 0, 7); ctx.fill(); }
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + dx * L2, b.y + dy * L2); ctx.stroke();
    const tx = b.x + dx * L2, ty = b.y + dy * L2; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(tx + dx * 9, ty + dy * 9); ctx.lineTo(tx - dy * 7, ty + dx * 7); ctx.lineTo(tx + dy * 7, ty - dx * 7); ctx.closePath(); ctx.fill();
    // barra de fuerza
    ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(ctx, W0 / 2 - 60, H0 - 26, 120, 12, 6); ctx.fill(); ctx.fillStyle = col === 'rgb(255,255,255)' ? '#FFB3C2' : col; rr(ctx, W0 / 2 - 58, H0 - 24, 116 * pw, 8, 4); ctx.fill();
  }
  const BTNS = [5, 10, 15].map((n, k) => ({ n, x: 34 + k * 92, y: 334, w: 80, h: 58 }));
  const OVER_BTN = { x: 75, y: 400, w: 180, h: 56 };
  function button(ctx, b, label, sub, pressed) {
    const off = pressed ? 4 : 0; ctx.fillStyle = '#2E8B4A'; rr(ctx, b.x, b.y + 5, b.w, b.h, 18); ctx.fill();
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, '#7BE88A'); g.addColorStop(1, '#4CD964'); ctx.fillStyle = g; rr(ctx, b.x, b.y + off, b.w, b.h, 18); ctx.fill();
    ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 24px ${FD}`; ctx.fillText(label, b.x + b.w / 2, b.y + off + (sub ? 22 : b.h / 2)); if (sub) { ctx.font = `500 12px ${FD}`; ctx.fillText(sub, b.x + b.w / 2, b.y + off + 42); }
  }
  function drawStart(ctx, s) {
    ctx.fillStyle = 'rgba(34,50,79,.35)'; ctx.fillRect(-60, -60, W0 + 120, H0 + 120);
    ctx.fillStyle = '#FFFFFF'; rr(ctx, 22, 62, 286, 430, 28); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E3F9E6'; rr(ctx, W0 / 2 - 46, 82, 92, 22, 11); ctx.fill(); ctx.fillStyle = '#1F7A34'; ctx.font = `600 11px ${FD}`; ctx.fillText(TQT('MINIJUEGO'), W0 / 2, 93.5);
    ctx.fillStyle = COL.ink; ctx.font = `700 32px ${FD}`; ctx.fillText(TQT('Minigolf'), W0 / 2, 132);
    // dibujito: bandera y bola
    ctx.fillStyle = COL.g1; ctx.beginPath(); ctx.ellipse(W0 / 2, 212, 92, 28, 0, 0, 7); ctx.fill(); ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.ellipse(W0 / 2 + 30, 212, 11, 7, 0, 0, 7); ctx.fill(); flag(ctx, W0 / 2 + 30, 212, s.t, false);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#C9D8EA'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W0 / 2 - 40, 216, 8, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.muted; ctx.font = `500 14px ${FD}`;
    const lines = [TQT('Arrastra hacia atrás desde la bola, apunta y suelta.'), TQT('¿Cuántos hoyos juegas?')];
    wrap(ctx, lines[0], W0 / 2, 266, 240, 18); ctx.fillStyle = COL.ink; ctx.font = `600 16px ${FD}`; ctx.fillText(lines[1], W0 / 2, 312);
    BTNS.forEach((b) => button(ctx, b, String(b.n), TQT('hoyos'), s.ui.pressed === b.n));
    // tus récords: una medalla por recorrido
    ctx.fillStyle = '#F3F7EE'; rr(ctx, 34, 410, 262, 70, 18); ctx.fill();
    ctx.fillStyle = COL.muted; ctx.font = `600 11px ${FD}`; ctx.textAlign = 'center'; ctx.fillText(TQT('TUS RÉCORDS'), W0 / 2, 422);
    const R = recs(); BTNS.forEach((b) => medal(ctx, b.x + b.w / 2, 448, b.n, R[b.n], s.t, false));
  }
  function drawOver(ctx, s) {
    if (root.TQBridge) return; // en la app sale la tarjeta de fin de partida de la app (Otra vez · Salir · Compartir)
    ctx.fillStyle = 'rgba(34,50,79,.35)'; ctx.fillRect(-60, -60, W0 + 120, H0 + 120);
    ctx.fillStyle = '#FFFFFF'; rr(ctx, 22, 110, 286, 370, 28); ctx.fill();
    const d = s.total - s.par; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = s.newRec ? '#E0A800' : COL.ink; ctx.font = `700 ${s.newRec ? 20 : 24}px ${FD}`; ctx.fillText(s.newRec ? TQT('¡Nuevo récord en {n} hoyos!').replace('{n}', s.list.length) : TQT('¡Recorrido terminado!'), W0 / 2, 156);
    if (s.newRec) medal(ctx, W0 / 2, 192, s.list.length, undefined, s.t, true);
    ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.font = `700 60px ${FD}`; ctx.fillText(String(s.total), W0 / 2, 246); ctx.font = `600 14px ${FD}`; ctx.fillStyle = COL.muted; ctx.fillText(TQT('golpes'), W0 / 2, 282);
    ctx.font = `700 20px ${FD}`; ctx.fillStyle = d <= 0 ? '#1F9E5A' : '#E0573A'; ctx.fillText((d === 0 ? TQT('Al par') : (d < 0 ? '−' + -d : '+' + d)) + ' · ' + TQT('Par') + ' ' + s.par, W0 / 2, 320);
    button(ctx, OVER_BTN, TQT('Otra vez'), '', s.ui.pressed === 'over');
  }
  function draw(ctx, s) {
    if (s.phase === 'start' && !s.W) { s.list = [0]; s.i = 0; loadHole(s); s.phase = 'start'; }
    drawCourse(ctx, s);
    if (s.phase === 'play') {
      drawAim(ctx, s); drawBall(ctx, s);
      const L = hole(s);
      pill(ctx, `${TQT('Hoyo')} ${s.i + 1}/${s.list.length} · ${TQT('Par')} ${L.par}`, 10, 10);
      pill(ctx, `${TQT('Golpes')} ${s.strokes} · ${TQT('Total')} ${s.total + s.strokes}`, W0 - 10, 10, 'right');
      if (s.msgT > 0 && s.msg) { const a = clamp(s.msgT * 3, 0, 1); ctx.globalAlpha = a; ctx.font = `700 21px ${FD}`; const w = ctx.measureText(s.msg).width + 36; ctx.fillStyle = '#FFFFFF'; rr(ctx, W0 / 2 - w / 2, 232, w, 40, 20); ctx.fill(); ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.msg, W0 / 2, 253); ctx.globalAlpha = 1; }
      if (s.i === 0 && s.strokes === 0 && !s.b.moving && !s.aim) { ctx.font = `600 13px ${FD}`; const m = TQT('Arrastra hacia atrás y suelta'), w = ctx.measureText(m).width + 24; ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(ctx, W0 / 2 - w / 2, H0 - 34, w, 26, 13); ctx.fill(); ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.fillText(m, W0 / 2, H0 - 20.5); }
    }
    if (s.phase === 'start') drawStart(ctx, s);
    if (s.phase === 'over') drawOver(ctx, s);
  }

  /* ---------------------------------------------------------------- app */
  let H = null;
  function hit(b, p, pad) { pad = pad || 6; return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad; }
  function toLogical(e) { const r = H.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - H.ox) / H.k, y: (e.clientY - r.top - H.oy) / H.k }; }
  function onDown(e) {
    if (!H) return; e.preventDefault(); const p = toLogical(e), s = H.s;
    try { H.canvas.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    if (s.phase === 'start') { BTNS.forEach((b) => { if (hit(b, p)) s.ui.pressed = b.n; }); return; }
    if (s.phase === 'over') { if (hit(OVER_BTN, p)) s.ui.pressed = 'over'; return; }
    const b = s.b; if (b.moving || b.ride || b.air > 0 || b.sunk) return;
    // se apunta arrastrando desde cualquier sitio: solo cuenta cuánto y hacia dónde mueves el dedo
    s.drag = p; s.aim = { x: 0, y: 0 };
  }
  function onMove(e) { if (!H || !H.s.drag) return; const p = toLogical(e); H.s.aim = { x: H.s.drag.x - p.x, y: H.s.drag.y - p.y }; }
  function onUp(e) {
    if (!H) return; const s = H.s, p = toLogical(e), pr = s.ui.pressed; s.ui.pressed = null;
    if (s.phase === 'start') { const b = BTNS.find((x) => x.n === pr); if (b && hit(b, p, 16)) startPlay(s, b.n); return; }
    if (s.phase === 'over') { if (pr === 'over' && hit(OVER_BTN, p, 16)) startPlay(s, s.nHoles); return; }
    if (!s.drag) return; const a = s.aim; s.drag = null; s.aim = null;
    const len = Math.hypot(a.x, a.y); if (len < 8) return;
    Ph.shoot(s.b, Math.atan2(a.y, a.x), Ph.shotSpeed(len)); s.strokes++; s.msgT = 0; SND.hit(Math.min(1, len / P.DRAG_MAX));
  }
  function onCancel() { if (H) { H.s.drag = null; H.s.aim = null; H.s.ui.pressed = null; } }
  function resize() {
    if (!H) return; const c = H.container, cw = c.clientWidth || W0; H.canvas.style.height = '0px'; let ch = c.clientHeight; if (ch < 50) ch = (cw * H0) / W0;
    const dpr = Math.min(3, root.devicePixelRatio || 1); H.canvas.style.width = cw + 'px'; H.canvas.style.height = ch + 'px'; H.canvas.width = Math.round(cw * dpr); H.canvas.height = Math.round(ch * dpr);
    H.k = Math.min(cw / W0, ch / H0); H.ox = (cw - W0 * H.k) / 2; H.oy = (ch - H0 * H.k) / 2; H.dpr = dpr;
  }
  function frame(now) {
    if (!H) return; const dt = Math.min(0.05, Math.max(0, (now - (H.last || now)) / 1000)); H.last = now;
    update(H.s, dt);
    const ctx = H.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = H.s.W ? themeOf(H.s.W.L).r1 : COL.rough; ctx.fillRect(0, 0, H.canvas.width, H.canvas.height);
    ctx.setTransform(H.k * H.dpr, 0, 0, H.k * H.dpr, H.ox * H.dpr, H.oy * H.dpr); draw(ctx, H.s);
    H.raf = root.requestAnimationFrame(frame);
  }
  function mount(el) {
    if (H) unmount(); const canvas = document.createElement('canvas'); canvas.style.display = 'block'; canvas.style.touchAction = 'none'; canvas.setAttribute('aria-label', TQT('Minigolf')); el.appendChild(canvas);
    H = { container: el, canvas, ctx: canvas.getContext('2d'), s: createState(), raf: 0, last: 0, k: 1, ox: 0, oy: 0, dpr: 1 };
    resize(); canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onCancel);
    if (root.ResizeObserver) { H.ro = new root.ResizeObserver(resize); H.ro.observe(el); } else root.addEventListener('resize', resize);
    H.raf = root.requestAnimationFrame(frame);
  }
  function unmount() { if (!H) return; root.cancelAnimationFrame(H.raf); if (H.ro) H.ro.disconnect(); if (H.canvas.parentNode) H.canvas.parentNode.removeChild(H.canvas); H = null; }
  root.TQGolf = { mount, unmount, again: () => { if (H) startPlay(H.s, H.s.nHoles); }, _debug: { get s() { return H && H.s; }, startPlay: (n) => H && startPlay(H.s, n), loadHole: (k) => { if (H) { H.s.phase = 'play'; H.s.list = [k]; H.s.i = 0; loadHole(H.s); } } } };
})(typeof window !== 'undefined' ? window : this);
