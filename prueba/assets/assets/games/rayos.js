/* =====================================================================
 * TinyQuit · Minijuego «Rayos de sol» (v7, tanda 4) — canvas 2D
 * ---------------------------------------------------------------------
 * API:  window.TQRayos = { mount(containerEl), unmount() }
 *
 * v7 (b98, idea de Jose): nubes de tormenta entran por un lado y salen por el otro
 * (cada una a su velocidad y altura; al principio una, luego cada vez más) y sueltan
 * gotas pequeñas, gotas grandes (2 rayos) y granizo (rápido). Tiny dispara rayos de sol:
 * lo que aciertas se vuelve una nubecita blanca feliz. Si llegan 3 al suelo, se acaba.
 * Regalos en burbujas: triple rayo, cámara lenta, vida, paraguas, rayo gordo y arcoíris.
 * Nunca caen cajetillas ni nada que recuerde al tabaco.
 *
 * Campo lógico 330 × 525 (igual que los otros juegos), centrado y escalado.
 * Puente con la app: window.TQ_TR (textos), window.TQ_BEST (récord) y
 * window.TQBridge.postMessage(json) con {game:'rayos', score, hits, hail, bigs, rainbows, combo, ms} y {ev:'play'} al empezar.
 * ===================================================================== */
(function (root) {
  'use strict';

  function TQT(s) { try { const d = root.TQ_TR; return (d && typeof d[s] === 'string' && d[s]) || s; } catch (e) { return s; } }
  function tqSend(o) { try { if (root.TQBridge && root.TQBridge.postMessage) root.TQBridge.postMessage(JSON.stringify(o)); } catch (e) { /* sin app */ } }
  function vib(p) { try { if (root.TQBridge) tqSend({ ev: 'vib', p: p }); else if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  function tqBest() { try { const v = +root.TQ_BEST; return isFinite(v) && v > 0 ? Math.floor(v) : 0; } catch (e) { return 0; } }

  /* ============================ 1. AJUSTES ============================ */
  const CFG = {
    W: 330, H: 525,
    GROUND: 462,            // donde «aterriza» lo que no aciertas
    CANNON: { x: 165, y: 452 },
    AIM_MAX: 1.2,           // rad a cada lado de la vertical
    AIM_GAIN: 0.0115,       // rad por px de dedo a los lados (el tope se alcanza a ~105 px del centro)
    SLOW: 0.45,             // velocidad con el reloj de cámara lenta
    FIRE_EVERY: 0.2,        // s entre rayos con el dedo puesto
    RAY_SPEED: 620,         // px/s
    LIVES: 3,
    STORM_Y: 104,           // (ya no se usa: las nubes van a alturas distintas)
    UMB: 8, BEAM: 5, TRIPLE: 6, SLOWT: 6,   // segundos de cada regalo
    STORAGE_KEY: 'tq.rayos.best',
  };
  const COL = {
    ink: '#22324F', muted: '#5B6478', purple: '#7A5AF8', purpleHi: '#A68FFF', purpleEdge: '#5237C9',
    sun: '#FFD23F', sunHi: '#FFF1A8', sunEdge: '#E0A800', smoke: '#8E97A8', smokeD: '#6E788B', white: '#FFFFFF',
  };
  const FD = '"Fredoka","Trebuchet MS",sans-serif', FB = FD; // todo en Fredoka (Jose, 11 oct)

  /* ============================ 2. AYUDAS ============================ */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  function rr(ctx, x, y, w, h, r, fill) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function outlinedText(ctx, t, x, y, font, fill, stroke, lw) {
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.strokeStyle = stroke || 'rgba(34,50,79,.18)'; ctx.lineWidth = lw || 5; ctx.strokeText(t, x, y);
    ctx.fillStyle = fill; ctx.fillText(t, x, y);
  }
  function wrapLines(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
    if (line) lines.push(line);
    return lines;
  }
  /** Nube (la forma de Tiny, en pequeño): centro, ancho, color y sombra. */
  function cloud(ctx, x, y, w, fill, shade) {
    const k = w / 120;
    const circ = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
    const blob = (dy) => {
      circ(x + (34 - 60) * k, y + (58 - 52 + dy) * k, 24 * k);
      circ(x, y + (40 - 52 + dy) * k, 30 * k);
      circ(x + (88 - 60) * k, y + (56 - 52 + dy) * k, 23 * k);
      // base redondeada (como Tiny): un rectángulo con dos medios círculos
      const bx = x - 48 * k, by = y + dy * k, bw = 96 * k, bh = 36 * k, br = 18 * k;
      ctx.beginPath(); ctx.moveTo(bx + br, by); ctx.lineTo(bx + bw - br, by); ctx.arc(bx + bw - br, by + br, br, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(bx + br, by + bh); ctx.arc(bx + br, by + br, br, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    };
    if (shade) { ctx.fillStyle = shade; blob(5); }
    ctx.fillStyle = fill; blob(0);
  }
  function face(ctx, x, y, k, mood) {
    ctx.fillStyle = COL.ink;
    ctx.beginPath(); ctx.ellipse(x - 12 * k, y, 4.2 * k, 5.4 * k, 0, 0, Math.PI * 2); ctx.ellipse(x + 12 * k, y, 4.2 * k, 5.4 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 10.5 * k, y - 2 * k, 1.5 * k, 0, 7); ctx.arc(x + 13.5 * k, y - 2 * k, 1.5 * k, 0, 7); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3 * k; ctx.lineCap = 'round'; ctx.beginPath();
    if (mood === 'sad') { ctx.moveTo(x - 7 * k, y + 13 * k); ctx.quadraticCurveTo(x, y + 7 * k, x + 7 * k, y + 13 * k); }
    else { ctx.moveTo(x - 8 * k, y + 9 * k); ctx.quadraticCurveTo(x, y + 17 * k, x + 8 * k, y + 9 * k); }
    ctx.stroke();
    if (mood !== 'sad') { ctx.fillStyle = 'rgba(255,143,192,.7)'; ctx.beginPath(); ctx.ellipse(x - 21 * k, y + 9 * k, 5 * k, 3.4 * k, 0, 0, 7); ctx.ellipse(x + 21 * k, y + 9 * k, 5 * k, 3.4 * k, 0, 0, 7); ctx.fill(); }
  }

  /* ============================ 3. ESTADO ============================ */
  function createState(best) {
    return {
      phase: 'start', t: 0, playT: 0, overT: 0, best, newBest: false,
      score: 0, hits: 0, hail: 0, bigs: 0, rainbows: 0, combo: 0, bestCombo: 0,
      lives: CFG.LIVES, aim: 0, aimTo: 0, pressing: false, fireT: 0, triple: 0, slow: 0, umb: 0, beam: 0, rainbowFx: 0,
      nextGift: rnd(12, 18), storms: [], stormT: 0.3,
      rays: [], foes: [], freed: [], pops: [], splats: [], shake: 0, flash: 0, ui: { pressed: null },
    };
  }
  function startPlay(s) {
    const b = s.best;
    Object.assign(s, createState(b));
    s.phase = 'play'; s.ms0 = Date.now();
    tqSend({ ev: 'play' });
  }

  /* ============================ 4. LÓGICA ============================ */
  /** Cuántas nubes de tormenta puede haber a la vez: al principio una, luego cada vez más. */
  const maxStorms = (t) => (t < 15 ? 1 : t < 35 ? 2 : t < 60 ? 3 : t < 95 ? 4 : 5);
  /** Una nube de tormenta entra por un lado (al azar) y sale por el otro, a su altura y su velocidad. */
  function newStorm(s) {
    const lv = s.playT, dir = Math.random() < 0.5 ? 1 : -1, w = rnd(96, 124);
    const sp = rnd(28, 52) + Math.min(55, lv * 0.45);
    // a una altura libre (que no se monten unas sobre otras)
    const lanes = [66, 108, 150].filter((ly) => !s.storms.some((o) => Math.abs(o.y - ly) < 30 && (dir > 0 ? o.x < 140 : o.x > 190)));
    const y = (lanes.length ? lanes[Math.floor(Math.random() * lanes.length)] : 66 + Math.random() * 84) + rnd(-6, 6);
    s.storms.push({ x: dir > 0 ? -w * 0.6 : CFG.W + w * 0.6, y, dir, sp, w, dark: Math.min(1, lv / 90) * rnd(0.6, 1), dropT: rnd(0.4, 1.2), t: rnd(0, 6) });
  }
  /** Lo que suelta una nube: gota pequeña, gota grande (más adelante), granizo (más adelante) o un regalo. */
  function drop(s, st) {
    const lv = s.playT, r = Math.random();
    let f;
    if (s.nextGift <= 0) {
      const opts = ['gold', 'clock', 'umb', 'beam'];
      if (lv > 25) opts.push('rainbow');
      if (s.lives < CFG.LIVES) opts.push('life', 'life');
      f = { kind: opts[Math.floor(Math.random() * opts.length)], r: 15, hp: 1, pts: 1, vy: 62 };
      s.nextGift = rnd(13, 20);
    }
    else if (lv > 28 && r < 0.22) f = { kind: 'hail', r: 8, hp: 1, pts: 2, vy: 170 + lv * 1.3 };
    else if (lv > 14 && r < 0.42) f = { kind: 'big', r: 14, hp: 2, pts: 3, vy: 44 + lv * 0.4 };
    else f = { kind: 'drop', r: 9, hp: 1, pts: 1, vy: 62 + lv * 0.75 };
    f.x = clamp(st.x + rnd(-st.w * 0.25, st.w * 0.25), 16, CFG.W - 16); f.y = st.y + st.w * 0.22; f.t = rnd(0, 6); f.hitT = 0;
    s.foes.push(f);
  }
  function fire(s) {
    const n = s.triple > 0 ? 3 : 1, fat = s.beam > 0;
    const base = s.aim;
    for (let k = 0; k < n; k++) {
      const a = base + (n === 3 ? (k - 1) * 0.16 : 0);
      const dx = Math.sin(a), dy = -Math.cos(a);
      s.rays.push({ x: CFG.CANNON.x + dx * 40, y: CFG.CANNON.y - 26 + dy * 40, dx, dy, life: 1.2, fat, done: new Set() });
    }
    s.flash = 0.08;
  }
  /** Algo acertado: se vuelve nubecita blanca; los regalos hacen lo suyo; combo. */
  function clear(s, f) {
    const good = f.kind === 'drop' || f.kind === 'big' || f.kind === 'hail';
    if (good) { s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo); }
    const bonus = good && s.combo >= 10 ? 1 : 0;
    s.score += f.pts + bonus; s.hits++; vib(f.kind === 'big' ? 40 : 14);
    if (f.kind === 'hail') s.hail++;
    if (f.kind === 'big') s.bigs++;
    s.freed.push({ x: f.x, y: f.y, w: f.kind === 'big' ? 40 : 28, vx: rnd(-20, 20), a: 1 });
    s.pops.push({ x: f.x, y: f.y - 14, txt: '+' + (f.pts + bonus), a: 1 });
    if (good && s.combo > 0 && s.combo % 10 === 0) s.pops.push({ x: f.x, y: f.y - 38, txt: TQT('¡Combo!') + ' ×' + s.combo, a: 1.4 });
    const say = (t) => s.pops.push({ x: f.x, y: f.y - 36, txt: TQT(t), a: 1.4 });
    if (f.kind === 'gold') { s.triple = CFG.TRIPLE; say('¡Triple rayo!'); }
    if (f.kind === 'clock') { s.slow = CFG.SLOWT; say('¡Cámara lenta!'); }
    if (f.kind === 'life') { s.lives = Math.min(CFG.LIVES, s.lives + 1); say('¡Una vida más!'); }
    if (f.kind === 'umb') { s.umb = CFG.UMB; say('¡Paraguas!'); }
    if (f.kind === 'beam') { s.beam = CFG.BEAM; say('¡Rayo gordo!'); }
    if (f.kind === 'rainbow') {
      // arcoíris: limpia toda la pantalla (y cuenta todo como acertado)
      s.rainbows++; s.rainbowFx = 1.4; vib([30, 40, 30, 40, 60]); say('¡Arcoíris!');
      for (const g of s.foes) if (g !== f && g.hp > 0 && !g.bounce && g.kind !== 'gold' && g.kind !== 'clock' && g.kind !== 'life' && g.kind !== 'umb' && g.kind !== 'beam' && g.kind !== 'rainbow') { g.hp = 0; clear(s, g); }
    }
  }
  function update(s, dt) {
    s.t += dt;
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 3);
    if (s.flash > 0) s.flash -= dt;
    // las nubes de tormenta cruzan la pantalla y desaparecen por el otro lado
    const sdt = s.slow > 0 ? dt * CFG.SLOW : dt;
    if (s.phase === 'play') for (const st of s.storms) { st.x += st.dir * st.sp * sdt; st.t += dt; }
    s.storms = s.storms.filter((st) => (st.dir > 0 ? st.x < CFG.W + st.w * 0.7 : st.x > -st.w * 0.7));
    // nubes liberadas: suben y se van
    for (const c of s.freed) { c.y -= 60 * dt; c.x += c.vx * dt; c.a -= dt * 0.7; }
    s.freed = s.freed.filter((c) => c.a > 0);
    for (const p of s.pops) { p.y -= 30 * dt; p.a -= dt * 1.2; }
    s.pops = s.pops.filter((p) => p.a > 0);
    for (const p of s.splats) p.a -= dt * 0.35;
    s.splats = s.splats.filter((p) => p.a > 0);
    // el cañón gira suave hacia donde apuntas
    s.aim += (s.aimTo - s.aim) * Math.min(1, dt * 18);
    if (s.phase === 'over') { s.overT += dt; return; }
    if (s.phase !== 'play') return;
    s.playT += dt;
    if (s.triple > 0) s.triple -= dt;
    if (s.slow > 0) s.slow -= dt;
    if (s.umb > 0) s.umb -= dt;
    if (s.beam > 0) s.beam -= dt;
    if (s.rainbowFx > 0) s.rainbowFx -= dt;
    const fdt = s.slow > 0 ? dt * CFG.SLOW : dt; // el humo (y lo que cae) va a cámara lenta
    s.nextGift -= dt;
    // disparar mientras se mantiene el dedo
    s.fireT -= dt;
    if (s.pressing && s.fireT <= 0) { fire(s); s.fireT = CFG.FIRE_EVERY; }
    // entran nubes nuevas (cada vez más a la vez) y sueltan cosas mientras están en pantalla
    s.stormT -= fdt;
    if (s.stormT <= 0 && s.storms.length < maxStorms(s.playT)) { newStorm(s); s.stormT = rnd(1.5, 4) * Math.max(0.5, 1 - s.playT / 200); }
    for (const st of s.storms) {
      if (st.x < 18 || st.x > CFG.W - 18) continue;
      st.dropT -= fdt;
      if (st.dropT <= 0) { drop(s, st); st.dropT = Math.max(0.55, 2.1 - s.playT * 0.014) * rnd(0.7, 1.3); }
    }
    for (const r of s.rays) { r.x += r.dx * CFG.RAY_SPEED * dt; r.y += r.dy * CFG.RAY_SPEED * dt; r.life -= dt; }
    for (const f of s.foes) {
      f.t += fdt; f.y += f.vy * fdt; if (f.bounce) { f.vy += 600 * fdt; f.x += f.bvx * fdt; }
      if (f.hitT > 0) f.hitT -= dt;
    }
    // choques rayo → lo que cae (el rayo gordo lo atraviesa todo)
    for (const r of s.rays) {
      if (r.life <= 0) continue;
      for (const f of s.foes) {
        if (f.hp <= 0 || f.bounce || r.done.has(f)) continue;
        const dx = r.x - f.x, dy = r.y - f.y, rr2 = f.r + (r.fat ? 15 : 6);
        if (dx * dx + dy * dy < rr2 * rr2) {
          f.hp--; f.hitT = 0.15;
          if (r.fat) r.done.add(f); else r.life = 0;
          if (f.hp <= 0) clear(s, f);
          if (!r.fat) break;
        }
      }
    }
    s.rays = s.rays.filter((r) => r.life > 0 && r.x > -20 && r.x < CFG.W + 20 && r.y > -20);
    // lo que llega al suelo (con el paraguas, rebota y se va)
    for (const f of s.foes) {
      if (f.bounce) { if (f.y > CFG.H + 40 || f.x < -40 || f.x > CFG.W + 40) f.hp = 0; continue; }
      if (f.hp > 0 && f.y + f.r >= CFG.GROUND - (s.umb > 0 ? 70 : 0)) {
        const bad = f.kind === 'drop' || f.kind === 'big' || f.kind === 'hail';
        if (s.umb > 0 && bad) { f.bounce = true; f.vy = -rnd(160, 230); f.bvx = rnd(-120, 120); continue; }
        f.hp = 0;
        if (bad) {
          s.lives--; s.shake = 1; vib([70, 50, 70]); s.splats.push({ x: f.x, a: 1 }); s.combo = 0;
          s.pops.push({ x: clamp(f.x, 70, CFG.W - 70), y: CFG.GROUND - 30, txt: TQT('¡Se escapó una!'), a: 1.2 });
        }
      }
    }
    s.foes = s.foes.filter((f) => f.hp > 0);
    if (s.lives <= 0) {
      s.phase = 'over'; s.overT = 0; s.pressing = false;
      s.newBest = s.score > s.best;
      if (s.newBest) { s.best = s.score; try { root.localStorage.setItem(CFG.STORAGE_KEY, String(s.best)); } catch (e) { /* sin almacenamiento */ } }
      tqSend({ game: 'rayos', score: s.score, hits: s.hits, hail: s.hail, bigs: s.bigs, rainbows: s.rainbows, combo: s.bestCombo, ms: Date.now() - (s.ms0 || Date.now()) });
    }
  }

  /* ============================ 5. DIBUJO ============================ */
  function drawBg(ctx, s, v) {
    const g = ctx.createLinearGradient(0, v.y0, 0, v.y1);
    g.addColorStop(0, '#9FB6D6'); g.addColorStop(0.28, '#BEE9FF'); g.addColorStop(1, '#E6F7FF');
    ctx.fillStyle = g; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    // colinas
    ctx.fillStyle = '#9BE58A'; ctx.beginPath(); ctx.ellipse(70, CFG.GROUND + 40, 190, 60, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8BD97A'; ctx.beginPath(); ctx.ellipse(290, CFG.GROUND + 46, 200, 64, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5FD46A'; ctx.fillRect(v.x0, CFG.GROUND + 18, v.x1 - v.x0, v.y1 - CFG.GROUND);
    for (const p of s.splats) { ctx.globalAlpha = p.a * 0.8; ctx.fillStyle = COL.smoke; ctx.beginPath(); ctx.ellipse(p.x, CFG.GROUND + 12, 18, 6, 0, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function drawStorms(ctx, s) {
    for (const st of s.storms) {
      const g = Math.round(150 - st.dark * 45), fill = `rgb(${g},${g + 8},${g + 22})`, sh = `rgb(${g - 28},${g - 20},${g - 6})`;
      const bob = Math.sin(st.t * 1.4) * 3;
      cloud(ctx, st.x, st.y + bob, st.w, fill, sh);
      const k = st.w / 120, x = st.x, y = st.y + bob + 8 * k;
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.ellipse(x - 12 * k, y, 3.8 * k, 4.6 * k, 0, 0, 7); ctx.ellipse(x + 12 * k, y, 3.8 * k, 4.6 * k, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 3 * k; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(x - 20 * k, y - 10 * k); ctx.lineTo(x - 8 * k, y - 5 * k); ctx.moveTo(x + 20 * k, y - 10 * k); ctx.lineTo(x + 8 * k, y - 5 * k);
      ctx.moveTo(x - 8 * k, y + 14 * k); ctx.quadraticCurveTo(x, y + 8 * k, x + 8 * k, y + 14 * k); ctx.stroke();
    }
  }
  function bubble(ctx, f, col) {
    const r = f.r * (f.hitT > 0 ? 1.15 : 1) * (1 + Math.sin(f.t * 5) * 0.04);
    ctx.fillStyle = col; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(f.x - r * 0.38, f.y - r * 0.42, r * 0.17, 0, 7); ctx.fill();
  }
  function drawFoe(ctx, f) {
    const k = f.hitT > 0 ? 1.15 : 1, x = f.x, y = f.y;
    if (f.kind === 'drop' || f.kind === 'big') {
      const r = f.r * k, c = f.kind === 'big' ? (f.hp > 1 ? '#3E6FC2' : '#6E9BE0') : '#5B8FD9';
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - r * 1.8); ctx.bezierCurveTo(x + r * 1.05, y - r * 0.4, x + r * 1.05, y + r, x, y + r); ctx.bezierCurveTo(x - r * 1.05, y + r, x - r * 1.05, y - r * 0.4, x, y - r * 1.8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.05, r * 0.2, r * 0.38, 0, 0, 7); ctx.fill();
      // (sin número: la gota grande se distingue por el tamaño y el color, y aclara al primer rayo)
    } else if (f.kind === 'hail') {
      ctx.strokeStyle = 'rgba(201,216,234,.9)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 3, y - 12); ctx.lineTo(x - 3, y - 26); ctx.moveTo(x + 3, y - 10); ctx.lineTo(x + 3, y - 20); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.t * 4); ctx.scale(k, k);
      ctx.fillStyle = '#EEF5FB'; ctx.strokeStyle = '#9CB3CC'; ctx.lineWidth = 1.5; ctx.beginPath();
      [[-7, -1], [-3, -7], [4, -7], [8, -1], [5, 6], [-2, 8], [-7, 4]].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    } else if (f.kind === 'clock') {
      bubble(ctx, f, '#BFE3FF');
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.strokeStyle = '#1F5FA8'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(f.t * 3) * 5, y + Math.sin(f.t * 3) * 5); ctx.moveTo(x, y); ctx.lineTo(x, y - 5); ctx.stroke();
    } else if (f.kind === 'life') {
      bubble(ctx, f, '#FFC2D6');
      const r = 7; ctx.fillStyle = '#FF5A7A'; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.4, x, y - r * 0.5); ctx.bezierCurveTo(x + r * 0.7, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r); ctx.fill();
    } else if (f.kind === 'gold') {
      bubble(ctx, f, '#FFE680'); sunIcon(ctx, x, y + 2, 4.5);
      ctx.strokeStyle = COL.sunEdge; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 6, y - 5); ctx.lineTo(x - 8, y - 10); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 12); ctx.moveTo(x + 6, y - 5); ctx.lineTo(x + 8, y - 10); ctx.stroke();
    } else if (f.kind === 'umb') {
      bubble(ctx, f, '#D9CCFF');
      ctx.fillStyle = COL.purple; ctx.beginPath(); ctx.moveTo(x - 10, y + 1); ctx.quadraticCurveTo(x, y - 15, x + 10, y + 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x, y + 8); ctx.quadraticCurveTo(x, y + 11, x - 3, y + 10); ctx.stroke();
    } else if (f.kind === 'beam') {
      bubble(ctx, f, '#FFD9A8'); rr(ctx, x - 4, y - 10, 8, 20, 4, '#FFB000'); rr(ctx, x - 2, y - 10, 4, 20, 2, '#FFF1A8');
    } else if (f.kind === 'rainbow') {
      bubble(ctx, f, '#E3F9E6');
      [['#FF5A7A', 9], ['#FFD23F', 6.8], ['#4CD964', 4.6], ['#5B8FD9', 2.4]].forEach(([c, r]) => { ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y + 4, r, Math.PI, 0); ctx.stroke(); });
    }
  }
  function drawCannon(ctx, s) {
    const c = CFG.CANNON;
    // tubo del cañón (un rayo de sol) girando desde lo alto de Tiny
    ctx.save(); ctx.translate(c.x, c.y - 26); ctx.rotate(s.aim);
    rr(ctx, -9, -46, 18, 46, 9, COL.sunEdge);
    rr(ctx, -7, -44, 14, 42, 7, s.flash > 0 ? '#FFFFFF' : COL.sun);
    rr(ctx, -4, -42, 4, 30, 2, 'rgba(255,255,255,.55)');
    ctx.restore();
    // Tiny
    cloud(ctx, c.x, c.y - 10, 84, '#FFFFFF', '#CFE3F5');
    face(ctx, c.x, c.y - 4, 0.62, 'happy');
    // sol en la cabeza (la base del cañón)
    ctx.fillStyle = COL.sunEdge; ctx.beginPath(); ctx.arc(c.x, c.y - 26, 12, 0, 7); ctx.fill();
    ctx.fillStyle = COL.sun; ctx.beginPath(); ctx.arc(c.x, c.y - 27, 10, 0, 7); ctx.fill();
  }
  function drawRays(ctx, s) {
    ctx.lineCap = 'round';
    for (const r of s.rays) {
      const fw = r.fat ? 2.6 : 1;
      ctx.strokeStyle = r.fat ? 'rgba(255,176,0,.5)' : 'rgba(255,210,63,.45)'; ctx.lineWidth = 9 * fw; ctx.beginPath(); ctx.moveTo(r.x - r.dx * 18 * fw, r.y - r.dy * 18 * fw); ctx.lineTo(r.x, r.y); ctx.stroke();
      ctx.strokeStyle = '#FFF6C8'; ctx.lineWidth = 4 * fw; ctx.beginPath(); ctx.moveTo(r.x - r.dx * 16 * fw, r.y - r.dy * 16 * fw); ctx.lineTo(r.x, r.y); ctx.stroke();
    }
  }
  function drawHud(ctx, s) {
    rr(ctx, 12, 14, 96, 30, 15, 'rgba(255,255,255,.9)');
    ctx.font = `700 18px ${FD}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = COL.ink;
    sunIcon(ctx, 30, 29, 7);
    ctx.fillStyle = COL.ink; ctx.fillText(String(s.score), 44, 30);
    rr(ctx, CFG.W - 100, 14, 88, 30, 15, 'rgba(255,255,255,.9)');
    for (let i = 0; i < CFG.LIVES; i++) {
      const x = CFG.W - 84 + i * 28, on = i < s.lives;
      if (on) sunIcon(ctx, x, 29, 6.5); else { ctx.fillStyle = '#D5DEEA'; ctx.beginPath(); ctx.arc(x, 29, 6.5, 0, 7); ctx.fill(); }
    }
    let py = 54;
    const tag = (txt, t, bg, fg) => { rr(ctx, CFG.W / 2 - 75, py, 150, 24, 12, bg); ctx.font = `600 12px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fg; ctx.fillText(TQT(txt) + ' ' + Math.ceil(t), CFG.W / 2, py + 12.5); py += 28; };
    if (s.triple > 0) tag('¡Triple rayo!', s.triple, 'rgba(255,241,168,.95)', '#8A5A00');
    if (s.slow > 0) tag('¡Cámara lenta!', s.slow, 'rgba(214,236,255,.95)', '#1F5FA8');
    if (s.umb > 0) tag('¡Paraguas!', s.umb, 'rgba(233,226,255,.95)', '#5237C9');
    if (s.beam > 0) tag('¡Rayo gordo!', s.beam, 'rgba(255,226,190,.95)', '#A15C00');
    if (s.combo >= 5) { ctx.font = `600 13px ${FD}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = COL.ink; ctx.fillText('×' + s.combo, 116, 30); }
    for (const p of s.pops) {
      ctx.globalAlpha = clamp(p.a, 0, 1);
      outlinedText(ctx, p.txt, p.x, p.y, `700 ${p.txt.length > 3 ? 15 : 20}px ${FD}`, '#FFD23F', 'rgba(34,50,79,.75)', 4);
    }
    ctx.globalAlpha = 1;
  }
  /** Solecito: círculo con 8 rayos cortos. */
  function sunIcon(ctx, x, y, r) {
    ctx.strokeStyle = COL.sunEdge; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.moveTo(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2)); ctx.lineTo(x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5)); }
    ctx.stroke(); ctx.fillStyle = COL.sun; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  function drawButton(ctx, b, label, pressed) {
    const off = pressed ? 5 : 0;
    rr(ctx, b.x, b.y + 6, b.w, b.h, b.h / 2, COL.purpleEdge);
    const g = ctx.createLinearGradient(0, b.y + off, 0, b.y + off + b.h);
    g.addColorStop(0, COL.purpleHi); g.addColorStop(1, COL.purple);
    rr(ctx, b.x, b.y + off, b.w, b.h, b.h / 2, g);
    outlinedText(ctx, label, b.x + b.w / 2, b.y + off + b.h / 2 + 1, `600 23px ${FD}`, '#FFFFFF', 'rgba(34,50,79,.2)', 4);
  }
  const START_BTN = { x: 75, y: 334, w: 180, h: 58 };
  const OVER_BTN = { x: 70, y: 308, w: 190, h: 56 };
  function drawCard(ctx, h) {
    rr(ctx, 32, 118 + 6, 266, h, 30, 'rgba(34,50,79,.08)');
    rr(ctx, 32, 118, 266, h, 30, 'rgba(255,255,255,.93)');
  }
  function drawStart(ctx, s) {
    drawCard(ctx, s.best > 0 ? 316 : 300);
    rr(ctx, CFG.W / 2 - 44, 136, 88, 22, 11, '#F1EDFF');
    ctx.font = `600 11px ${FB}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = COL.purple; ctx.fillText(TQT('MINIJUEGO'), CFG.W / 2, 147.5);
    outlinedText(ctx, TQT('Rayos de sol'), CFG.W / 2, 186 + Math.sin(s.t * 1.6), `700 34px ${FD}`, COL.ink, 'rgba(255,210,63,.6)', 6);
    ctx.font = `600 14px ${FB}`; ctx.fillStyle = COL.muted; ctx.textAlign = 'center';
    const lines = wrapLines(ctx, TQT('Mantén el dedo y muévelo a los lados para apuntar. Las nubes de tormenta entran por cualquier lado: convierte sus gotas y el granizo en nubecitas blancas. ¡Que no lleguen 3 al suelo!'), 226);
    lines.forEach((ln, k) => ctx.fillText(ln, CFG.W / 2, 222 + k * 19));
    drawButton(ctx, START_BTN, TQT('Jugar'), s.ui.pressed === 'start');
    if (s.best > 0) { ctx.font = `600 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText(TQT('Récord: ') + s.best, CFG.W / 2, 416); }
  }
  function drawOver(ctx, s) {
    const a = clamp(s.overT * 3, 0, 1);
    ctx.globalAlpha = a;
    drawCard(ctx, 276);
    outlinedText(ctx, s.newBest ? TQT('¡Nuevo récord!') : TQT('¡Bien hecho!'), CFG.W / 2, 156, `700 26px ${FD}`, s.newBest ? COL.sunEdge : COL.ink);
    outlinedText(ctx, String(s.score), CFG.W / 2, 212, `700 60px ${FD}`, COL.ink, 'rgba(255,210,63,.55)', 7);
    ctx.font = `600 13px ${FB}`; ctx.textAlign = 'center'; ctx.fillStyle = COL.muted;
    ctx.fillText(TQT('Nubes salvadas') + ': ' + s.hits, CFG.W / 2, 254);
    ctx.fillText(TQT('Récord: ') + s.best, CFG.W / 2, 276);
    drawButton(ctx, OVER_BTN, TQT('Otra vez'), s.ui.pressed === 'over');
    ctx.globalAlpha = 1;
  }
  function draw(ctx, s) {
    const v = s.view || { x0: 0, y0: 0, x1: CFG.W, y1: CFG.H };
    ctx.save();
    if (s.shake > 0) ctx.translate(Math.sin(s.t * 60) * 4 * s.shake, 0);
    drawBg(ctx, s, v);
    if (s.slow > 0) { ctx.fillStyle = `rgba(77,163,255,${0.12 * Math.min(1, s.slow)})`; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    for (const c of s.freed) { ctx.globalAlpha = clamp(c.a, 0, 1); cloud(ctx, c.x, c.y, c.w, '#FFFFFF', '#DCEBFA'); face(ctx, c.x, c.y + c.w * 0.05, c.w / 110, 'happy'); }
    ctx.globalAlpha = 1;
    drawStorms(ctx, s);
    for (const f of s.foes) drawFoe(ctx, f);
    if (s.umb > 0) { // paraguas gigante sobre el suelo
      const a = Math.min(1, s.umb * 2), y = CFG.GROUND - 70;
      ctx.globalAlpha = 0.85 * a; ctx.fillStyle = COL.purple; ctx.beginPath(); ctx.moveTo(-10, y + 24); ctx.quadraticCurveTo(CFG.W / 2, y - 40, CFG.W + 10, y + 24);
      for (let i = 6; i >= 0; i--) ctx.quadraticCurveTo(-10 + (i + 0.5) * (CFG.W + 20) / 7, y + 12, -10 + i * (CFG.W + 20) / 7, y + 24);
      ctx.fill(); ctx.globalAlpha = 1;
    }
    if (s.rainbowFx > 0) { // arcoíris que cruza el cielo
      ctx.globalAlpha = Math.min(1, s.rainbowFx); const cx = CFG.W / 2, cy = 420, R = 250 + (1.4 - s.rainbowFx) * 30;
      ['#FF5A7A', '#FF9F43', '#FFD23F', '#4CD964', '#5B8FD9', '#A68FFF'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, R - i * 12, Math.PI, 0); ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
    drawRays(ctx, s);
    drawCannon(ctx, s);
    ctx.restore();
    if (s.phase === 'play' || s.phase === 'over') drawHud(ctx, s);
    if (s.phase === 'play' && s.playT < 4 && !s.hits) {
      rr(ctx, CFG.W / 2 - 125, 360, 250, 28, 14, 'rgba(255,255,255,.9)');
      ctx.font = `600 13px ${FB}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = COL.ink;
      ctx.fillText(TQT('Mantén el dedo y muévelo a los lados'), CFG.W / 2, 374.5);
    }
    if (s.phase === 'start') drawStart(ctx, s);
    if (s.phase === 'over') drawOver(ctx, s);
  }

  /* ============================ 6. APP ============================ */
  let H = null;
  let memBest = 0;
  function loadBest() { let v = 0; try { v = parseInt(root.localStorage.getItem(CFG.STORAGE_KEY), 10) || 0; } catch (e) { v = 0; } return Math.max(v, tqBest()); }
  function hit(b, p, pad) { pad = pad || 8; return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + 6 + pad; }
  function toLogical(e) { const r = H.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - H.ox) / H.k, y: (e.clientY - r.top - H.oy) / H.k }; }
  /** Apuntar con el lado a lado del dedo. Sensibilidad intermedia (Jose, 30 sep): ni tan brusca como apuntar
   *  al dedo (con el dedo abajo, moverlo un poco giraba muchísimo) ni tan suave como usar todo el ancho. */
  function aimAt(s, p) {
    s.aimTo = clamp((p.x - CFG.CANNON.x) * CFG.AIM_GAIN, -CFG.AIM_MAX, CFG.AIM_MAX);
  }
  function onDown(e) {
    if (!H) return; e.preventDefault();
    const p = toLogical(e), s = H.s;
    try { H.canvas.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    if (s.phase === 'start') { if (hit(START_BTN, p)) s.ui.pressed = 'start'; }
    else if (s.phase === 'over') { if (s.overT > 0.6 && hit(OVER_BTN, p)) s.ui.pressed = 'over'; }
    else if (s.phase === 'play') { aimAt(s, p); s.aim = s.aimTo * 0.6 + s.aim * 0.4; s.pressing = true; s.fireT = 0; }
  }
  function onMove(e) { if (!H) return; const s = H.s; if (s.phase === 'play' && s.pressing) aimAt(s, toLogical(e)); }
  function onUp(e) {
    if (!H) return;
    const p = toLogical(e), s = H.s, pr = s.ui.pressed;
    s.ui.pressed = null; s.pressing = false;
    if (pr === 'start' && hit(START_BTN, p, 20)) startPlay(s);
    else if (pr === 'over' && hit(OVER_BTN, p, 20)) { memBest = Math.max(memBest, s.best); startPlay(s); }
  }
  function onCancel() { if (H) { H.s.ui.pressed = null; H.s.pressing = false; } }
  function resize() {
    if (!H) return;
    const c = H.container, cw = c.clientWidth || CFG.W;
    H.canvas.style.height = '0px';
    let ch = c.clientHeight; if (ch < 50) ch = (cw * CFG.H) / CFG.W;
    const dpr = Math.min(3, root.devicePixelRatio || 1);
    H.canvas.style.width = cw + 'px'; H.canvas.style.height = ch + 'px';
    H.canvas.width = Math.round(cw * dpr); H.canvas.height = Math.round(ch * dpr);
    H.k = Math.min(cw / CFG.W, ch / CFG.H); H.ox = (cw - CFG.W * H.k) / 2; H.oy = (ch - CFG.H * H.k) / 2; H.dpr = dpr;
    H.s.view = { x0: -H.ox / H.k, y0: -H.oy / H.k, x1: (cw - H.ox) / H.k, y1: (ch - H.oy) / H.k };
  }
  function frame(now) {
    if (!H) return;
    const dt = Math.min(0.05, Math.max(0, (now - (H.last || now)) / 1000)); H.last = now;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < steps; i++) update(H.s, dt / steps);
    const ctx = H.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, H.canvas.width, H.canvas.height);
    ctx.setTransform(H.k * H.dpr, 0, 0, H.k * H.dpr, H.ox * H.dpr, H.oy * H.dpr);
    draw(ctx, H.s);
    H.raf = root.requestAnimationFrame(frame);
  }
  function mount(containerEl) {
    if (H) unmount();
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block'; canvas.style.touchAction = 'none'; canvas.style.userSelect = 'none';
    canvas.setAttribute('aria-label', TQT('Rayos de sol'));
    containerEl.appendChild(canvas);
    memBest = Math.max(memBest, loadBest());
    H = { container: containerEl, canvas, ctx: canvas.getContext('2d'), s: createState(memBest), raf: 0, last: 0, k: 1, ox: 0, oy: 0, dpr: 1 };
    resize();
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    if (root.ResizeObserver) { H.ro = new root.ResizeObserver(resize); H.ro.observe(containerEl); } else root.addEventListener('resize', resize);
    H.raf = root.requestAnimationFrame(frame);
  }
  function unmount() {
    if (!H) return;
    root.cancelAnimationFrame(H.raf);
    H.canvas.removeEventListener('pointerdown', onDown); H.canvas.removeEventListener('pointermove', onMove);
    H.canvas.removeEventListener('pointerup', onUp); H.canvas.removeEventListener('pointercancel', onCancel);
    if (H.ro) H.ro.disconnect(); else root.removeEventListener('resize', resize);
    if (H.canvas.parentNode) H.canvas.parentNode.removeChild(H.canvas);
    H = null;
  }
  root.TQRayos = { mount, unmount, again: () => { if (H) { memBest = Math.max(memBest, H.s.best); startPlay(H.s); } }, _debug: { get s() { return H && H.s; }, startPlay: () => H && startPlay(H.s), CFG } };
})(typeof window !== 'undefined' ? window : this);
