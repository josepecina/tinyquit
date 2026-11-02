/* =====================================================================
 * TinyQuit · Minigolf v7 — física (pura, sin dibujo). La usan el juego (golf.js) y el
 * comprobador de hoyos en Node (solve.js), así lo que se comprueba es exactamente lo que se juega.
 * Unidades: px del campo lógico (330 × 525) y segundos. Paso fijo de 1/240 s.
 * ===================================================================== */
(function (root) {
  'use strict';
  const P = {
    DT: 1 / 240,
    R: 6.5,              // radio de la bola
    CUP: 11,             // radio del hoyo
    G_CUP: 450,          // «gravedad» al pasar por encima del hoyo (px/s²)
    Z_IN: 0.55,          // si al llegar al borde de enfrente ya ha caído más que esto (× radio): dentro
    Z_LIP: 0.2,          // entre Z_LIP y Z_IN: se engancha en el borde y da la vuelta («corbata»)
    RIDE_DROP: 70,       // dando la vuelta al borde, más lenta que esto (px/s): cae dentro
    ROLL_K: 0.95,        // rozamiento proporcional a la velocidad (1/s)
    ROLL_A: 70,          // rozamiento constante (px/s²)
    SAND_A: 900,         // en la arena frena mucho
    E_WALL: 0.72, F_WALL: 0.06, E_BUMP: 1.25,
    V_MIN: 70, V_MAX: 920, DRAG_MAX: 110,  // golpe: arrastre de 0 a 110 px → 70 a 920 px/s
    STOP_V: 7, SLOPE_STATIC: 55,
    JUMP_VMIN: 330,
    ICE_A: 6, ICE_K: 0.12, // en el hielo casi no frena
    PIPE_IN: 10,          // radio de la boca de una tubería      // velocidad mínima para que una rampa de salto te haga volar
  };

  const hypot = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /** fuerza del golpe a partir de cuánto arrastras */
  function shotSpeed(dragLen) { const p = Math.pow(clamp(dragLen, 0, P.DRAG_MAX) / P.DRAG_MAX, 1.3); return P.V_MIN + p * (P.V_MAX - P.V_MIN); }

  // ---------------------------------------------------------------- preparación del hoyo
  /** Pasa la descripción del hoyo a segmentos de choque (bordes del césped, muros, bloques y barandillas). */
  function build(L) {
    const segs = [];
    const poly0 = L.shape;
    const dSeg = (px, py, a, b) => { const ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey; let u = l2 ? ((px - a[0]) * ex + (py - a[1]) * ey) / l2 : 0; u = clamp(u, 0, 1); return hypot(px - a[0] - ex * u, py - a[1] - ey * u); };
    const onEdge = (px, py) => poly0.some((a, i) => dSeg(px, py, a, poly0[(i + 1) % poly0.length]) < 0.6);
    // un lado de bloque pegado al borde del campo no se añade: dos paredes en el mismo sitio empujaban la bola hacia dentro del bloque
    const add = (x1, y1, x2, y2, th, kind) => { if (kind !== 'edge' && onEdge(x1, y1) && onEdge(x2, y2) && onEdge((x1 + x2) / 2, (y1 + y2) / 2)) return; segs.push({ x1, y1, x2, y2, th: th || 0, kind: kind || 'wall' }); };
    const poly = L.shape;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; add(a[0], a[1], b[0], b[1], 0, 'edge'); }
    (L.walls || []).forEach((w) => add(w[0], w[1], w[2], w[3], w[4] == null ? 4 : w[4]));
    // pirámides (vistas desde arriba: un cuadrado, girado [rot] radianes)
    (L.pyramids || []).forEach((q) => { const pts = pyrPts(q); for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4]; add(a[0], a[1], b[0], b[1], 0); } });
    (L.polys || []).forEach((pg) => { for (let i = 0; i < pg.length; i++) { const a = pg[i], b = pg[(i + 1) % pg.length]; add(a[0], a[1], b[0], b[1], 0); } });
    // molino clásico: casita con un túnel; las aspas tapan la entrada cuando pasan por abajo (ver movers)
    (L.windmill || []).forEach((m) => { const [cx, cy, w, h, tw] = m, x0 = cx - w / 2, y0 = cy - h / 2, a = cx - tw / 2, c = cx + tw / 2, y1 = y0 + h;
      [[x0, y0, a, y0], [a, y0, a, y1], [a, y1, x0, y1], [x0, y1, x0, y0], [c, y0, x0 + w, y0], [x0 + w, y0, x0 + w, y1], [x0 + w, y1, c, y1], [c, y1, c, y0]].forEach((q) => add(q[0], q[1], q[2], q[3], 0)); });
    (L.blocks || []).forEach((b) => { const [x, y, w, h] = b; add(x, y, x + w, y); add(x + w, y, x + w, y + h); add(x + w, y + h, x, y + h); add(x, y + h, x, y); });
    // puentes: barandillas en los lados largos
    (L.bridge || []).forEach((b) => { const [x, y, w, h] = b; if (h >= w) { add(x, y, x, y + h, 2); add(x + w, y, x + w, y + h, 2); } else { add(x, y, x + w, y, 2); add(x, y + h, x + w, y + h, 2); } });
    return { L, segs };
  }

  function pyrPts(q) { const [cx, cy, h, rot] = q, r = h * Math.SQRT2, a0 = (rot || 0) + Math.PI / 4; return [0, 1, 2, 3].map((k) => [cx + Math.cos(a0 + (k * Math.PI) / 2) * r, cy + Math.sin(a0 + (k * Math.PI) / 2) * r]); }
  /** búnker con forma irregular (como los de verdad): el radio cambia con el ángulo según una semilla de su posición */
  function sandR(e, a) { const sd = e[0] * 0.37 + e[1] * 0.91; return 1 + 0.16 * Math.sin(2 * a + sd) + 0.1 * Math.sin(3 * a + sd * 1.7) + 0.06 * Math.sin(5 * a + sd * 0.6); }
  function inSandE(e, x, y) { const dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[3], a = Math.atan2(dy, dx); return Math.hypot(dx, dy) < sandR(e, a); }
  function inRect(r, x, y) { return x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3]; }
  function inEll(e, x, y, shrink) { const dx = (x - e[0]) / (e[2] - (shrink || 0)), dy = (y - e[1]) / (e[3] - (shrink || 0)); return dx * dx + dy * dy < 1; }
  function inPoly(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

  /** Piezas que se mueven (en este instante t, en segundos): aspas de molino y bloques que van y vienen. */
  function movers(L, t) {
    const out = [];
    (L.mill || []).forEach((m) => {
      const [cx, cy, len, per, n] = m, om = (Math.PI * 2) / per;
      for (let k = 0; k < n; k++) {
        const th = om * t + (k * Math.PI * 2) / n;
        out.push({ x1: cx, y1: cy, x2: cx + Math.cos(th) * len, y2: cy + Math.sin(th) * len, th: 3, mill: { cx, cy, om } });
      }
    });
    (L.slider || []).forEach((sl) => {
      const [x, y, w, h, dx, dy, per] = sl, u = Math.sin(((Math.PI * 2) / per) * t), vx = (dx * Math.cos(((Math.PI * 2) / per) * t) * (Math.PI * 2)) / per / 2, vy = (dy * Math.cos(((Math.PI * 2) / per) * t) * (Math.PI * 2)) / per / 2;
      const ox = x + (dx * (u + 1)) / 2, oy = y + (dy * (u + 1)) / 2;
      [[ox, oy, ox + w, oy], [ox + w, oy, ox + w, oy + h], [ox + w, oy + h, ox, oy + h], [ox, oy + h, ox, oy]].forEach((s) => out.push({ x1: s[0], y1: s[1], x2: s[2], y2: s[3], th: 0, vel: [vx, vy] }));
    });
    (L.windmill || []).forEach((m) => {
      const [cx, cy, , h, tw, per, n] = m, om = (Math.PI * 2) / per, len = h / 2 + 18, my = cy + h / 2;
      if (millClosed(m, t)) out.push({ x1: cx - tw / 2, y1: my, x2: cx + tw / 2, y2: my, th: 2 });
      // la parte de cada aspa que asoma por debajo de la casita también golpea la bola
      for (let k = 0; k < n; k++) {
        const a = om * t + (k * Math.PI * 2) / n, sa = Math.sin(a), ca = Math.cos(a);
        if (sa * len <= h / 2 + 1) continue;
        const u0 = h / 2 / (len * sa);
        out.push({ x1: cx + ca * len * u0, y1: my, x2: cx + ca * len, y2: cy + sa * len, th: 4, mill: { cx, cy, om } });
      }
    });
    return out;
  }
  /** ¿el túnel del molino está tapado por un aspa en el instante t? (aspa apuntando hacia abajo ± 20°) */
  function millClosed(m, t) { const per = m[5], n = m[6]; for (let k = 0; k < n; k++) { let a = (((Math.PI * 2) / per) * t + (k * Math.PI * 2) / n) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; if (Math.abs(a - Math.PI / 2) < 0.35) return true; } return false; }
  function moversDraw(L, t) { return movers(L, t); }

  // ---------------------------------------------------------------- bola
  function newBall(L) { return { x: L.ball[0], y: L.ball[1], vx: 0, vy: 0, moving: false, z: 0, vz: 0, over: false, ride: null, air: 0, sunk: false, lastX: L.ball[0], lastY: L.ball[1], lip: 0, splash: 0, portalLock: false, events: [] }; }

  function shoot(b, ang, speed) { b.still = 0; b.lastX = b.x; b.lastY = b.y; b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed; b.moving = true; b.z = 0; b.vz = 0; b.over = false; b.ride = null; }

  function collideSeg(b, s, R) {
    const ex = s.x2 - s.x1, ey = s.y2 - s.y1, l2 = ex * ex + ey * ey;
    let u = l2 > 0 ? ((b.x - s.x1) * ex + (b.y - s.y1) * ey) / l2 : 0; u = clamp(u, 0, 1);
    const qx = s.x1 + ex * u, qy = s.y1 + ey * u;
    let dx = b.x - qx, dy = b.y - qy; const d = hypot(dx, dy), md = R + s.th;
    if (d >= md) return false;
    let nx, ny;
    if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = -ey / Math.sqrt(l2 || 1); ny = ex / Math.sqrt(l2 || 1); }
    b.x = qx + nx * md; b.y = qy + ny * md;
    // velocidad de la superficie (aspas y bloques que se mueven)
    let svx = 0, svy = 0;
    if (s.mill) { const rx = qx - s.mill.cx, ry = qy - s.mill.cy; svx = -ry * s.mill.om; svy = rx * s.mill.om; }
    if (s.vel) { svx = s.vel[0]; svy = s.vel[1]; }
    let rvx = b.vx - svx, rvy = b.vy - svy; const dot = rvx * nx + rvy * ny;
    if (dot < 0) {
      rvx -= (1 + P.E_WALL) * dot * nx; rvy -= (1 + P.E_WALL) * dot * ny;
      const tv = -rvx * ny + rvy * nx; rvx -= P.F_WALL * tv * -ny; rvy -= P.F_WALL * tv * nx;
      b.vx = rvx + svx; b.vy = rvy + svy;
      if (Math.abs(dot) > 40) b.events.push('wall');
      return true;
    }
    return false;
  }

  /** Avanza un paso de física. t = tiempo del hoyo (s). Devuelve nada; deja avisos en b.events. */
  function step(W, b, t) {
    const L = W.L, R = P.R, dt = P.DT;
    if (b.sunk) return;
    const spd0 = hypot(b.vx, b.vy);
    // --- dando la vuelta al borde del hoyo («corbata»)
    if (b.ride) {
      const rd = b.ride, cx = L.cup[0], cy = L.cup[1];
      rd.a += (rd.w * dt) / P.CUP; rd.w *= Math.exp(-1.6 * dt); rd.turn += Math.abs(rd.w * dt) / P.CUP;
      b.x = cx + Math.cos(rd.a) * P.CUP; b.y = cy + Math.sin(rd.a) * P.CUP;
      const tx = -Math.sin(rd.a) * Math.sign(rd.w), ty = Math.cos(rd.a) * Math.sign(rd.w), sp = Math.abs(rd.w);
      b.vx = tx * sp; b.vy = ty * sp;
      if (sp < P.RIDE_DROP) { b.ride = null; return sink(b, L); }
      if (rd.turn > rd.max) { // se escapa: sale por la tangente, más lenta
        b.ride = null; b.vx = tx * sp * 0.75 + Math.cos(rd.a) * 25; b.vy = ty * sp * 0.75 + Math.sin(rd.a) * 25; b.over = false; b.z = 0; b.events.push('lipout');
        b.x = cx + Math.cos(rd.a) * (P.CUP + 2.5); b.y = cy + Math.sin(rd.a) * (P.CUP + 2.5);
      }
      return;
    }
    // --- en el aire (rampa de salto)
    if (b.air > 0) {
      b.air -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      for (let i = 0; i < W.segs.length; i++) if (W.segs[i].kind === 'edge') collideSeg(b, W.segs[i], R);
      if (b.air <= 0) { b.air = 0; b.events.push('land'); b.vx *= 0.55; b.vy *= 0.55; /* al caer pierde mucha fuerza */ }
      return;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    // --- choques
    for (let i = 0; i < W.segs.length; i++) collideSeg(b, W.segs[i], R);
    const mv = movers(L, t);
    for (let i = 0; i < mv.length; i++) if (collideSeg(b, mv[i], R)) b.moving = true;
    // si una pieza que se mueve aprieta la bola contra una pared, gana la pared (nunca se cuela dentro de un bloque)
    if (mv.length) for (let i = 0; i < W.segs.length; i++) collideSeg(b, W.segs[i], R);
    (L.posts || []).forEach((p) => postHit(b, p, P.E_WALL));
    (L.bumpers || []).forEach((p) => { if (postHit(b, p, P.E_BUMP)) { const sp = hypot(b.vx, b.vy); if (sp < 240) { b.vx *= 240 / (sp || 1); b.vy *= 240 / (sp || 1); } b.events.push('bump'); } });
    // --- fuerzas del terreno
    let fx = 0, fy = 0;
    (L.slopes || []).forEach((s) => {
      if (s.rect && inRect(s.rect, b.x, b.y)) { fx += Math.cos(s.ang) * s.g; fy += Math.sin(s.ang) * s.g; }
      if (s.c) { const dx = b.x - s.c[0], dy = b.y - s.c[1], d = hypot(dx, dy); if (d < s.r && d > 0.5) { const k = (s.g * Math.sin((Math.PI * d) / s.r)) / d; fx += dx * k; fy += dy * k; } }
    });
    if (L.wind) { fx += Math.cos(L.wind[0]) * L.wind[1]; fy += Math.sin(L.wind[0]) * L.wind[1]; }
    (L.boost || []).forEach((p) => { if (inRect(p, b.x, b.y)) { fx += Math.cos(p[4]) * p[5]; fy += Math.sin(p[4]) * p[5]; } });
    (L.belt || []).forEach((c) => { if (inRect(c, b.x, b.y)) { b.vx += (c[4] - b.vx) * 3.2 * dt; b.vy += (c[5] - b.vy) * 3.2 * dt; } });
    b.vx += fx * dt; b.vy += fy * dt;
    // tope de velocidad
    let sp = hypot(b.vx, b.vy); if (sp > 1100) { b.vx *= 1100 / sp; b.vy *= 1100 / sp; sp = 1100; }
    // --- rampa de salto
    (L.jump || []).forEach((j) => {
      if (!inRect(j, b.x, b.y)) return;
      const along = b.vx * Math.cos(j[4]) + b.vy * Math.sin(j[4]);
      if (along > P.JUMP_VMIN) { b.air = 0.00055 * along; b.events.push('jump'); }
    });
    // --- portales (de ida)
    (L.portal || []).forEach((pt) => {
      const da = hypot(b.x - pt[0], b.y - pt[1]), db = hypot(b.x - pt[2], b.y - pt[3]);
      if (da < 9 && !b.portalLock) { const k = sp > 0 ? 18 / sp : 0; b.x = pt[2] + b.vx * k; b.y = pt[3] + b.vy * k; b.portalLock = true; b.events.push('portal'); }
      else if (da > 22 && db > 22) b.portalLock = false;
    });
    // --- tuberías (entras por la boca A y sales por la B en su dirección, con casi toda la fuerza)
    (L.pipe || []).forEach((pp) => {
      const da = hypot(b.x - pp[0], b.y - pp[1]);
      if (da < P.PIPE_IN && !b.portalLock && sp > 40) { const ea = pp[4], v = Math.max(120, sp * 0.92); b.x = pp[2] + Math.cos(ea) * 12; b.y = pp[3] + Math.sin(ea) * 12; b.vx = Math.cos(ea) * v; b.vy = Math.sin(ea) * v; b.portalLock = true; b.events.push('pipe'); }
      else if (da > 22 && hypot(b.x - pp[2], b.y - pp[3]) > 22 && !(L.portal || []).length) b.portalLock = false;
    });
    // --- agua
    const onBridge = (L.bridge || []).some((r) => inRect(r, b.x, b.y));
    if (!onBridge && ((L.water || []).some((e) => inEll(e, b.x, b.y, 2)) || (L.pond || []).some((r) => inRect(r, b.x, b.y)))) {
      b.events.push('water'); b.x = b.lastX; b.y = b.lastY; b.vx = b.vy = 0; b.moving = false; b.splash = 1; b.over = false; b.z = 0; return;
    }
    // --- rozamiento
    const inSand = (L.sand || []).some((e) => inSandE(e, b.x, b.y)), onIce = !inSand && (L.ice || []).some((r) => inRect(r, b.x, b.y));
    sp = hypot(b.vx, b.vy);
    if (sp > 0) { const a = (inSand ? P.SAND_A : (onIce ? P.ICE_A : P.ROLL_A)) * dt, k = Math.exp(-(onIce ? P.ICE_K : P.ROLL_K) * dt); const ns = Math.max(0, sp * k - a); b.vx *= ns / sp; b.vy *= ns / sp; sp = ns; }
    // --- hoyo
    cup(b, L, sp);
    if (b.sunk || b.ride) return;
    // --- parar
    // (en una cuesta fuerte la bola nunca se queda quieta: sigue rodando y no se puede golpear)
    // se para si va muy despacio y la cuesta no puede con el rozamiento, o si lleva un rato casi quieta
    // (apoyada en un poste o una pared en cuesta, o en el fondo de una hondonada): así nunca se queda «pillada» sin poder golpear
    b.still = sp < P.STOP_V * 1.5 ? (b.still || 0) + dt : 0;
    if ((sp < P.STOP_V && hypot(fx, fy) < Math.max(P.SLOPE_STATIC, P.ROLL_A)) || b.still > 0.35) { b.vx = b.vy = 0; b.moving = false; b.still = 0; } else b.moving = true;
  }

  function postHit(b, p, e) {
    const dx = b.x - p[0], dy = b.y - p[1], d = hypot(dx, dy), md = P.R + p[2];
    if (d >= md) return false;
    const nx = d > 0 ? dx / d : 1, ny = d > 0 ? dy / d : 0; b.x = p[0] + nx * md; b.y = p[1] + ny * md;
    const dot = b.vx * nx + b.vy * ny; if (dot < 0) { b.vx -= (1 + e) * dot * nx; b.vy -= (1 + e) * dot * ny; return true; }
    return false;
  }

  /** El hoyo de verdad: al pasar por encima, la bola va cayendo. Si al llegar al otro borde ya ha caído bastante, entra;
   *  si ha caído un poco, se engancha en el borde y da la vuelta (a veces entra y a veces sale: «corbata»);
   *  si va muy rápida, pasa por encima. Una bola lenta que se queda al borde, cae. */
  function cup(b, L, sp) {
    const cx = L.cup[0], cy = L.cup[1], dx = b.x - cx, dy = b.y - cy, d = hypot(dx, dy), R = P.R;
    if (d < P.CUP) {
      if (!b.over) { b.over = true; b.z = 0; b.vz = 0; }
      b.vz += P.G_CUP * P.DT; b.z += b.vz * P.DT;
      if (b.z > R * 1.1) return sink(b, L); // ya está dentro del todo
      return;
    }
    if (b.over) {
      // acaba de llegar al borde de enfrente
      b.over = false;
      const nx = dx / d, ny = dy / d, vr = b.vx * nx + b.vy * ny;
      if (b.z >= P.Z_IN * R) { // choca con la pared de dentro del hoyo: dentro
        return sink(b, L);
      }
      if (b.z >= P.Z_LIP * R && vr > 0) {
        // corbata: el borde frena la parte que sale y la convierte en giro alrededor del hoyo
        const tv = -b.vx * ny + b.vy * nx;            // velocidad tangencial (con signo)
        const deep = (b.z - P.Z_LIP * R) / ((P.Z_IN - P.Z_LIP) * R); // 0 = apenas tocó, 1 = casi dentro
        const w = (Math.abs(tv) + vr * (0.35 + 0.4 * deep)) * Math.sign(tv || 1) * 0.8;
        b.ride = { a: Math.atan2(dy, dx), w, turn: 0, max: Math.PI * (0.25 + 0.75 * deep) };
        b.x = cx + nx * P.CUP; b.y = cy + ny * P.CUP; b.z = 0;
        b.events.push('lip');
        return;
      }
      // pasa por encima: el borde la desvía un poco y le quita algo de fuerza
      if (vr > 0) { b.vx -= nx * vr * 0.12; b.vy -= ny * vr * 0.12; }
      b.z = 0;
      return;
    }
    // bola lenta parada (o casi) colgando del borde: cae
    if (d < P.CUP + R * 0.35 && sp < 40) return sink(b, L);
  }
  function sink(b, L) { b.sunk = true; b.moving = false; b.vx = b.vy = 0; b.x = L.cup[0]; b.y = L.cup[1]; b.events.push('sink'); }

  /** Simula un golpe completo (para el comprobador). Devuelve el estado final de la bola. */
  function simulate(W, ball, ang, speed, t0, maxT) {
    const b = Object.assign(newBall(W.L), { x: ball.x, y: ball.y });
    shoot(b, ang, speed); let t = t0 || 0; const T = maxT || 14;
    let water = false;
    while ((b.moving || b.ride || b.air > 0) && !b.sunk && t < (t0 || 0) + T) { step(W, b, t); t += P.DT; if (b.events.length) { if (b.events.includes('water')) water = true; b.events.length = 0; } }
    return { x: b.x, y: b.y, sunk: b.sunk, water, t };
  }

  const api = { P, millClosed, pyrPts, sandR, build, step, newBall, shoot, shotSpeed, simulate, movers: moversDraw, inPoly, inEll, inRect };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TQGolfPhys = api;
})(typeof window !== 'undefined' ? window : this);
