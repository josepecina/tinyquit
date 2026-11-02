/* =====================================================================
 * TinyQuit · Minijuego «Reloj de Tiny» (prototipo, idea de Jose, 30 sep)
 * ---------------------------------------------------------------------
 * API:  window.TQReloj = { mount(containerEl), unmount() }
 *
 * 3 rondas, todas cuenta atrás hasta 0: desde 5, 7 y 10 segundos. Al
 * principio ves el reloj; desde el 30 % Tiny se pone delante y a la mitad
 * ya lo tapa del todo: el resto lo cuentas tú en la cabeza. Toca cuando creas
 * que ha llegado. Gana quien menos se desvía (suma de las 3 rondas).
 * Resultado: window.TQBridge.postMessage({game:'reloj', ms: desvío total}).
 * ===================================================================== */
(function (root) {
  'use strict';
  function TQT(s) { try { const d = root.TQ_TR; return (d && typeof d[s] === 'string' && d[s]) || s; } catch (e) { return s; } }
  function tqSend(o) { try { if (root.TQBridge && root.TQBridge.postMessage) root.TQBridge.postMessage(JSON.stringify(o)); } catch (e) { /* sin app */ } }
  function vib(p) { try { if (root.TQBridge) tqSend({ ev: 'vib', p: p }); else if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  function num(v) { const n = +v; return isFinite(n) && n > 0 ? Math.floor(n) : 0; }

  const CFG = { W: 330, H: 525, KEY: 'tq.reloj',
    ROUNDS: [5, 7, 10],          // todas son cuenta atrás hasta 0 (Jose, 30 sep)
    SEE: 0.3, FADE: 0.2 };       // se ve del todo el 30 %, se tapa hasta la mitad y la otra mitad va a ciegas
  // Paleta propia del juego (nada de morado): amanecer cálido, esfera crema, aro turquesa y coral para el tiempo
  const COL = { ink: '#22324F', muted: '#6B6F80', teal: '#17A89A', tealHi: '#4FD1C1', tealEdge: '#0F7F74', coral: '#FF7A59', coralD: '#E0573A',
    cream: '#FFFDF7', tick: '#C9C2B4', good: '#1F9E5A', warn: '#E0A800', card: '#FFFFFF' };
  const FD = '"Fredoka","Trebuchet MS",sans-serif', FB = '"Fredoka","Trebuchet MS",sans-serif'; // todo en Fredoka (Jose, 11 oct)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function rr(ctx, x, y, w, h, r, fill) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function wrap(ctx, text, maxW) { const w = String(text).split(' '), l = []; let line = ''; for (const x of w) { const t = line ? line + ' ' + x : x; if (ctx.measureText(t).width > maxW && line) { l.push(line); line = x; } else line = t; } if (line) l.push(line); return l; }
  function para(ctx, text, cx, top, maxW, maxH, size, weight, fam, color, lh) {
    let s = size, lines; for (;;) { ctx.font = `${weight} ${s}px ${fam}`; lines = wrap(ctx, text, maxW); if (lines.length * s * lh <= maxH || s <= 11) break; s -= 1; }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const h = lines.length * s * lh, y0 = top + (maxH - h) / 2 + (s * lh) / 2; lines.forEach((ln, k) => ctx.fillText(ln, cx, y0 + k * s * lh));
  }
  function button(ctx, b, label, pressed) {
    const off = pressed ? 4 : 0;
    rr(ctx, b.x, b.y + 5, b.w, b.h, b.h / 2, COL.tealEdge);
    const g = ctx.createLinearGradient(0, b.y + off, 0, b.y + off + b.h); g.addColorStop(0, COL.tealHi); g.addColorStop(1, COL.teal);
    rr(ctx, b.x, b.y + off, b.w, b.h, b.h / 2, g);
    ctx.font = `600 22px ${FD}`; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, b.x + b.w / 2, b.y + off + b.h / 2 + 1);
  }
  const sec = (ms) => (ms / 1000).toFixed(2).replace('.', root.TQ_DEC || ',') + ' s';
  function verdict(err) { const e = Math.abs(err); return e < 50 ? '¡Clavado!' : (e < 150 ? '¡Casi perfecto!' : (e < 400 ? '¡Bien!' : (e < 1000 ? '¡Cerca!' : '¡Sigue practicando!'))); }
  function cloud(ctx, x, y, w, fill, shade) {
    const k = w / 120, c = (cx, cy, r) => { ctx.beginPath(); ctx.arc(x + cx * k, y + cy * k, r * k, 0, 7); ctx.fill(); };
    const blob = (dy) => { c(-26, 6 + dy, 24); c(0, -12 + dy, 30); c(28, 4 + dy, 23); rr(ctx, x - 48 * k, y + dy * k, 96 * k, 36 * k, 18 * k, ctx.fillStyle); };
    ctx.fillStyle = shade; blob(5); ctx.fillStyle = fill; blob(0);
  }
  function sleepyFace(ctx, x, y, k) {
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3 * k; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(x - 17 * k, y); ctx.quadraticCurveTo(x - 12 * k, y + 4 * k, x - 7 * k, y); ctx.moveTo(x + 7 * k, y); ctx.quadraticCurveTo(x + 12 * k, y + 4 * k, x + 17 * k, y);
    ctx.moveTo(x - 5 * k, y + 12 * k); ctx.quadraticCurveTo(x, y + 16 * k, x + 5 * k, y + 12 * k); ctx.stroke();
    ctx.fillStyle = 'rgba(255,143,192,.75)'; ctx.beginPath(); ctx.ellipse(x - 24 * k, y + 10 * k, 5 * k, 3.4 * k, 0, 0, 7); ctx.ellipse(x + 24 * k, y + 10 * k, 5 * k, 3.4 * k, 0, 0, 7); ctx.fill();
  }

  function load() { try { return JSON.parse(root.localStorage.getItem(CFG.KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { root.localStorage.setItem(CFG.KEY, JSON.stringify(o)); } catch (e) { /* nada */ } }
  function createState() {
    const st = load();
    pickRounds();
    return { phase: 'start', t: 0, best: num(root.TQ_BEST) || num(st.best), last: num(root.TQ_LAST) || num(st.last), r: 0, errs: [], runT: 0, stopT: 0, err: 0, newBest: false, ui: { pressed: null } };
  }
  // b93 (Jose): cada partida, 3 números al azar distintos entre 3 y 12, de menor a mayor
  function pickRounds() { const pool = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], pick = []; while (pick.length < 3) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); CFG.ROUNDS = pick.sort((x, y) => x - y);
    // Jose (11 oct): a veces el reloj va más rápido o más lento. La 1.ª ronda, normal; la 2.ª, rápida o lenta; la 3.ª, al azar.
    const odd = () => (Math.random() < 0.5 ? 0.75 : 1.3);
    CFG.SPEEDS = [1, odd(), [0.75, 1, 1.3][Math.floor(Math.random() * 3)]]; }
  let LBL = null;
  const spd = (s) => (CFG.SPEEDS && CFG.SPEEDS[s.r]) || 1;
  // tiempo REAL que tarda en llegar a 0 el reloj de esta ronda (con su velocidad)
  const realT = (s) => (CFG.ROUNDS[s.r] * 1000) / spd(s);
  function begin(s) { tqSend({ ev: 'play' }); pickRounds(); s.r = 0; s.errs = []; s.phase = 'ready'; s.newBest = false; }
  function tap(s) {
    if (s.phase === 'ready') { s.phase = 'run'; s.runT = 0; return; }
    if (s.phase === 'run') { s.err = s.runT - realT(s); s.errs.push(s.err); vib(Math.abs(s.err) < 50 ? [30, 40, 90] : 35); s.phase = 'shown'; s.stopT = 0; return; }
    if (s.phase === 'shown' && s.stopT > 0.5) { s.r++; if (s.r >= CFG.ROUNDS.length) finish(s); else s.phase = 'ready'; }
  }
  function finish(s) {
    const total = Math.round(s.errs.reduce((a, e) => a + Math.abs(e), 0));
    s.total = total; s.phase = 'over'; s.t = 0; s.last = total;
    s.newBest = s.best === 0 || total < s.best; if (s.newBest) s.best = total;
    save({ best: s.best, last: s.last });
    tqSend({ game: 'reloj', ms: total, errs: s.errs.map((e) => Math.round(Math.abs(e))) });
  }
  function update(s, dt) {
    s.t += dt;
    if (s.phase === 'run') { s.runT += dt * 1000; if (s.runT > realT(s) + 3000) tap(s); } // si no tocas, se para solo 3 s después
    if (s.phase === 'shown') s.stopT += dt;
  }

  /* ---------------- dibujo ---------------- */
  const BTN = { x: 75, y: 404, w: 180, h: 58 };
  function drawBg(ctx, s, v) {
    const g = ctx.createLinearGradient(0, v.y0, 0, v.y1); g.addColorStop(0, '#FFD9B8'); g.addColorStop(0.45, '#FFEBD6'); g.addColorStop(1, '#FFF7EC');
    ctx.fillStyle = g; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    // sol de amanecer y nubes lejanas que pasan despacio
    const sun = ctx.createRadialGradient(262, 128, 6, 262, 128, 70); sun.addColorStop(0, 'rgba(255,214,120,.9)'); sun.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(262, 128, 70, 0, 7); ctx.fill();
    // nubes de fondo, en el cielo y detrás del reloj: muy suaves, unas van a la derecha y otras a la izquierda, despacio
    // (nunca por encima del título ni de los textos de abajo, ni sobre la pradera)
    ctx.globalAlpha = 0.32;
    cloud(ctx, ((s.t * 5) % 480) - 80, 190, 74, '#FFFFFF', '#FBE3CF');
    cloud(ctx, 400 - ((s.t * 3.5 + 160) % 480), 300, 58, '#FFFFFF', '#FBE3CF');
    cloud(ctx, ((s.t * 2.5 + 300) % 480) - 80, 325, 44, '#FFFFFF', '#FBE3CF');
    ctx.globalAlpha = 1;
    // colinas turquesa
    ctx.fillStyle = '#9EE0CF'; ctx.beginPath(); ctx.ellipse(60, 520, 220, 70, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7DD3BF'; ctx.beginPath(); ctx.ellipse(300, 536, 230, 76, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6CC7B2'; ctx.fillRect(v.x0, 560, v.x1 - v.x0, Math.max(0, v.y1 - 560));
  }
  /** Cronómetro: aro turquesa, esfera crema, marcas por segundo, arco coral con lo que queda y aguja. [shown]: 0 = tapado por Tiny. */
  function stopwatch(ctx, s, cx, cy, R, remain, total, shown, noNum) {
    ctx.fillStyle = 'rgba(120,70,40,.14)'; ctx.beginPath(); ctx.ellipse(cx, cy + R + 14, R * 0.8, 10, 0, 0, 7); ctx.fill();
    // corona y botones
    rr(ctx, cx - 11, cy - R - 26, 22, 18, 5, COL.tealEdge); rr(ctx, cx - 18, cy - R - 34, 36, 12, 6, COL.teal);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.75); rr(ctx, -7, -R - 16, 14, 16, 4, COL.tealEdge); ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.75); rr(ctx, -7, -R - 16, 14, 16, 4, COL.tealEdge); ctx.restore();
    const ring = ctx.createLinearGradient(0, cy - R, 0, cy + R); ring.addColorStop(0, COL.tealHi); ring.addColorStop(1, COL.tealEdge);
    ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.fillStyle = COL.cream; ctx.beginPath(); ctx.arc(cx, cy, R - 12, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(cx - R * 0.35, cy - R * 0.45, R * 0.28, R * 0.12, -0.5, 0, 7); ctx.fill();
    // marcas: 60 finas y una gruesa por cada segundo de la ronda
    for (let k = 0; k < 60; k++) {
      const a = -Math.PI / 2 + (k / 60) * Math.PI * 2, r1 = R - 18, r2 = R - 23;
      ctx.strokeStyle = COL.tick; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
    }
    for (let k = 0; k < total; k++) {
      const a = -Math.PI / 2 + (k / total) * Math.PI * 2, r1 = R - 18, r2 = R - 30;
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
    }
    ctx.globalAlpha = shown;
    const frac = clamp(remain / total, 0, 1), a1 = -Math.PI / 2 + frac * Math.PI * 2;
    ctx.strokeStyle = 'rgba(255,122,89,.9)'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    if (frac > 0.002) { ctx.beginPath(); ctx.arc(cx, cy, R - 42, -Math.PI / 2, a1); ctx.stroke(); }
    ctx.strokeStyle = COL.coralD; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a1) * (R - 30), cy + Math.sin(a1) * (R - 30)); ctx.stroke();
    ctx.font = `700 ${Math.round(R * 0.42)}px ${FD}`; ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!noNum) ctx.fillText(Math.max(0, remain).toFixed(1).replace('.', ','), cx, cy + R * 0.34);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COL.coralD; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); ctx.fill();
    // a partir del 30 %, Tiny se pone delante y tapa el reloj (del todo a la mitad)
    if (shown < 0.99) {
      const k = 1 - shown, w = R * 2.2;
      ctx.globalAlpha = Math.min(1, k * 1.3);
      cloud(ctx, cx + (1 - k) * R * 1.6, cy - 6, w, '#FFFFFF', '#E8DCCF');
      sleepyFace(ctx, cx + (1 - k) * R * 1.6, cy + 4, w / 120);
      ctx.globalAlpha = 1;
    }
  }
  function pill(ctx, x, y, w, label, value, align) {
    rr(ctx, x, y, w, 40, 14, 'rgba(255,255,255,.85)');
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    const tx = align === 'left' ? x + 12 : x + w - 12;
    ctx.font = `600 10.5px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText(label.toUpperCase(), tx, y + 13);
    ctx.font = `700 15px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText(value, tx, y + 28);
  }
  function card(ctx, y, h) { rr(ctx, 26, y + 6, 278, h, 30, 'rgba(120,70,40,.10)'); rr(ctx, 26, y, 278, h, 30, 'rgba(255,255,255,.94)'); }
  function draw(ctx, s) {
    const v = s.view || { x0: 0, y0: 0, x1: CFG.W, y1: CFG.H };
    drawBg(ctx, s, v);
    const cx = CFG.W / 2;
    if (s.phase === 'start') {
      card(ctx, 50, 460);
      rr(ctx, cx - 44, 66, 88, 22, 11, '#DDF6F1'); ctx.font = `600 11px ${FB}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = COL.tealEdge; ctx.fillText(TQT('MINIJUEGO'), cx, 77.5);
      ctx.font = `700 30px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText(TQT('Reloj de Tiny'), cx, 116);
      const T = 5, rem = T - (s.t % 6.5) * (T / 5);
      const p = 1 - clamp(rem, 0, T) / T;
      stopwatch(ctx, s, cx, 238, 60, Math.max(0, rem), T, p < CFG.SEE ? 1 : clamp(1 - (p - CFG.SEE) / CFG.FADE, 0, 1), true); // en el inicio, sin número (Jose: se veía manchado)
      para(ctx, TQT('Cuenta atrás en tu cabeza. A mitad de camino, Tiny tapa el reloj: toca justo cuando creas que llega a cero. 3 rondas, y algunos relojes van más rápido o más lento.'), cx, 322, 232, 76, 14, 800, FB, COL.muted, 1.35);
      button(ctx, BTN, TQT('Jugar'), s.ui.pressed === 'btn');
      if (s.best > 0) { ctx.font = `600 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TQT('Récord: ') + sec(s.best) + ' ' + TQT('de desvío'), cx, 488); }
      return;
    }
    if (s.phase === 'over') {
      card(ctx, 50, 460);
      ctx.font = `700 24px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = s.newBest ? COL.warn : COL.ink;
      ctx.fillText(s.newBest ? TQT('¡Nuevo récord!') : TQT(verdict(s.total / 3)), cx, 98);
      ctx.font = `700 50px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText(sec(s.total), cx, 152);
      ctx.font = `600 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText(TQT('de desvío en total'), cx, 188);
      CFG.ROUNDS.forEach((n, k) => {
        const e = s.errs[k] || 0, y = 232 + k * 46;
        rr(ctx, 50, y - 19, 230, 38, 13, '#FFF3E6');
        ctx.font = `700 15px ${FD}`; ctx.textAlign = 'left'; ctx.fillStyle = COL.ink; ctx.fillText(TQT('Desde {a} s').replace('{a}', n), 64, y);
        ctx.textAlign = 'right'; ctx.font = `600 14px ${FB}`; ctx.fillStyle = Math.abs(e) < 150 ? COL.good : COL.coralD; ctx.fillText((e > 0 ? '+' : (e < 0 ? '−' : '')) + sec(Math.abs(e)), 266, y);
      });
      ctx.textAlign = 'center'; ctx.font = `600 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText(TQT('Récord: ') + sec(s.best), cx, 376);
      button(ctx, BTN, TQT('Otra vez'), s.ui.pressed === 'btn');
      return;
    }
    // jugando: arriba, tu récord y la última partida (más adelante: récord mundial)
    pill(ctx, 14, 14, 112, TQT('Tu récord'), s.best ? sec(s.best) : '—', 'left');
    pill(ctx, CFG.W - 126, 14, 112, TQT('Última partida'), s.last ? sec(s.last) : '—', 'right');
    for (let k = 0; k < CFG.ROUNDS.length; k++) {
      ctx.fillStyle = k < s.r ? (Math.abs(s.errs[k]) < 150 ? COL.good : COL.coral) : (k === s.r ? '#FFC53D' : '#F1DCC6');
      ctx.beginPath(); ctx.arc(cx - 20 + k * 20, 34, k === s.r ? 6.5 : 5, 0, 7); ctx.fill();
    }
    const n = CFG.ROUNDS[s.r];
    ctx.font = `700 22px ${FD}`; ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(TQT('Cuenta atrás desde {a}').replace('{a}', n), cx, 76);
    // lo que marca el reloj va a su velocidad; el error se mide en tiempo real
    const sp = spd(s), T = n * 1000, el = s.phase === 'ready' ? 0 : (s.phase === 'run' ? s.runT * sp : T + s.err * sp), p = el / T;
    if (sp !== 1) {
      const lbl = TQT(sp > 1 ? 'Este reloj va más rápido' : 'Este reloj va más lento');
      ctx.font = `600 14px ${FB}`; const w = ctx.measureText(lbl).width + 26;
      LBL = { lbl, w, fast: sp > 1 };
    } else LBL = null;
    let shown = p < CFG.SEE ? 1 : clamp(1 - (p - CFG.SEE) / CFG.FADE, 0, 1);
    if (s.phase !== 'run') shown = 1; // antes de empezar y al parar se ve todo
    stopwatch(ctx, s, cx, 250, 92, n - el / 1000, n, shown, true); // sin número: se juega mirando la aguja (Jose, 11 oct)
    if (LBL) { // aviso de la velocidad, debajo del reloj
      rr(ctx, cx - LBL.w / 2, 372, LBL.w, 25, 12.5, LBL.fast ? '#FFE1D6' : '#D9F4EE');
      ctx.font = `600 14px ${FB}`; ctx.fillStyle = LBL.fast ? COL.coralD : COL.tealEdge; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(LBL.lbl, cx, 385);
    }
    if (s.phase === 'ready') para(ctx, TQT('Toca la pantalla para empezar y otra vez cuando creas que llega a cero.'), cx, 410, 250, 44, 15, 800, FB, COL.muted, 1.3);
    else if (s.phase === 'run') para(ctx, p < CFG.SEE ? TQT('Mira bien el ritmo…') : TQT('Ahora cuenta tú…'), cx, 410, 250, 44, 16, 800, FB, COL.muted, 1.3);
    else {
      const e = s.err;
      ctx.font = `700 26px ${FD}`; ctx.fillStyle = Math.abs(e) < 150 ? COL.good : COL.ink; ctx.textAlign = 'center'; ctx.fillText(TQT(verdict(e)), cx, 418);
      ctx.font = `600 15px ${FB}`; ctx.fillStyle = COL.muted;
      ctx.fillText(Math.abs(e) < 5 ? TQT('¡Exacto!') : ((e > 0 ? TQT('Te pasaste') : TQT('Te adelantaste')) + ' ' + sec(Math.abs(e))), cx, 446);
      if (s.stopT > 0.5) { ctx.font = `600 13px ${FB}`; ctx.fillText(TQT(s.r >= CFG.ROUNDS.length - 1 ? 'Toca para ver el resultado' : 'Toca para la siguiente ronda'), cx, 476); }
    }
  }

  let H = null;
  function toL(e) { const r = H.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - H.ox) / H.k, y: (e.clientY - r.top - H.oy) / H.k }; }
  function hit(b, p) { return p.x >= b.x - 8 && p.x <= b.x + b.w + 8 && p.y >= b.y - 8 && p.y <= b.y + b.h + 14; }
  function onDown(e) {
    if (!H) return; e.preventDefault(); const s = H.s, p = toL(e);
    if (s.phase === 'start' || s.phase === 'over') { if (hit(BTN, p)) s.ui.pressed = 'btn'; return; }
    tap(s); // al tocar (no al soltar): así el tiempo es exacto
  }
  function onUp(e) { if (!H) return; const s = H.s, p = toL(e), pr = s.ui.pressed; s.ui.pressed = null; if (pr === 'btn' && hit(BTN, p)) begin(s); }
  function onKey(e) { if (!H) return; if (e.key === ' ' || e.key === 'Enter') { const s = H.s; if (s.phase === 'start' || s.phase === 'over') begin(s); else tap(s); } }
  function resize() {
    if (!H) return; const c = H.container, cw = c.clientWidth || CFG.W; H.canvas.style.height = '0px';
    let ch = c.clientHeight; if (ch < 50) ch = (cw * CFG.H) / CFG.W; const dpr = Math.min(3, root.devicePixelRatio || 1);
    H.canvas.style.width = cw + 'px'; H.canvas.style.height = ch + 'px'; H.canvas.width = Math.round(cw * dpr); H.canvas.height = Math.round(ch * dpr);
    H.k = Math.min(cw / CFG.W, ch / CFG.H); H.ox = (cw - CFG.W * H.k) / 2; H.oy = (ch - CFG.H * H.k) / 2; H.dpr = dpr;
    H.s.view = { x0: -H.ox / H.k, y0: -H.oy / H.k, x1: (cw - H.ox) / H.k, y1: (ch - H.oy) / H.k };
  }
  function frame(now) {
    if (!H) return; const dt = Math.min(0.05, Math.max(0, (now - (H.last || now)) / 1000)); H.last = now;
    update(H.s, dt);
    const ctx = H.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, H.canvas.width, H.canvas.height);
    ctx.setTransform(H.k * H.dpr, 0, 0, H.k * H.dpr, H.ox * H.dpr, H.oy * H.dpr); draw(ctx, H.s);
    H.raf = root.requestAnimationFrame(frame);
  }
  function mount(el) {
    if (H) unmount();
    const canvas = document.createElement('canvas'); canvas.style.display = 'block'; canvas.style.touchAction = 'none'; canvas.setAttribute('aria-label', TQT('Reloj de Tiny'));
    el.appendChild(canvas);
    H = { container: el, canvas, ctx: canvas.getContext('2d'), s: createState(), raf: 0, last: 0, k: 1, ox: 0, oy: 0, dpr: 1 };
    resize(); canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); root.addEventListener('keydown', onKey);
    if (root.ResizeObserver) { H.ro = new root.ResizeObserver(resize); H.ro.observe(el); } else root.addEventListener('resize', resize);
    H.raf = root.requestAnimationFrame(frame);
  }
  function unmount() {
    if (!H) return; root.cancelAnimationFrame(H.raf);
    H.canvas.removeEventListener('pointerdown', onDown); H.canvas.removeEventListener('pointerup', onUp); root.removeEventListener('keydown', onKey);
    if (H.ro) H.ro.disconnect(); else root.removeEventListener('resize', resize);
    if (H.canvas.parentNode) H.canvas.parentNode.removeChild(H.canvas); H = null;
  }
  root.TQReloj = { mount, unmount, again: () => { if (H) begin(H.s); }, _debug: { get s() { return H && H.s; }, tap: () => H && tap(H.s), begin: () => H && begin(H.s) } };
})(typeof window !== 'undefined' ? window : this);
