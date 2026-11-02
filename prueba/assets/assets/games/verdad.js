/* =====================================================================
 * TinyQuit · Minijuego «¿Verdad o mito?» (v7) — canvas 2D
 * ---------------------------------------------------------------------
 * API:  window.TQVerdad = { mount(containerEl), unmount() }
 *
 * 10 frases por partida: desliza a la derecha (o toca «Verdad») o a la
 * izquierda («Mito»). Tras cada una, Tiny explica la respuesta en una
 * línea; el reloj se para mientras la lees. Cuenta primero cuántas
 * aciertas y, si empatas, el tiempo.
 *
 * Tarjetas: window.TQ_VM_CARDS (la app las pasa ya traducidas) o
 * window.TQ_VM_DEFAULT (juego suelto en el navegador). Cada partida
 * lleva 1 de tabaco y la app y 9 de todo tipo, mitad verdad y mitad mito,
 * sin repetir hasta agotar el mazo (window.TQ_ROUND = partidas jugadas).
 * Resultado: window.TQBridge.postMessage({game:'verdad', score, ms}).
 * ===================================================================== */
(function (root) {
  'use strict';

  function TQT(s) { try { const d = root.TQ_TR; return (d && typeof d[s] === 'string' && d[s]) || s; } catch (e) { return s; } }
  function tqSend(o) { try { if (root.TQBridge && root.TQBridge.postMessage) root.TQBridge.postMessage(JSON.stringify(o)); } catch (e) { /* sin app */ } }
  function vib(p) { try { if (root.TQBridge) tqSend({ ev: 'vib', p: p }); else if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  function num(v) { const n = +v; return isFinite(n) && n > 0 ? Math.floor(n) : 0; }

  // SWIPE: hay que deslizar de verdad (Jose, 30 sep: con 70 px contaba casi sin querer; 11 oct: con 160 costaba).
  // Ahora 110 px, o un gesto rápido (FLICK px/ms) de al menos FLICK_MIN px.
  const CFG = { W: 330, H: 525, N: 10, SWIPE: 110, FLICK: 0.55, FLICK_MIN: 55, KEY: 'tq.verdad' };
  const COL = {
    ink: '#22324F', muted: '#5B6478', purple: '#7A5AF8', purpleHi: '#A68FFF', purpleEdge: '#5237C9',
    green: '#34C77B', greenD: '#1F9E5A', greenBg: '#E3F9E9', red: '#FF5A6A', redD: '#D8394B', redBg: '#FFE6E9', card: '#FFFFFF', line: '#E6EEF8',
  };
  const FD = '"Fredoka","Trebuchet MS",sans-serif', FB = '"Fredoka","Trebuchet MS",sans-serif'; // todo en Fredoka (Jose, 11 oct)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- dibujo básico ---------------- */
  function rr(ctx, x, y, w, h, r, fill) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  /** Escribe un párrafo centrado que quepa en [maxW]×[maxH], bajando la letra si hace falta. */
  function para(ctx, text, cx, top, maxW, maxH, size, weight, fam, color, lh) {
    let s = size, lines;
    for (;;) { ctx.font = `${weight} ${s}px ${fam}`; lines = wrap(ctx, text, maxW); if (lines.length * s * lh <= maxH || s <= 12) break; s -= 1; }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const h = lines.length * s * lh, y0 = top + (maxH - h) / 2 + (s * lh) / 2;
    lines.forEach((ln, k) => ctx.fillText(ln, cx, y0 + k * s * lh));
  }
  function tiny(ctx, x, y, w, mood) {
    const k = w / 120;
    // sobre las tarjetas blancas, Tiny va en azul muy clarito para que se vea
    ctx.fillStyle = '#BFD8F0'; blob(ctx, x, y + 5 * k, k); ctx.fillStyle = '#E6F2FF'; blob(ctx, x, y, k);
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.ellipse(x - 12 * k, y + 10 * k, 5 * k, 6.6 * k, 0, 0, 7); ctx.ellipse(x + 12 * k, y + 10 * k, 5 * k, 6.6 * k, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4 * k; ctx.lineCap = 'round'; ctx.beginPath();
    if (mood === 'sad') { ctx.moveTo(x - 8 * k, y + 27 * k); ctx.quadraticCurveTo(x, y + 20 * k, x + 8 * k, y + 27 * k); }
    else { ctx.moveTo(x - 9 * k, y + 21 * k); ctx.quadraticCurveTo(x, y + 31 * k, x + 9 * k, y + 21 * k); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,143,192,.75)'; ctx.beginPath(); ctx.ellipse(x - 23 * k, y + 21 * k, 6 * k, 4 * k, 0, 0, 7); ctx.ellipse(x + 23 * k, y + 21 * k, 6 * k, 4 * k, 0, 0, 7); ctx.fill();
  }
  function blob(ctx, x, y, k) {
    const c = (cx, cy, r) => { ctx.beginPath(); ctx.arc(x + cx * k, y + cy * k, r * k, 0, 7); ctx.fill(); };
    c(-26, 6, 24); c(0, -12, 30); c(28, 4, 23);
    ctx.beginPath(); ctx.moveTo(x - 30 * k, y); ctx.lineTo(x + 30 * k, y); ctx.arc(x + 30 * k, y + 18 * k, 18 * k, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x - 30 * k, y + 36 * k); ctx.arc(x - 30 * k, y + 18 * k, 18 * k, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  }
  function button(ctx, b, label, top, bot, edge, pressed, size) {
    const off = pressed ? 4 : 0;
    rr(ctx, b.x, b.y + 5, b.w, b.h, b.h / 2, edge);
    const g = ctx.createLinearGradient(0, b.y + off, 0, b.y + off + b.h); g.addColorStop(0, top); g.addColorStop(1, bot);
    rr(ctx, b.x, b.y + off, b.w, b.h, b.h / 2, g);
    ctx.font = `600 ${size || 21}px ${FD}`; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, b.x + b.w / 2, b.y + off + b.h / 2 + 1);
  }
  function fmtT(ms) {
    const s = ms / 1000, m = Math.floor(s / 60), ss = Math.floor(s - m * 60);
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  /* ---------------- mazo ---------------- */
  function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  function shuffled(arr, seed) { const a = arr.slice(), r = rng(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function allCards() { const c = root.TQ_VM_CARDS || root.TQ_VM_DEFAULT || []; return Array.isArray(c) ? c : []; }
  /** Las 10 tarjetas de la partida número [round]: siempre las mismas para ese número, y sin repetir hasta agotar cada grupo. */
  function roundCards(round) {
    const cards = allCards();
    const isT = (c) => c.t === 1 || c.c === 'Tabaco';
    const groups = {
      tT: shuffled(cards.filter((c) => isT(c) && c.a), 11), tF: shuffled(cards.filter((c) => isT(c) && !c.a), 12),
      oT: shuffled(cards.filter((c) => !isT(c) && c.a), 13), oF: shuffled(cards.filter((c) => !isT(c) && !c.a), 14),
    };
    const plan = (r) => (r % 2 === 0 ? { tT: 1, tF: 0, oT: 4, oF: 5 } : { tT: 0, tF: 1, oT: 5, oF: 4 });
    const used = { tT: 0, tF: 0, oT: 0, oF: 0 };
    for (let r = 0; r < round; r++) { const p = plan(r); for (const k in p) used[k] += p[k]; }
    const out = [], p = plan(round);
    for (const k in p) {
      const g = groups[k];
      for (let i = 0; i < p[k] && g.length; i++) out.push(g[(used[k] + i) % g.length]);
    }
    // si falta algún grupo (mazo raro), se completa con lo que haya
    const rest = shuffled(cards, round + 99);
    for (let i = 0; out.length < CFG.N && i < rest.length; i++) if (out.indexOf(rest[i]) < 0) out.push(rest[i]);
    return shuffled(out, round * 7 + 3);
  }

  /* ---------------- estado ---------------- */
  function load() { try { return JSON.parse(root.localStorage.getItem(CFG.KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { root.localStorage.setItem(CFG.KEY, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } }
  function createState() {
    const st = load();
    const best = Math.max(num(root.TQ_BEST), num(st.best));
    const bestMs = num(root.TQ_BEST_MS) || num(st.bestMs);
    return { phase: 'start', t: 0, best, bestMs, round: Math.max(num(root.TQ_ROUND), num(st.round)), cards: [], res: [], i: 0, ok: 0, ms: 0,
      answer: null, answerT: 0, drag: null, dx: 0, flyT: 0, flyDir: 0, newBest: false, ui: { pressed: null } };
  }
  function startPlay(s) {
    tqSend({ ev: 'play' });
    s.cards = roundCards(s.round); s.i = 0; s.ok = 0; s.res = []; s.ms = 0; s.answer = null; s.dx = 0; s.flyT = 0; s.phase = 'play'; s.newBest = false;
  }
  function answer(s, saysTrue) {
    if (s.phase !== 'play' || s.answer) return;
    const c = s.cards[s.i]; const right = !!c.a === saysTrue;
    if (right) s.ok++;
    vib(right ? [20, 40, 40] : [70, 50, 70]);
    s.res[s.i] = right;
    s.answer = { right, saysTrue }; s.answerT = 0; s.dx = 0;
  }
  function next(s) {
    if (!s.answer || s.answerT < 0.25) return;
    s.answer = null; s.dx = 0; s.flyT = 0; s.i++;
    if (s.i >= s.cards.length) finish(s);
  }
  function finish(s) {
    s.phase = 'over'; s.t = 0;
    s.newBest = s.ok > s.best || (s.ok === s.best && s.ok > 0 && (s.bestMs === 0 || s.ms < s.bestMs));
    if (s.newBest) { s.best = s.ok; s.bestMs = s.ms; }
    s.round++;
    save({ best: s.best, bestMs: s.bestMs, round: s.round });
    tqSend({ game: 'verdad', score: s.ok, ms: Math.round(s.ms) });
  }
  function update(s, dt) {
    s.t += dt;
    if (s.phase !== 'play') return;
    if (s.answer) { s.answerT += dt; if (s.flyT > 0) s.flyT = Math.min(1, s.flyT + dt * 3); }
    else s.ms += dt * 1000; // el reloj solo corre mientras piensas
    if (!s.drag && !s.answer) s.dx *= Math.pow(0.001, dt);
  }

  /* ---------------- pantallas ---------------- */
  const BTN_MITO = { x: 22, y: 440, w: 136, h: 56 }, BTN_VERDAD = { x: 172, y: 440, w: 136, h: 56 };
  const BTN_NEXT = { x: 70, y: 440, w: 190, h: 56 }, BTN_START = { x: 75, y: 364, w: 180, h: 58 }, BTN_AGAIN = { x: 70, y: 350, w: 190, h: 56 };
  const CARD = { x: 16, y: 76, w: 298, h: 350 }; // 7.3 (F3): tarjeta más grande; marcadores arriba sin tocar la barra

  function drawBg(ctx, v) {
    const g = ctx.createLinearGradient(0, v.y0, 0, v.y1); g.addColorStop(0, '#CFEAFF'); g.addColorStop(1, '#F4FAFF');
    ctx.fillStyle = g; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  }
  function drawHud(ctx, s) {
    // 7.3 (F3): fila de arriba = «Frase X de 10» (izquierda) y aciertos + tiempo (derecha); debajo, los puntos centrados
    ctx.font = `700 14px ${FD}`; ctx.textBaseline = 'middle';
    const fr = TQT('Frase') + ' ' + Math.min(s.i + 1, CFG.N) + ' ' + TQT('de') + ' ' + CFG.N, fw = ctx.measureText(fr).width + 26;
    rr(ctx, 16, 8, fw, 28, 14, 'rgba(255,255,255,.92)'); ctx.textAlign = 'center'; ctx.fillStyle = COL.ink; ctx.fillText(fr, 16 + fw / 2, 22.5);
    rr(ctx, CFG.W - 16 - 108, 8, 108, 28, 14, 'rgba(255,255,255,.92)');
    ctx.fillStyle = COL.ink; ctx.textAlign = 'center';
    ctx.fillText('✓ ' + s.ok + '  ·  ' + fmtT(s.ms), CFG.W - 16 - 54, 22.5);
    for (let k = 0; k < CFG.N; k++) {
      // amarillo = por hacer (la actual, más grande), verde = acertada, rojo = fallada (Jose, 30 sep)
      const x = CFG.W / 2 + (k - (CFG.N - 1) / 2) * 18, r = s.res[k];
      ctx.fillStyle = r === true ? COL.green : (r === false ? COL.red : (k === s.i ? '#FFC53D' : '#FFE28A'));
      ctx.beginPath(); ctx.arc(x, 55, k === s.i ? 6.5 : 5, 0, 7); ctx.fill();
    }
  }
  function drawCard(ctx, s) {
    const c = s.cards[s.i]; if (!c) return;
    let dx = s.dx;
    if (s.flyT > 0 && !s.answer) dx = 0;
    const rot = clamp(dx / 600, -0.18, 0.18);
    ctx.save();
    ctx.translate(CARD.x + CARD.w / 2 + dx, CARD.y + CARD.h / 2); ctx.rotate(rot);
    const x = -CARD.w / 2, y = -CARD.h / 2;
    rr(ctx, x, y + 8, CARD.w, CARD.h, 30, 'rgba(34,50,79,.10)');
    rr(ctx, x, y, CARD.w, CARD.h, 30, COL.card);
    // categoría
    ctx.font = `600 12px ${FB}`; const cat = TQT(c.c || '');
    const cw = ctx.measureText(cat).width + 26;
    rr(ctx, -cw / 2, y + 18, cw, 26, 13, '#F1EDFF'); ctx.fillStyle = COL.purple; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(cat, 0, y + 31.5);
    if (!s.answer) {
      para(ctx, c.q, 0, y + 60, CARD.w - 44, CARD.h - 100, 24, 700, FD, COL.ink, 1.25);
      // sellos al deslizar
      const k = clamp(Math.abs(dx) / CFG.SWIPE, 0, 1);
      if (k > 0.05) {
        ctx.globalAlpha = k; const yes = dx > 0;
        ctx.save(); ctx.translate(yes ? x + 70 : -x - 70, y + CARD.h - 40); ctx.rotate(yes ? -0.2 : 0.2);
        ctx.strokeStyle = yes ? COL.green : COL.red; ctx.lineWidth = 3; rr(ctx, -52, -18, 104, 36, 10, 'rgba(255,255,255,.9)');
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-52, -18, 104, 36, 10) : ctx.rect(-52, -18, 104, 36); ctx.stroke();
        ctx.font = `700 20px ${FD}`; ctx.fillStyle = yes ? COL.greenD : COL.redD; ctx.textAlign = 'center'; ctx.fillText(yes ? TQT('VERDAD') : TQT('MITO'), 0, 1);
        ctx.restore(); ctx.globalAlpha = 1;
      }
    } else {
      const ok = s.answer.right, trueIs = !!c.a;
      rr(ctx, x + 14, y + 56, CARD.w - 28, 48, 16, ok ? COL.greenBg : COL.redBg);
      ctx.font = `700 20px ${FD}`; ctx.fillStyle = ok ? COL.greenD : COL.redD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ok ? TQT('¡Correcto!') : (trueIs ? TQT('¡Uy! Era verdad') : TQT('¡Uy! Era un mito')), 0, y + 81);
      para(ctx, c.q, 0, y + 112, CARD.w - 44, 62, 16, 800, FB, COL.muted, 1.3);
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 30, y + 182); ctx.lineTo(-x - 30, y + 182); ctx.stroke();
      // Tiny a la izquierda y la explicación a la derecha, centrados en la misma altura
      const top = y + 192, hh = CARD.h - 192 - 14, mid = top + hh / 2;
      tiny(ctx, x + 48, mid - 2, 58, ok ? 'happy' : 'sad');
      para(ctx, c.e || '', x + 90 + (CARD.w - 106) / 2, top, CARD.w - 106, hh, 16, 800, FB, COL.ink, 1.35);
    }
    ctx.restore();
  }
  function drawStart(ctx, s) {
    // de arriba abajo, sin que nada se pise: etiqueta, Tiny, título, texto, aviso del reloj, botón y récord
    rr(ctx, 30, 52 + 6, 270, 420, 30, 'rgba(34,50,79,.08)'); rr(ctx, 30, 52, 270, 420, 30, 'rgba(255,255,255,.95)');
    rr(ctx, CFG.W / 2 - 44, 68, 88, 22, 11, '#F1EDFF');
    ctx.font = `600 11px ${FB}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = COL.purple; ctx.fillText(TQT('MINIJUEGO'), CFG.W / 2, 79.5);
    tiny(ctx, CFG.W / 2, 124 + Math.sin(s.t * 2) * 3, 70, 'happy');
    ctx.font = `700 30px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText(TQT('¿Verdad o mito?'), CFG.W / 2, 186);
    para(ctx, TQT('10 frases de todo tipo. Desliza a la derecha si es verdad y a la izquierda si es un mito. Gana quien más acierta; si empatas, cuenta el tiempo.'), CFG.W / 2, 204, 226, 100, 14, 800, FB, COL.muted, 1.35);
    rr(ctx, CFG.W / 2 - 112, 312, 224, 36, 12, '#FFF6D6');
    para(ctx, TQT('El reloj se para mientras lees la respuesta.'), CFG.W / 2, 312, 208, 36, 12.5, 800, FB, '#8A5A00', 1.25);
    button(ctx, BTN_START, TQT('Jugar'), COL.purpleHi, COL.purple, COL.purpleEdge, s.ui.pressed === 'start', 23);
    if (s.best > 0) { ctx.font = `600 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TQT('Récord: ') + s.best + '/10 · ' + fmtT(s.bestMs), CFG.W / 2, 450); }
  }
  function drawOver(ctx, s) {
    rr(ctx, 32, 88 + 6, 266, 340, 30, 'rgba(34,50,79,.08)'); rr(ctx, 32, 88, 266, 340, 30, 'rgba(255,255,255,.95)');
    tiny(ctx, CFG.W / 2, 130, 66, s.ok >= 6 ? 'happy' : 'sad');
    ctx.font = `700 22px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = s.newBest ? '#E0A800' : COL.ink;
    const msg = s.newBest ? TQT('¡Nuevo récord!') : (s.ok === 10 ? TQT('¡Perfecto!') : (s.ok >= 7 ? TQT('¡Muy bien!') : TQT('¡Sigue practicando!')));
    ctx.fillText(msg, CFG.W / 2, 190);
    ctx.font = `700 54px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText(s.ok + '/10', CFG.W / 2, 244);
    ctx.font = `600 14px ${FB}`; ctx.fillStyle = COL.muted;
    ctx.fillText(TQT('aciertos') + ' · ' + fmtT(s.ms), CFG.W / 2, 284);
    ctx.fillText(TQT('Récord: ') + s.best + '/10 · ' + fmtT(s.bestMs), CFG.W / 2, 310);
    button(ctx, BTN_AGAIN, TQT('Otra vez'), COL.purpleHi, COL.purple, COL.purpleEdge, s.ui.pressed === 'again', 22);
  }
  function draw(ctx, s) {
    const v = s.view || { x0: 0, y0: 0, x1: CFG.W, y1: CFG.H };
    drawBg(ctx, v);
    if (s.phase === 'start') return drawStart(ctx, s);
    if (s.phase === 'over') return drawOver(ctx, s);
    drawHud(ctx, s);
    drawCard(ctx, s);
    if (s.answer) button(ctx, BTN_NEXT, s.i >= CFG.N - 1 ? TQT('Ver resultado') : TQT('Siguiente'), COL.purpleHi, COL.purple, COL.purpleEdge, s.ui.pressed === 'next', 21);
    else {
      button(ctx, BTN_MITO, '✗ ' + TQT('Mito'), '#FF8A96', COL.red, COL.redD, s.ui.pressed === 'mito', 21);
      button(ctx, BTN_VERDAD, '✓ ' + TQT('Verdad'), '#6BDB9D', COL.green, COL.greenD, s.ui.pressed === 'verdad', 21);
    }
  }

  /* ---------------- app ---------------- */
  let H = null;
  function hit(b, p, pad) { pad = pad || 6; return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + 6 + pad; }
  function toL(e) { const r = H.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - H.ox) / H.k, y: (e.clientY - r.top - H.oy) / H.k }; }
  function onDown(e) {
    if (!H) return; e.preventDefault();
    const p = toL(e), s = H.s;
    try { H.canvas.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    if (s.phase === 'start') { if (hit(BTN_START, p)) s.ui.pressed = 'start'; return; }
    if (s.phase === 'over') { if (hit(BTN_AGAIN, p)) s.ui.pressed = 'again'; return; }
    if (s.answer) { s.ui.pressed = hit(BTN_NEXT, p) ? 'next' : 'nextAny'; return; }
    if (hit(BTN_MITO, p)) s.ui.pressed = 'mito';
    else if (hit(BTN_VERDAD, p)) s.ui.pressed = 'verdad';
    else if (p.y > CARD.y - 10 && p.y < CARD.y + CARD.h + 10) s.drag = { x: p.x, dx0: s.dx, t0: Date.now() };
  }
  function onMove(e) { if (!H) return; const s = H.s; if (s.drag) s.dx = s.drag.dx0 + (toL(e).x - s.drag.x); }
  function onUp(e) {
    if (!H) return;
    const p = toL(e), s = H.s, pr = s.ui.pressed; s.ui.pressed = null;
    if (s.drag) {
      const d = s.drag, moved = Math.abs(s.dx - d.dx0), v = moved / Math.max(1, Date.now() - d.t0);
      s.drag = null;
      if (Math.abs(s.dx) > CFG.SWIPE || (moved > CFG.FLICK_MIN && v > CFG.FLICK)) answer(s, s.dx > 0);
      return;
    }
    if (pr === 'start' && hit(BTN_START, p, 20)) startPlay(s);
    else if (pr === 'again' && hit(BTN_AGAIN, p, 20)) startPlay(s);
    else if (pr === 'mito' && hit(BTN_MITO, p, 14)) { s.dx = -1; answer(s, false); }
    else if (pr === 'verdad' && hit(BTN_VERDAD, p, 14)) { s.dx = 1; answer(s, true); }
    else if (pr === 'next' || pr === 'nextAny') next(s);
  }
  function onCancel() { if (H) { H.s.ui.pressed = null; H.s.drag = null; } }
  function onKey(e) {
    if (!H) return; const s = H.s;
    if (s.phase === 'play' && !s.answer && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) answer(s, e.key === 'ArrowRight');
    else if (s.phase === 'play' && s.answer && (e.key === 'Enter' || e.key === ' ')) next(s);
    else if (s.phase !== 'play' && e.key === 'Enter') startPlay(s);
  }
  function resize() {
    if (!H) return;
    const c = H.container, cw = c.clientWidth || CFG.W; H.canvas.style.height = '0px';
    let ch = c.clientHeight; if (ch < 50) ch = (cw * CFG.H) / CFG.W;
    const dpr = Math.min(3, root.devicePixelRatio || 1);
    H.canvas.style.width = cw + 'px'; H.canvas.style.height = ch + 'px'; H.canvas.width = Math.round(cw * dpr); H.canvas.height = Math.round(ch * dpr);
    H.k = Math.min(cw / CFG.W, ch / CFG.H); H.ox = (cw - CFG.W * H.k) / 2; H.oy = (ch - CFG.H * H.k) / 2; H.dpr = dpr;
    H.s.view = { x0: -H.ox / H.k, y0: -H.oy / H.k, x1: (cw - H.ox) / H.k, y1: (ch - H.oy) / H.k };
  }
  function frame(now) {
    if (!H) return;
    const dt = Math.min(0.05, Math.max(0, (now - (H.last || now)) / 1000)); H.last = now;
    update(H.s, dt);
    const ctx = H.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, H.canvas.width, H.canvas.height);
    ctx.setTransform(H.k * H.dpr, 0, 0, H.k * H.dpr, H.ox * H.dpr, H.oy * H.dpr);
    draw(ctx, H.s);
    H.raf = root.requestAnimationFrame(frame);
  }
  function mount(el) {
    if (H) unmount();
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block'; canvas.style.touchAction = 'none'; canvas.setAttribute('aria-label', TQT('¿Verdad o mito?'));
    el.appendChild(canvas);
    H = { container: el, canvas, ctx: canvas.getContext('2d'), s: createState(), raf: 0, last: 0, k: 1, ox: 0, oy: 0, dpr: 1 };
    resize();
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onCancel);
    root.addEventListener('keydown', onKey);
    if (root.ResizeObserver) { H.ro = new root.ResizeObserver(resize); H.ro.observe(el); } else root.addEventListener('resize', resize);
    H.raf = root.requestAnimationFrame(frame);
  }
  function unmount() {
    if (!H) return;
    root.cancelAnimationFrame(H.raf);
    H.canvas.removeEventListener('pointerdown', onDown); H.canvas.removeEventListener('pointermove', onMove);
    H.canvas.removeEventListener('pointerup', onUp); H.canvas.removeEventListener('pointercancel', onCancel);
    root.removeEventListener('keydown', onKey);
    if (H.ro) H.ro.disconnect(); else root.removeEventListener('resize', resize);
    if (H.canvas.parentNode) H.canvas.parentNode.removeChild(H.canvas);
    H = null;
  }
  root.TQVerdad = { mount, unmount, again: () => { if (H) startPlay(H.s); }, _debug: { get s() { return H && H.s; }, roundCards, startPlay: () => H && startPlay(H.s), answer: (v) => H && answer(H.s, v), next: () => H && next(H.s) } };
})(typeof window !== 'undefined' ? window : this);
