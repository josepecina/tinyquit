/* =====================================================================
 * TinyQuit · "Torre de Tiny" — Tower Stack minigame (HTML5 canvas prototype)
 * ---------------------------------------------------------------------
 * API:   window.TQTorre.mount(containerEl)   window.TQTorre.unmount()
 * Field: fixed logical 330×525 (portrait), scaled to container width.
 *
 * Structure (mirrors a future Flutter CustomPainter port):
 *   1. CFG ............ tuning constants (all gameplay numbers live here)
 *   2. Pure helpers ... math, easing, colour, physics & scoring (no state)
 *   3. State .......... createState() — plain data, no methods
 *   4. Update ......... update(s, dt) and sub-steps (mutate state only)
 *   5. Draw ........... draw(ctx, s) and painters (read state only)
 *   6. Host ........... mount/unmount, rAF loop, pointer input, storage
 *
 * World coordinates: x → right (0..330), y → UP from the ground (px).
 * Screen y = GROUND_SY - (worldY - cameraY).
 * ===================================================================== */
(function (root) {
  'use strict';

  // ---- puente con la app (Flutter): textos traducidos, récord y resultado ----
  // window.TQ_TR = {texto español: traducción}; window.TQ_BEST = récord guardado en la app;
  // window.TQBridge.postMessage(json) (canal de la app) recibe el resultado al terminar.
  function TQT(s) { try { const d = root.TQ_TR; return (d && typeof d[s] === 'string' && d[s]) || s; } catch (e) { return s; } }
  function tqSend(o) { try { if (root.TQBridge && root.TQBridge.postMessage) root.TQBridge.postMessage(JSON.stringify(o)); } catch (e) { /* sin app */ } }
  function vib(p) { try { if (root.TQBridge) tqSend({ ev: 'vib', p: p }); else if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  function tqBest() { try { const v = +root.TQ_BEST; return isFinite(v) && v > 0 ? Math.floor(v) : 0; } catch (e) { return 0; } }

  /* ------------------------------------------------------------------
   * 1. TUNING CONSTANTS
   * ------------------------------------------------------------------ */
  const CFG = {
    // Field
    W: 330, H: 525,
    GROUND_SY: 461,          // screen y of the ground line when camera is at 0

    // Floors (building blocks)
    FLOOR_H: 34,             // front-face height of one floor
    DEPTH_X: 8, DEPTH_Y: 8,  // pseudo-3D offset of the top/side faces
    BASE_W: 150,             // width of the ground floor = max floor width
    MIN_W: 3,                // overlap below this = complete miss

    // Sliding block
    HOVER_GAP: 100,          // px between tower top and the hovering block
    SLIDE_RANGE: 122,        // block centre travels topX ± this
    SPEED0: 125,             // px/s at floor 0
    SPEED_RAMP: 3.2,         // +px/s per floor built
    SPEED_MAX: 285,          // cap
    SIDE_SWITCH_EVERY: 3,    // entry side flips every N floors
    TAP_LOCK: 0.12,          // s after spawn during which taps are ignored

    // Drop & landing
    DROP_G: 2600,            // gravity of the dropped block (px/s²)
    PERFECT_TOL: 5,          // |offset| ≤ this → perfect (snaps, no cut)
    GROW_AFTER: 3,           // perfects in a row needed before regrowth
    GROW_PX: 8,              // width regained per perfect beyond GROW_AFTER-1
    SPAWN_DELAY: 0.2,        // s between landing and next block

    // Sway (damped spring on the top displacement, px)
    SWAY_K: 38,              // stiffness  (ω≈6.2 rad/s ≈ 1 Hz)
    SWAY_DAMP: 2.3,          // damping    (ζ≈0.19 → a few soft wobbles)
    SWAY_IMPULSE: 300,       // px/s kick per (offset / BASE_W)
    SWAY_HEIGHT_SCALE: 25,   // kick grows ×(1 + floors/this)
    SWAY_MAX_PX: 16,         // clamp of the dynamic part
    BEND_MIN_FLOORS: 8,      // short towers bend less (curve normaliser)
    LEAN_MAX_PX: 20,         // static lean shown at danger = 1

    // Balance / collapse
    LEAN_HEIGHT_SCALE: 10,   // danger grows ×(1 + floors/this)
    LEAN_TOL: 0.7,           // fraction of base half-width the COM may drift
    TIP_TIME: 0.55,          // s of "tipping" anticipation before collapse
    TOPPLE_ALPHA: 2.4,       // rad/s² — whole tower rotates rigidly about the base edge…
    TOPPLE_BREAK: 0.2,       // …until this angle (rad), then it breaks into loose floors
    BREAK_MAX_V: 330,        // px/s cap for pieces at breakup
    WORRY_DANGER: 0.6,       // Tiny looks worried above this danger

    // Wind gusts (late game)
    WIND_FROM: 20, WIND_CHANCE: 0.3, WIND_MIN: 28, WIND_MAX: 46, // px/s drift while falling

    // Physics of loose pieces
    DEBRIS_G: 2000, COLLAPSE_G: 1500,
    PILE_X0: -400, PILE_STEP: 4, PILE_COLS: 360,

    // Camera
    CAM_TOP_FRAC: 0.64,      // tower top sits at ~64% of the field height (sliding block above it)
    CAM_EASE: 4.5,           // 1/s exponential follow

    // Tiny (floats in SCREEN space, never rides the floors)
    TINY_SCALE: 0.36,
    TINY_PLAY_Y: 98,         // home height while playing (below the score, above the sliding block)
    TINY_CENTER_DIP: 40,     // dips this much lower when drifting under the score digits
    TINY_BANNER_Y: 166,      // drops to this height while a milestone banner is shown
    TINY_MENU_Y: 398,        // start / game-over: floats between the card and the ground
    TINY_DRIFT_X: 108,       // horizontal drift amplitude around the centre
    TINY_FOLLOW: 3,          // 1/s smoothing towards the drift path
    WOW_COMBO: 5,            // combo from which Tiny goes "wow" instead of a smile

    // Height milestones (floors → banner)
    MILESTONES: [
      [10, TQT('¡Más alto que un árbol!')],
      [25, TQT('¡Tocando las nubes!')],
      [50, TQT('¡Hasta las estrellas!')],
      [75, TQT('¡Saludando a la luna!')],
      [100, TQT('¡Leyenda del cielo!')],
    ],
    STORAGE_KEY: 'tq_torre_best',
  };

  const COL = {
    ink: '#22324F', muted: '#45516D',
    purple: '#7A5AF8', purpleHi: '#9B82FF', purpleEdge: '#5237C9',
    yellow: '#FFC247', yellowEdge: '#E39A1C', orange: '#FF9A3C', red: '#FF5A6E',
    green: '#4CD964', pink: '#FF8FC0', meadowLight: '#9BE39F', meadow: '#5CCB6A',
  };
  const PASTELS = ['#FFB3C7', '#FFD58A', '#A8E6CF', '#B8C8FF', '#FFC4A3', '#D3B8FF', '#9FE3F0', '#C8F09B'];
  const FD = 'Fredoka, sans-serif';
  const FB = 'Fredoka, sans-serif'; // todo en Fredoka (Jose, 11 oct)
  const TAU = Math.PI * 2;

  /* ------------------------------------------------------------------
   * 2. PURE HELPERS
   * ------------------------------------------------------------------ */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const follow = (rate, dt) => 1 - Math.exp(-rate * dt);
  const sign = (v) => (v < 0 ? -1 : 1);

  /** Deterministic hash → [0,1). Used for per-floor decoration. */
  function hash01(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  // Colour
  function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mixC(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return a === undefined || a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
  const WHITE = [255, 255, 255], SHADE = hexRGB('#5B4A8C');
  function makePal(hex) {
    const b = hexRGB(hex);
    return { front: css(b), frontHi: css(mixC(b, WHITE, 0.3)), top: css(mixC(b, WHITE, 0.52)), side: css(mixC(b, SHADE, 0.2)), edge: css(mixC(b, SHADE, 0.34)) };
  }
  const PALS = PASTELS.map(makePal);
  const BASE_PAL = makePal('#FFE6C2');

  /** Slide speed for the n-th floor built. */
  function slideSpeed(n) { return Math.min(CFG.SPEED_MAX, CFG.SPEED0 + CFG.SPEED_RAMP * n); }

  /** Linear ping-pong step. */
  function slideStep(x, dir, v, dt, minX, maxX) {
    x += dir * v * dt;
    if (dir > 0 && x > maxX) { x = 2 * maxX - x; dir = -1; } else if (dir < 0 && x < minX) { x = 2 * minX - x; dir = 1; }
    return { x, dir };
  }

  /** Semi-implicit damped spring step → [pos, vel]. */
  function springStep(p, v, target, k, c, dt) {
    v += (-k * (p - target) - c * v) * dt;
    return [p + v * dt, v];
  }

  /** Horizontal bend displacement of floor i given top sway (px). */
  function bendDisp(i, nTop, sway) {
    if (nTop <= 0) return 0;
    const u = i / Math.max(nTop, CFG.BEND_MIN_FLOORS);
    return sway * u * u;
  }
  function bendAngle(i, nTop, sway) {
    if (nTop <= 0) return 0;
    const hEff = Math.max(nTop, CFG.BEND_MIN_FLOORS);
    return Math.atan((2 * sway * i) / (hEff * hEff * CFG.FLOOR_H));
  }

  /**
   * Landing resolution (pure).
   * topVX: visual centre of the top floor; bx: visual centre of the dropped block.
   * Returns {type:'perfect'|'cut'|'miss', delta, vx (visual centre of kept part), w, grew, combo, cut:{l,r}|null}
   */
  function computeDrop(topVX, topW, bx, bw, combo) {
    const delta = bx - topVX;
    if (Math.abs(delta) <= CFG.PERFECT_TOL) {
      const c = combo + 1;
      let w = bw, grew = false;
      if (c >= CFG.GROW_AFTER && w < CFG.BASE_W) { w = Math.min(CFG.BASE_W, w + CFG.GROW_PX); grew = true; }
      return { type: 'perfect', delta, vx: topVX, w, grew, combo: c, cut: null };
    }
    const pl = topVX - topW / 2, pr = topVX + topW / 2, bl = bx - bw / 2, br = bx + bw / 2;
    const kl = Math.max(pl, bl), kr = Math.min(pr, br);
    if (kr - kl < CFG.MIN_W) return { type: 'miss', delta, vx: bx, w: bw, grew: false, combo: 0, cut: { l: bl, r: br } };
    const cut = delta > 0 ? { l: kr, r: br } : { l: bl, r: kl };
    return { type: 'cut', delta, vx: (kl + kr) / 2, w: kr - kl, grew: false, combo: 0, cut };
  }

  /**
   * Balance of the stack (pure). floors[0] is the base.
   * com = width-weighted centre of mass of floors above the base, relative to the base centre.
   * danger ≥ 1 → collapse. It grows with |com| and with height.
   */
  function stackBalance(floors) {
    const n = floors.length - 1;
    if (n <= 0) return { com: 0, danger: 0, signed: 0, n: 0 };
    const x0 = floors[0].x;
    let m = 0, mx = 0;
    for (let i = 1; i <= n; i++) { m += floors[i].w; mx += floors[i].w * (floors[i].x - x0); }
    const com = mx / m;
    const danger = (Math.abs(com) * (1 + n / CFG.LEAN_HEIGHT_SCALE)) / ((CFG.BASE_W / 2) * CFG.LEAN_TOL);
    return { com, danger, signed: sign(com) * danger, n };
  }

  /** Sky colours for a camera height → {top, mid, bot, night, dusk}. */
  const SKY = {
    day: ['#8AD6FF', '#BEE9FF', '#E6F7FF'].map(hexRGB),
    dusk: ['#8E9CF2', '#FFB7B2', '#FFE0A6'].map(hexRGB),
    night: ['#1D2358', '#433A86', '#8C62AE'].map(hexRGB),
  };
  function skyAt(camY) {
    const t1 = smooth(450, 1150, camY), t2 = smooth(1250, 2000, camY);
    const c = [0, 1, 2].map((k) => mixC(mixC(SKY.day[k], SKY.dusk[k], t1), SKY.night[k], t2));
    return { top: c[0], mid: c[1], bot: c[2], dusk: t1 * (1 - smooth(1150, 1650, camY)), night: t2 };
  }

  // Height map of the rubble pile (world px above ground per column)
  function pileMax(pile, l, r) {
    const a = clamp(Math.floor((l - CFG.PILE_X0) / CFG.PILE_STEP), 0, CFG.PILE_COLS - 1);
    const b = clamp(Math.floor((r - CFG.PILE_X0) / CFG.PILE_STEP), 0, CFG.PILE_COLS - 1);
    let m = 0;
    for (let i = a; i <= b; i++) if (pile[i] > m) m = pile[i];
    return m;
  }
  function pileRaise(pile, l, r, top) {
    const a = clamp(Math.floor((l - CFG.PILE_X0) / CFG.PILE_STEP), 0, CFG.PILE_COLS - 1);
    const b = clamp(Math.floor((r - CFG.PILE_X0) / CFG.PILE_STEP), 0, CFG.PILE_COLS - 1);
    for (let i = a; i <= b; i++) if (pile[i] < top) pile[i] = top;
  }

  /** Where a landing piece comes to rest: slides off towards lower ground (mainly along its motion). */
  function findRestX(pile, x, w, dir) {
    const h = (xx) => pileMax(pile, xx - w / 2 + 2, xx + w / 2 - 2);
    let best = x, bestCost = h(x);
    for (let k = 1; k <= 24; k++) {
      const a = x + dir * k * 8, ca = h(a) + k * 1.2;
      if (ca < bestCost - 0.5) { best = a; bestCost = ca; }
      const b = x - dir * k * 8, cb = h(b) + k * 2.2;
      if (cb < bestCost - 0.5) { best = b; bestCost = cb; }
    }
    return best;
  }

  /**
   * Rigid rectangle vs. pile step. body: {x,y (centre), vx,vy, rot (screen rad), av, w,h, state}
   * upright=true → settles to rot≡0 (Tiny); otherwise to nearest multiple of π.
   * commit=true → the settled body raises the pile (collapse pieces).
   */
  function stepBody(b, dt, g, pile, commit, upright) {
    if (b.delay > 0) { b.delay -= dt; return; }
    if (b.state === 'fall') {
      b.vy -= g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.av * dt;
      const c = Math.abs(Math.cos(b.rot)), sn = Math.abs(Math.sin(b.rot));
      const ex = c * b.w / 2 + sn * b.h / 2, ey = sn * b.w / 2 + c * b.h / 2;
      const floorY = pileMax(pile, b.x - ex, b.x + ex);
      if (b.y - ey <= floorY && b.vy < 0) {
        if (b.bounces < 1 && b.vy < -300) {
          b.y = floorY + ey; b.vy = -b.vy * 0.3; b.vx *= 0.5; b.av *= 0.5; b.bounces++;
          b.justHit = 1;
          return;
        }
        const period = upright ? TAU : Math.PI;
        b.state = 'settle'; b.st = 0; b.fromY = floorY + ey; b.fromRot = b.rot; b.fromX = b.x;
        b.toRot = Math.round(b.rot / period) * period;
        b.toX = upright ? b.x : findRestX(pile, b.x, b.w, sign(b.vx));
        b.toY = pileMax(pile, b.toX - b.w / 2 + 2, b.toX + b.w / 2 - 2) + b.h / 2;
        b.dur = 0.3 + Math.abs(b.toX - b.x) / 380;
        if (commit) pileRaise(pile, b.toX - b.w / 2 + 2, b.toX + b.w / 2 - 2, b.toY + b.h / 2);
        b.justHit = 1;
      }
    } else if (b.state === 'settle') {
      b.st += dt;
      const u = Math.min(1, b.st / b.dur), down = b.toY < b.fromY - 4;
      b.x = lerp(b.fromX, b.toX, easeOutCubic(u));
      b.y = lerp(b.fromY, b.toY, down ? easeInOut(u) : easeOutBack(u));
      b.rot = lerp(b.fromRot, b.toRot, easeOutBack(u));
      if (u >= 1) { b.state = 'rest'; b.restT = 0; }
    } else {
      b.restT = (b.restT || 0) + dt;
    }
  }

  /* ------------------------------------------------------------------
   * 3. STATE
   * ------------------------------------------------------------------ */
  function makeScene() {
    const clouds = [];
    for (let k = 0; k < 44; k++) {
      const near = Math.random() < 0.16 && k > 3;
      clouds.push({
        x: -60 + Math.random() * (CFG.W + 120), y: 150 + k * 105 + Math.random() * 60,
        p: near ? 1.18 + Math.random() * 0.12 : 0.5 + Math.random() * 0.32,
        sc: near ? 1.1 + Math.random() * 0.4 : 0.45 + Math.random() * 0.45,
        vx: (3 + Math.random() * 7) * (Math.random() < 0.5 ? -1 : 1), near,
      });
    }
    const stars = [];
    for (let k = 0; k < 70; k++) stars.push({ x: Math.random() * CFG.W, y: Math.random() * CFG.H, r: 0.6 + Math.random() * 1.1, ph: Math.random() * TAU });
    return { clouds, stars };
  }

  function createState(best, scene) {
    const pile = new Float32Array(CFG.PILE_COLS);
    const base = { x: CFG.W / 2, w: CFG.BASE_W, wd: CFG.BASE_W, c: -1, seed: 1, landT: 9, flash: 0 };
    pileRaise(pile, base.x - base.w / 2, base.x + base.w / 2, CFG.FLOOR_H);
    return {
      phase: 'start', t: 0, phaseT: 0,
      floors: [base], block: null, spawnT: 0, colorIdx: Math.floor(Math.random() * PASTELS.length),
      debris: [], bodies: [], pile,
      sway: { x: 0, v: 0 }, bal: { com: 0, danger: 0, signed: 0, n: 0 },
      score: 0, combo: 0, perfects: 0, bestCombo: 0,
      wind: null, tipT: 0, tipDir: 1, reason: '',
      cam: { y: 0, shake: 0, sx: 0, sy: 0 },
      // Tiny: x/y are FIELD (screen) coordinates of its centre
      tiny: { x: CFG.W / 2, y: CFG.TINY_MENU_Y, rot: 0, tilt: 0, sqT: 9, joyT: 0, wowT: 0, jumpT: 9, spinT: 9, spinDir: 1, shakeT: 9, blinkT: 2, blink: 0, look: 0, bannerK: 0 },
      view: { x0: 0, y0: 0, x1: CFG.W, y1: CFG.H }, // visible logical rect (wider/taller than the field when letterboxed)
      fx: [], banner: null, nextMilestone: 0,
      best: best || 0, newBest: false, overT: 0, fade: 0,
      ui: { pressed: null },
      scene: scene || makeScene(),
      auto: null,
    };
  }

  /* ------------------------------------------------------------------
   * 4. UPDATE
   * ------------------------------------------------------------------ */
  const topIndex = (s) => s.floors.length - 1;
  const topY = (s) => s.floors.length * CFG.FLOOR_H;
  const dispOf = (s, i) => bendDisp(i, topIndex(s), s.sway.x);
  const topVisualX = (s) => { const i = topIndex(s); return s.floors[i].x + dispOf(s, i); };

  function floorSquash(t) {  // → [sx, sy] damped squash after landing
    if (t > 1.2) return [1, 1];
    const k = 0.15 * Math.exp(-t * 9) * Math.cos(t * 24);
    return [1 + k * 0.45, 1 - k];
  }

  function startPlay(s) {
    tqSend({ ev: 'play' });
    s.phase = 'play'; s.phaseT = 0; s.spawnT = 0.35;
  }

  function spawnBlock(s) {
    const top = s.floors[topIndex(s)];
    const side = Math.floor(s.score / CFG.SIDE_SWITCH_EVERY) % 2 ? 1 : -1;
    const cx = top.x + (s.sway.x * 0);  // range centred on rest position of the top
    const minX = cx - CFG.SLIDE_RANGE, maxX = cx + CFG.SLIDE_RANGE;
    s.colorIdx = (s.colorIdx + 1) % PASTELS.length;
    s.block = {
      x: side < 0 ? minX : maxX, dir: -side, w: top.w, c: s.colorIdx, seed: 1000 + s.floors.length * 7919,
      y: topY(s) + CFG.HOVER_GAP, vy: 0, mode: 'slide', age: 0, minX, maxX, speed: slideSpeed(s.score),
      autoOff: s.auto ? gauss() * s.auto.err : 0, prevDiff: null,
    };
    s.wind = null;
    if (s.score >= CFG.WIND_FROM && Math.random() < CFG.WIND_CHANCE) {
      s.wind = { vx: (Math.random() < 0.5 ? -1 : 1) * lerp(CFG.WIND_MIN, CFG.WIND_MAX, Math.random()), t: 0 };
    }
  }

  function tap(s) {
    if (s.phase === 'play' && s.block && s.block.mode === 'slide' && s.block.age >= CFG.TAP_LOCK) {
      s.block.mode = 'drop'; s.block.vy = 0;
    }
  }

  function addPuffs(s, x, y, dir) {
    for (let k = 0; k < 4; k++) {
      s.fx.push({ type: 'puff', x: x + dir * k * 3, y: y + 2, vx: dir * (30 + Math.random() * 50), vy: 10 + Math.random() * 25, r: 3 + Math.random() * 3, t: 0, life: 0.5 + Math.random() * 0.25 });
    }
  }

  function landBlock(s) {
    const b = s.block, i = topIndex(s), top = s.floors[i];
    const tvx = topVisualX(s);
    const res = computeDrop(tvx, top.w, b.x, b.w, s.combo);
    const yb = topY(s);

    vib(res.type === 'perfect' ? [20, 30, 40] : res.type === 'miss' ? [80, 60, 120] : 25);
    if (res.type === 'miss') {
      // The block slips past the edge and knocks the tower over.
      s.debris.push({ x: b.x, y: yb + CFG.FLOOR_H / 2, vx: sign(res.delta) * 90, vy: 40, rot: 0, av: sign(res.delta) * 3, w: b.w, h: CFG.FLOOR_H, c: b.c, seed: b.seed, state: 'fall', bounces: 0, alpha: 1, collapse: true });
      s.block = null;
      s.reason = 'miss';
      startTopple(s, sign(res.delta));
      return;
    }

    let restX, w = res.w;
    if (res.type === 'perfect') {
      restX = top.x;
      s.combo = res.combo; s.perfects++; s.bestCombo = Math.max(s.bestCombo, s.combo);
    } else {
      s.combo = 0;
      restX = res.vx - bendDisp(i + 1, i + 1, s.sway.x);
      const d = sign(res.delta), cw = res.cut.r - res.cut.l;
      s.debris.push({
        x: (res.cut.l + res.cut.r) / 2, y: yb + CFG.FLOOR_H / 2, vx: d * (55 + Math.random() * 55), vy: 60 + Math.random() * 70,
        rot: 0, av: d * (1.6 + Math.random() * 2.2) * (cw < 30 ? 1.6 : 1), w: cw, h: CFG.FLOOR_H, c: b.c, seed: b.seed,
        state: 'fall', bounces: 0, alpha: 1,
      });
    }
    const f = { x: restX, w, wd: res.grew ? b.w : w, c: b.c, seed: b.seed, landT: 0, flash: res.type === 'perfect' ? 1 : 0 };
    s.floors.push(f);
    s.score = s.floors.length - 1;
    s.block = null; s.spawnT = CFG.SPAWN_DELAY; s.wind = null;

    // Juice
    const vx = res.vx;
    addPuffs(s, vx - w / 2, yb, -1); addPuffs(s, vx + w / 2, yb, 1);
    if (res.type === 'perfect') {
      s.fx.push({ type: 'ring', x: vx, y: yb + CFG.FLOOR_H, w, t: 0, life: 0.6 });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + Math.random() * 0.4;
        s.fx.push({ type: 'spark', x: vx + Math.cos(a) * w * 0.3, y: yb + CFG.FLOOR_H * 0.6, vx: Math.cos(a) * 90, vy: 60 + Math.sin(a) * 70, t: 0, life: 0.7, r: 3 + Math.random() * 2 });
      }
      const label = s.combo >= 2 ? TQT('¡Perfecto!') + ' ×' + s.combo : TQT('¡Perfecto!');
      s.fx.push({ type: 'text', x: vx, y: yb + CFG.FLOOR_H + 28, str: label, t: 0, life: 1.0, size: 22 });
      if (res.grew) s.fx.push({ type: 'text', x: vx, y: yb + CFG.FLOOR_H + 4, str: TQT('¡Crece!'), t: 0, life: 0.9, size: 15, small: true });
      const t = s.tiny;
      if (s.combo >= CFG.WOW_COMBO) { t.wowT = 1.1; t.joyT = 0; } else { t.joyT = 0.9; t.wowT = 0; }
      t.jumpT = 0;
      if (s.combo >= 2) { t.spinT = 0; t.spinDir = Math.random() < 0.5 ? -1 : 1; }
    }

    // Sway kick & balance
    const kick = CFG.SWAY_IMPULSE * (res.delta / CFG.BASE_W) * (1 + s.score / CFG.SWAY_HEIGHT_SCALE);
    s.sway.v += res.type === 'perfect' ? kick * 0.3 : kick;
    s.bal = stackBalance(s.floors);

    // Milestones
    const ms = CFG.MILESTONES[s.nextMilestone];
    if (ms && s.score >= ms[0]) { s.banner = { str: ms[1], t: 0, life: 2.6 }; s.nextMilestone++; }

    if (s.bal.danger >= 1) {
      s.phase = 'tipping'; s.tipT = CFG.TIP_TIME; s.tipDir = sign(s.bal.com); s.reason = 'lean';
    }
  }

  /** Rigid rotation of the whole tower (floors 1..n) about the base's top edge. */
  function startTopple(s, dir) {
    s.phase = 'topple'; s.phaseT = 0; s.cam.shake = 3;
    s.topple = { dir, phi: 0, w: 0.25, px: s.floors[0].x + dir * s.floors[0].w / 2, py: CFG.FLOOR_H };
    s.block = null; s.wind = null;
  }
  /** World position/velocity of a point under the current topple rotation. */
  function toppled(tp, x, y) {
    const th = -tp.dir * tp.phi, c = Math.cos(th), sn = Math.sin(th);
    const rx = x - tp.px, ry = y - tp.py;
    const qx = rx * c - ry * sn, qy = rx * sn + ry * c, om = -tp.dir * tp.w;
    return { x: tp.px + qx, y: tp.py + qy, vx: -qy * om, vy: qx * om };
  }

  function startCollapse(s, dir) {
    s.phase = 'collapse'; s.phaseT = 0; s.cam.shake = 8;
    const tp = s.topple || { dir, phi: 0, w: 0, px: s.floors[0].x, py: CFG.FLOOR_H };
    const nTop = topIndex(s);
    for (let i = 1; i <= nTop; i++) {
      const f = s.floors[i];
      const p = toppled(tp, f.x + dispOf(s, i), i * CFG.FLOOR_H + CFG.FLOOR_H / 2);
      // rigid-rotation velocity + a generous random spread so the rubble scatters into a low heap
      let vx = p.vx + (Math.random() - 0.5) * 320 + tp.dir * 50, vy = p.vy + 40 + Math.random() * 90;
      const sp = Math.hypot(vx, vy); if (sp > CFG.BREAK_MAX_V * 1.3) { vx *= (CFG.BREAK_MAX_V * 1.3) / sp; vy *= (CFG.BREAK_MAX_V * 1.3) / sp; }
      s.bodies.push({
        x: p.x, y: p.y, vx, vy, rot: bendAngle(i, nTop, s.sway.x) + tp.dir * tp.phi,
        av: tp.dir * (0.8 + Math.random() * 2.4) * (0.4 + i / nTop) + (Math.random() - 0.5), w: f.w, h: CFG.FLOOR_H, c: f.c, seed: f.seed,
        state: 'fall', bounces: 0, delay: 0,
      });
    }
    for (const d of s.debris) if (d.collapse) s.bodies.push(d);
    s.debris = s.debris.filter((d) => !d.collapse);
    s.floors.length = 1;
    s.topple = null; s.block = null; s.wind = null;

    s.tiny.shakeT = 0; s.tiny.jumpT = 0; // startled little hop + shiver, then sad (stays floating)

    const score = s.score;
    if (score > s.best) { s.best = score; s.newBest = score > 0; }
  }

  /** Tiny's drift path in field coords (pure): smooth, slow, dodges the score & banner. */
  function tinyHome(phase, t, bannerK) {
    const d = Math.sin(t * 0.31 + 0.6) * 0.8 + Math.sin(t * 0.73 + 2.1) * 0.2; // -1..1, never repeats sharply
    const x = CFG.W / 2 + d * CFG.TINY_DRIFT_X;
    if (phase === 'start' || phase === 'over') return { x: CFG.W / 2 + d * 95, y: CFG.TINY_MENU_Y + Math.sin(t * 1.7) * 3 };
    const c = smooth(0, 1, 1 - Math.abs(x - CFG.W / 2) / 75); // 1 under the score digits
    let y = CFG.TINY_PLAY_Y + c * CFG.TINY_CENTER_DIP;
    y = lerp(y, CFG.TINY_BANNER_Y, bannerK);
    return { x, y: y + Math.sin(t * 1.8) * 3 };
  }

  function updateTiny(s, dt) {
    const t = s.tiny;
    t.sqT += dt; t.jumpT += dt; t.spinT += dt; t.shakeT += dt;
    t.joyT = Math.max(0, t.joyT - dt); t.wowT = Math.max(0, t.wowT - dt);
    t.blinkT -= dt;
    if (t.blinkT <= 0) { t.blink = 0.13; t.blinkT = 2 + Math.random() * 2.5; }
    t.blink = Math.max(0, t.blink - dt);
    // Dodge the milestone banner (it occupies the band just below the score)
    const bannerOn = s.banner && s.banner.t < s.banner.life * 0.9 ? 1 : 0;
    t.bannerK += (bannerOn - t.bannerK) * follow(5, dt);
    const h = tinyHome(s.phase, s.t, t.bannerK);
    const px = t.x;
    t.x += (h.x - t.x) * follow(CFG.TINY_FOLLOW, dt);
    t.y += (h.y - t.y) * follow(CFG.TINY_FOLLOW, dt);
    // lean gently into the drift direction
    const vx = dt > 0 ? (t.x - px) / dt : 0;
    t.tilt += (clamp(vx * 0.006, -0.14, 0.14) - t.tilt) * follow(4, dt);
    // Eyes follow the sliding block
    const target = s.block ? clamp((s.block.x - t.x) / 90, -1, 1) : 0;
    t.look += (target - t.look) * follow(6, dt);
  }

  /** Offsets from reactions → {dx, dy, rot, sqx, sqy} (pure, time-based). */
  function tinyReact(t) {
    let dy = 0, dx = 0, rot = t.tilt, sqx = 1, sqy = 1;
    if (t.jumpT < 0.5) { const e = t.jumpT / 0.5; dy -= Math.sin(e * Math.PI) * 16; const st = Math.sin(e * Math.PI) * 0.08; sqx -= st; sqy += st; }
    else if (t.jumpT < 1.1) { const k = 0.16 * Math.exp(-(t.jumpT - 0.5) * 9) * Math.cos((t.jumpT - 0.5) * 22); sqx += k * 0.6; sqy -= k; }
    if (t.spinT < 0.55) rot += easeInOut(t.spinT / 0.55) * TAU * t.spinDir;
    if (t.shakeT < 0.7) dx += Math.sin(t.shakeT * 55) * 2.2 * (1 - t.shakeT / 0.7);
    return { dx, dy, rot, sqx, sqy: sqy * (1 + 0.018 * Math.sin(t.jumpT * 3.3)) };
  }

  function tinyMood(s) {
    const t = s.tiny;
    if (s.phase === 'collapse' || s.phase === 'over') return 'sad';
    if (t.wowT > 0) return 'wow';
    if (t.joyT > 0) return 'joy';
    if (s.phase === 'tipping' || s.phase === 'topple' || s.bal.danger > CFG.WORRY_DANGER || Math.abs(s.sway.v) > 45) return 'worried';
    return 'happy';
  }

  function updateAuto(s) {
    // Debug autoplayer: drops when the block crosses (target + gaussian offset)
    const b = s.block;
    if (!s.auto || !b || b.mode !== 'slide' || b.age < 0.3) return;
    if (s.auto.until && s.score >= s.auto.until) return;
    const diff = b.x - (topVisualX(s) + b.autoOff);
    if (b.prevDiff !== null && sign(diff) !== sign(b.prevDiff)) tap(s);
    b.prevDiff = diff;
  }

  function updateBodies(list, dt, g, pile, commit, s) {
    for (const b of list) {
      stepBody(b, dt, g, pile, commit, false);
      if (b.justHit) {
        b.justHit = 0;
        if (s && s.fx.length < 90) { addPuffs(s, b.x - b.w / 2, b.y - b.h / 2, -1); addPuffs(s, b.x + b.w / 2, b.y - b.h / 2, 1); }
      }
    }
  }

  function update(s, dt) {
    s.t += dt; s.phaseT += dt;
    s.fade = Math.max(0, s.fade - dt * 2.8);

    // Clouds drift
    const v = s.view;
    for (const c of s.scene.clouds) { c.x += c.vx * dt; if (c.x > v.x1 + 130) c.x = v.x0 - 130; if (c.x < v.x0 - 130) c.x = v.x1 + 130; }

    // Floors: land squash, flash, width regrowth
    for (const f of s.floors) {
      f.landT += dt; f.flash = Math.max(0, f.flash - dt * 2.5);
      if (f.wd !== f.w) { f.wd += (f.w - f.wd) * follow(10, dt); if (Math.abs(f.wd - f.w) < 0.1) f.wd = f.w; }
    }

    if (s.phase === 'play' || s.phase === 'tipping') {
      if (s.phase === 'play') {
        if (!s.block && s.spawnT > 0) { s.spawnT -= dt; if (s.spawnT <= 0) spawnBlock(s); }
        const b = s.block;
        if (b) {
          b.age += dt;
          if (b.mode === 'slide') {
            const r = slideStep(b.x, b.dir, b.speed, dt, b.minX, b.maxX); b.x = r.x; b.dir = r.dir;
            updateAuto(s);
          } else {
            b.vy -= CFG.DROP_G * dt; b.y += b.vy * dt;
            if (s.wind) b.x += s.wind.vx * dt;
            if (b.y <= topY(s)) { b.y = topY(s); landBlock(s); }
          }
        }
        if (s.wind) s.wind.t += dt;
      } else {
        s.tipT -= dt;
        if (s.tipT <= 0) startTopple(s, s.tipDir);
      }
      // Sway spring towards the static lean
      const lean = clamp(s.bal.signed, -1.2, 1.2) * CFG.LEAN_MAX_PX;
      const target = s.phase === 'tipping' ? s.tipDir * (CFG.LEAN_MAX_PX + CFG.SWAY_MAX_PX + 14) : lean;
      const k = s.phase === 'tipping' ? CFG.SWAY_K * 0.6 : CFG.SWAY_K;
      const r = springStep(s.sway.x, s.sway.v, target, k, CFG.SWAY_DAMP, dt);
      s.sway.x = s.phase === 'tipping' ? r[0] : clamp(r[0], lean - CFG.SWAY_MAX_PX, lean + CFG.SWAY_MAX_PX);
      s.sway.v = r[1];
    }

    if (s.phase === 'topple') {
      const tp = s.topple;
      tp.w += CFG.TOPPLE_ALPHA * dt; tp.phi += tp.w * dt;
      s.sway.v *= Math.exp(-4 * dt);
      if (tp.phi >= CFG.TOPPLE_BREAK) startCollapse(s, tp.dir);
    }

    if (s.phase === 'collapse' || s.phase === 'over') {
      updateBodies(s.bodies, dt, CFG.COLLAPSE_G, s.pile, true, s);
      const settled = s.bodies.every((b) => b.state === 'rest');
      if (s.phase === 'collapse' && ((settled && s.cam.y < 25 && s.phaseT > 1.1) || s.phaseT > 4.5)) {
        s.phase = 'over'; s.overT = 0; s.phaseT = 0;
        tqSend({ game: 'torre', score: s.score, perfects: s.perfects, bestCombo: s.bestCombo });
        try { root.localStorage && root.localStorage.setItem(CFG.STORAGE_KEY, String(s.best)); } catch (e) { /* storage unavailable */ }
      }
      if (s.phase === 'over') s.overT += dt;
    }

    // Loose cut pieces
    for (const d of s.debris) {
      stepBody(d, dt, CFG.DEBRIS_G, s.pile, false, false);
      if (d.state !== 'fall') d.alpha -= dt * 1.6;
      const sy = CFG.GROUND_SY - (d.y - s.cam.y);
      if (sy > CFG.H + 120) d.alpha = 0;
    }
    s.debris = s.debris.filter((d) => d.alpha > 0);

    updateTiny(s, dt);

    // FX
    for (const f of s.fx) {
      f.t += dt;
      if (f.type === 'puff' || f.type === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.exp(-3 * dt); f.vy = f.type === 'spark' ? f.vy - 260 * dt : f.vy * Math.exp(-3 * dt); }
      if (f.type === 'text') f.y += 26 * dt;
    }
    s.fx = s.fx.filter((f) => f.t < f.life);
    if (s.banner) { s.banner.t += dt; if (s.banner.t > s.banner.life) s.banner = null; }

    // Camera
    let target;
    if (s.phase === 'collapse' || s.phase === 'over') {
      // follow the lowest piece still falling, then settle on the ground (rubble in view)
      let low = Infinity;
      for (const b of s.bodies) if (b.state === 'fall' && b.y < low) low = b.y;
      target = low === Infinity ? 0 : Math.max(0, low - CFG.GROUND_SY + CFG.H * 0.55);
      s.cam.y += (Math.min(target, s.cam.y) - s.cam.y) * follow(6, dt);
    } else {
      target = Math.max(0, topY(s) - (CFG.GROUND_SY - CFG.H * CFG.CAM_TOP_FRAC));
      s.cam.y += (target - s.cam.y) * follow(CFG.CAM_EASE, dt);
    }
    s.cam.shake *= Math.exp(-5 * dt);
    s.cam.sx = (Math.random() - 0.5) * 2 * s.cam.shake; s.cam.sy = (Math.random() - 0.5) * 2 * s.cam.shake;
  }

  /* ------------------------------------------------------------------
   * 5. DRAW
   * ------------------------------------------------------------------ */
  function rrPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function rr(ctx, x, y, w, h, r, fill) { ctx.beginPath(); rrPath(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function circ(ctx, x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  const wsy = (s, wy) => CFG.GROUND_SY - (wy - s.cam.y);

  function drawSky(ctx, s, sky) {
    const v = s.view; // fill the whole visible area (letterbox = sky, never blank)
    const g = ctx.createLinearGradient(0, v.y0, 0, v.y1);
    g.addColorStop(0, css(sky.top)); g.addColorStop(0.55, css(sky.mid)); g.addColorStop(1, css(sky.bot));
    ctx.fillStyle = g; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    // Warm sun low on the horizon at sunset
    if (sky.dusk > 0.02) {
      const sg = ctx.createRadialGradient(262, 330, 6, 262, 330, 110);
      sg.addColorStop(0, `rgba(255,236,170,${0.85 * sky.dusk})`); sg.addColorStop(0.3, `rgba(255,200,140,${0.35 * sky.dusk})`); sg.addColorStop(1, 'rgba(255,190,140,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 180, CFG.W, 300);
      ctx.fillStyle = `rgba(255,244,210,${0.9 * sky.dusk})`; ctx.beginPath(); circ(ctx, 262, 330, 20); ctx.fill();
    }
    // Stars (and a moon) at night
    if (sky.night > 0.02) {
      const kx0 = Math.floor(v.x0 / CFG.W), kx1 = Math.floor(v.x1 / CFG.W), ky0 = Math.floor(v.y0 / CFG.H), ky1 = Math.floor(v.y1 / CFG.H);
      for (const st of s.scene.stars) { // star field tiles over any letterbox area
        const a = sky.night * (0.55 + 0.45 * Math.sin(s.t * 2 + st.ph));
        const y = (st.y + s.cam.y * 0.03) % CFG.H;
        ctx.fillStyle = `rgba(255,255,240,${a})`; ctx.beginPath();
        for (let kx = kx0; kx <= kx1; kx++) for (let ky = ky0; ky <= ky1; ky++) circ(ctx, st.x + kx * CFG.W, y + ky * CFG.H, st.r);
        ctx.fill();
      }
      // crescent moon: outer disc minus an offset disc (even-odd inside a clip)
      ctx.save(); ctx.beginPath(); circ(ctx, 64, 118, 17); ctx.clip();
      ctx.fillStyle = `rgba(255,246,214,${sky.night})`; ctx.beginPath(); ctx.rect(40, 94, 48, 48); circ(ctx, 73, 111, 14); ctx.fill('evenodd');
      ctx.restore();
    }
  }

  function drawCloud(ctx, x, y, sc, alpha, night) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = alpha;
    const shade = night > 0 ? css(mixC([221, 236, 250], [150, 140, 205], night)) : '#DDECFA';
    const body = night > 0 ? css(mixC(WHITE, [196, 188, 238], night)) : '#FFFFFF';
    ctx.fillStyle = shade; ctx.beginPath();
    circ(ctx, 0, 5, 22); circ(ctx, 25, -5, 28); circ(ctx, 52, 5, 20); circ(ctx, -20, 11, 14); rrPath(ctx, -34, 5, 106, 25, 12.5); ctx.fill();
    ctx.fillStyle = body; ctx.beginPath();
    circ(ctx, 0, 0, 22); circ(ctx, 25, -10, 28); circ(ctx, 52, 0, 20); circ(ctx, -20, 6, 14); rrPath(ctx, -34, 0, 106, 24, 12); ctx.fill();
    ctx.restore();
  }
  function drawClouds(ctx, s, sky, near) {
    for (const c of s.scene.clouds) {
      if (c.near !== near) continue;
      const y = CFG.GROUND_SY - (c.y - s.cam.y * c.p);
      if (y < s.view.y0 - 80 || y > s.view.y1 + 60) continue;
      const a = near ? 0.62 - sky.night * 0.22 : 0.55 + 0.45 * (c.p - 0.5) / 0.32;
      drawCloud(ctx, c.x, y, c.sc, a * (1 - sky.night * 0.35), sky.night);
    }
  }

  const TREES = [{ x: 22, s: 1.05 }, { x: 58, s: 0.78 }, { x: 274, s: 0.86 }, { x: 308, s: 1.12 }];
  const FLOWERS = [[14, 18, 0], [44, 30, 1], [80, 14, 2], [98, 36, 0], [252, 22, 1], [236, 40, 2], [290, 30, 0], [318, 16, 2], [126, 44, 1], [206, 48, 0]];
  function drawGround(ctx, s) {
    const gy = wsy(s, 0), v = s.view, L = v.x0 - 20, WW = v.x1 - v.x0 + 40, BOT = v.y1 + 20;
    // distant hills (slow parallax)
    const hy = CFG.GROUND_SY + s.cam.y * 0.82 - 4;
    if (hy - 70 < CFG.H) {
      ctx.fillStyle = '#C4F0C3'; ctx.beginPath();
      circ(ctx, 40, hy + 40, 80); circ(ctx, 170, hy + 58, 100); circ(ctx, 300, hy + 36, 84); circ(ctx, -120, hy + 50, 90); circ(ctx, 450, hy + 50, 90); ctx.rect(L, hy + 30, WW, BOT - hy); ctx.fill();
    }
    if (gy - 60 > v.y1) return;
    // meadow back band
    ctx.fillStyle = COL.meadowLight; ctx.beginPath();
    circ(ctx, 20, gy + 10, 34); circ(ctx, 95, gy + 16, 40); circ(ctx, 235, gy + 14, 40); circ(ctx, 312, gy + 8, 34); circ(ctx, -60, gy + 12, 40); circ(ctx, 390, gy + 12, 40); ctx.rect(L, gy - 6, WW, 40); ctx.fill();
    // trees
    for (const tr of TREES) drawTree(ctx, tr.x, gy + 2, tr.s);
    // front ground
    ctx.fillStyle = COL.meadow; ctx.beginPath(); ctx.rect(L, gy, WW, Math.max(10, BOT - gy)); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); rrPath(ctx, 8, gy + 4, CFG.W - 16, 3, 1.5); ctx.fill();
    const fc = ['#FFFFFF', '#FF8FC0', '#FFC247'];
    for (const f of FLOWERS) {
      ctx.fillStyle = fc[f[2]]; ctx.beginPath(); circ(ctx, f[0], gy + f[1], 2.6); ctx.fill();
      ctx.fillStyle = '#FFE7A0'; ctx.beginPath(); circ(ctx, f[0], gy + f[1], 1); ctx.fill();
    }
  }
  function drawTree(ctx, x, gy, sc) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(sc, sc);
    rr(ctx, -4, -22, 8, 24, 4, '#C98E5E');
    ctx.fillStyle = '#3FAE58'; ctx.beginPath(); circ(ctx, -11, -28, 13); circ(ctx, 11, -28, 13); circ(ctx, 0, -40, 16); ctx.fill();
    ctx.fillStyle = '#56C46B'; ctx.beginPath(); circ(ctx, -10, -31, 11); circ(ctx, 10, -31, 11); circ(ctx, 0, -43, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); circ(ctx, -5, -48, 4); ctx.fill();
    ctx.restore();
  }

  /** One floor, local coords: bottom-centre at (0,0), height FLOOR_H upwards. */
  function drawFloor(ctx, w, pal, seed, night, isBase, flash, alpha) {
    const h = CFG.FLOOR_H, dx = CFG.DEPTH_X, dy = CFG.DEPTH_Y, L = -w / 2, R = w / 2, T = -h;
    if (w < 1) return;
    if (alpha !== undefined && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    ctx.lineJoin = 'round'; ctx.lineWidth = 2;
    // side face
    ctx.beginPath(); ctx.moveTo(R - 2, T + 1); ctx.lineTo(R + dx - 1, T - dy + 2); ctx.lineTo(R + dx - 1, -dy - 2); ctx.lineTo(R - 2, -3); ctx.closePath();
    ctx.fillStyle = pal.side; ctx.strokeStyle = pal.side; ctx.fill(); ctx.stroke();
    // top face
    ctx.beginPath(); ctx.moveTo(L + 3, T + 1); ctx.lineTo(L + dx + 2, T - dy + 1); ctx.lineTo(R + dx - 1, T - dy + 1); ctx.lineTo(R - 2, T + 1); ctx.closePath();
    ctx.fillStyle = pal.top; ctx.strokeStyle = pal.top; ctx.fill(); ctx.stroke();
    // front face with 3D bottom edge
    rr(ctx, L, T, w, h, 6, pal.edge);
    const g = ctx.createLinearGradient(0, T, 0, -4); g.addColorStop(0, pal.frontHi); g.addColorStop(1, pal.front);
    rr(ctx, L, T, w, h - 4, 6, g);
    if (w > 12) rr(ctx, L + 5, T + 2, w - 10, 2.2, 1.1, 'rgba(255,255,255,.5)');
    if (night > 0.02) {
      ctx.fillStyle = `rgba(78,56,170,${night * 0.2})`; ctx.beginPath(); rrPath(ctx, L, T, w, h, 6);
      ctx.moveTo(L + 3, T); ctx.lineTo(L + dx + 2, T - dy); ctx.lineTo(R + dx, T - dy); ctx.lineTo(R + dx, -dy); ctx.lineTo(R, 0); ctx.lineTo(R, T); ctx.closePath(); ctx.fill();
    }
    // windows
    if (w >= 18) {
      const k = Math.max(1, Math.floor((w - 6) / 25)), gap = w / k;
      for (let j = 0; j < k; j++) {
        const wx = L + gap * (j + 0.5);
        if (isBase && Math.abs(wx) < 20) continue;
        const r = hash01(seed, j), lit = hash01(seed + 7, j) < 0.65;
        rr(ctx, wx - 7, T + 6.5, 14, 15, 4, 'rgba(255,255,255,.95)');
        const pane = night > 0.02 && lit ? css(mixC([191, 231, 255], [255, 224, 138], night)) : '#BFE7FF';
        rr(ctx, wx - 5, T + 8.5, 10, 11, 2.5, pane);
        ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(wx - 0.6, T + 8.5, 1.2, 11);
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(wx - 3.6, T + 10, 1.6, 3.6);
        rr(ctx, wx - 8.5, T + 20.5, 17, 3, 1.5, '#FFFFFF');
        if (r < 0.3) {
          ctx.fillStyle = '#4CBF63'; ctx.beginPath(); circ(ctx, wx - 4.5, T + 19.6, 2.4); circ(ctx, wx + 4.5, T + 19.6, 2.4); circ(ctx, wx, T + 19, 2.6); ctx.fill();
          ctx.fillStyle = COL.pink; ctx.beginPath(); circ(ctx, wx - 3.5, T + 18.2, 1.6); ctx.fill();
          ctx.fillStyle = COL.yellow; ctx.beginPath(); circ(ctx, wx + 3.6, T + 18.2, 1.6); ctx.fill();
        } else if (r < 0.42) {
          rr(ctx, wx - 8.5, T + 3.6, 17, 4.6, 2.3, COL.red);
          ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(wx - 4.5, T + 3.6, 3, 4.6); ctx.fillRect(wx + 1.5, T + 3.6, 3, 4.6);
        }
      }
    }
    if (isBase) {
      // round-top door
      ctx.fillStyle = COL.purpleEdge; ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-9, T + 17); ctx.arc(0, T + 17, 9, Math.PI, 0); ctx.lineTo(9, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = COL.purple; ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-7, T + 17); ctx.arc(0, T + 17, 7, Math.PI, 0); ctx.lineTo(7, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = COL.yellow; ctx.beginPath(); circ(ctx, 3.8, -13, 1.5); ctx.fill();
    }
    if (flash > 0) { ctx.globalAlpha = (alpha === undefined ? 1 : alpha) * flash * 0.75; rr(ctx, L, T - dy, w + dx, h + dy, 6, '#FFFFFF'); }
    ctx.globalAlpha = 1;
  }
  const palOf = (c) => (c < 0 ? BASE_PAL : PALS[c % PALS.length]);

  /** Screen-space rotation of the toppling tower (no-op otherwise). */
  function applyTopple(ctx, s) {
    const tp = s.topple; if (!tp || s.phase !== 'topple') return;
    const sx = tp.px, sy = wsy(s, tp.py);
    ctx.translate(sx, sy); ctx.rotate(tp.dir * tp.phi); ctx.translate(-sx, -sy);
  }

  function drawTower(ctx, s, night) {
    const nTop = topIndex(s), toppling = s.phase === 'topple';
    for (let i = 0; i <= nTop; i++) {
      const f = s.floors[i], by = wsy(s, i * CFG.FLOOR_H);
      if (!toppling && (by < -60 || by - CFG.FLOOR_H > CFG.H + 40)) continue;
      const q = floorSquash(f.landT);
      ctx.save(); if (i > 0) applyTopple(ctx, s); ctx.translate(f.x + dispOf(s, i), by); ctx.rotate(bendAngle(i, nTop, s.sway.x)); ctx.scale(q[0], q[1]);
      drawFloor(ctx, f.wd, palOf(f.c), f.seed, night, i === 0, f.flash);
      ctx.restore();
    }
  }

  function drawBlock(ctx, s, night) {
    const b = s.block; if (!b) return;
    // soft landing shadow on the top face
    const i = topIndex(s), top = s.floors[i];
    const tvx = topVisualX(s), ty = wsy(s, topY(s));
    const l = Math.max(b.x - b.w / 2, tvx - top.w / 2), r = Math.min(b.x + b.w / 2, tvx + top.w / 2);
    if (r > l) { ctx.fillStyle = 'rgba(34,50,79,.09)'; ctx.beginPath(); ctx.ellipse((l + r) / 2 + CFG.DEPTH_X / 2, ty - CFG.DEPTH_Y / 2, (r - l) / 2, CFG.DEPTH_Y / 2 + 1, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(b.x, wsy(s, b.y));
    if (b.mode === 'drop') ctx.scale(0.97, 1.04);
    drawFloor(ctx, b.w, palOf(b.c), b.seed, night, false, 0);
    ctx.restore();
  }

  function drawBodies(ctx, s, list, night) {
    for (const b of list) {
      const sy = wsy(s, b.y);
      if (sy < -80 || sy > CFG.H + 80) continue;
      ctx.save(); ctx.translate(b.x, sy); ctx.rotate(b.rot); ctx.translate(0, CFG.FLOOR_H / 2);
      drawFloor(ctx, b.w, palOf(b.c), b.seed, night, false, 0, b.alpha);
      ctx.restore();
    }
  }

  // --- Tiny (SVG viewBox 8 6 104 90) ---
  function tinyBody(ctx) {
    ctx.beginPath(); circ(ctx, 34, 58, 24); circ(ctx, 60, 40, 30); circ(ctx, 88, 56, 23); rrPath(ctx, 12, 52, 96, 36, 18);
  }
  function drawTiny(ctx, sx, sy, scale, rot, sqx, sqy, mood, blink, look, pivotUp) {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot); ctx.translate(0, pivotUp || 0);
    ctx.scale(scale * sqx, scale * sqy); ctx.translate(-60, -91);
    ctx.save(); ctx.translate(0, 5); ctx.fillStyle = '#D9E6F2'; tinyBody(ctx); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#FFFFFF'; tinyBody(ctx); ctx.fill();
    ctx.globalAlpha = 0.75; ctx.fillStyle = COL.pink; ctx.beginPath(); ctx.ellipse(37, 73, 6, 4, 0, 0, TAU); ctx.ellipse(83, 73, 6, 4, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const lx = (look || 0) * 2.5;
    if (mood === 'wow') { // big round eyes
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.ellipse(48 + lx, 61, 6, 7.8, 0, 0, TAU); ctx.ellipse(72 + lx, 61, 6, 7.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); circ(ctx, 50.5 + lx, 58, 2.3); circ(ctx, 74.5 + lx, 58, 2.3); ctx.fill();
    } else if (mood === 'joy') {
      ctx.beginPath(); ctx.moveTo(42, 64); ctx.quadraticCurveTo(48, 55, 54, 64); ctx.moveTo(66, 64); ctx.quadraticCurveTo(72, 55, 78, 64); ctx.stroke();
    } else {
      const ry = blink > 0 ? 1 : 6.6;
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.ellipse(48 + lx, 62, 5, ry, 0, 0, TAU); ctx.ellipse(72 + lx, 62, 5, ry, 0, 0, TAU); ctx.fill();
      if (blink <= 0) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); circ(ctx, 50 + lx, 59.5, 1.8); circ(ctx, 74 + lx, 59.5, 1.8); ctx.fill(); }
    }
    ctx.beginPath();
    if (mood === 'wow') { ctx.fillStyle = COL.ink; ctx.ellipse(60, 78, 4.6, 5.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); }
    else if (mood === 'worried') { ctx.moveTo(53, 77); ctx.lineTo(67, 77); }
    else if (mood === 'sad') { ctx.moveTo(51, 79); ctx.quadraticCurveTo(60, 69, 69, 79); }
    else { ctx.moveTo(51, 73); ctx.quadraticCurveTo(60, 83, 69, 73); }
    ctx.stroke();
    if (mood === 'worried') { // little sweat drop
      ctx.fillStyle = '#8AD6FF'; ctx.beginPath(); ctx.moveTo(97, 36); ctx.quadraticCurveTo(103, 45, 97, 48); ctx.quadraticCurveTo(91, 45, 97, 36); ctx.fill();
    }
    ctx.restore();
  }

  function drawTinyFloating(ctx, s) {
    const t = s.tiny, r = tinyReact(t), mood = tinyMood(s);
    drawTiny(ctx, t.x + r.dx, t.y + r.dy, CFG.TINY_SCALE, r.rot, r.sqx, r.sqy, mood, t.blink, t.look, 15);
    if (mood === 'wow') { // sparkle pops around Tiny
      for (let k = 0; k < 3; k++) {
        const a = s.t * 2.4 + (k * TAU) / 3;
        drawStar(ctx, t.x + r.dx + Math.cos(a) * 26, t.y + r.dy - 4 + Math.sin(a) * 12, 3.6, COL.yellow, Math.min(1, t.wowT * 3));
      }
    }
  }

  function drawStar(ctx, x, y, r, color, alpha) {
    ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 - Math.PI / 2, rr2 = k % 2 ? r * 0.42 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }

  function outlinedText(ctx, str, x, y, font, fill, stroke, lw) {
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeText(str, x, y); }
    ctx.fillStyle = fill; ctx.fillText(str, x, y);
  }

  function drawFx(ctx, s) {
    for (const f of s.fx) {
      const e = f.t / f.life, sy = wsy(s, f.y);
      if (f.type === 'puff') {
        ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - e)})`; ctx.beginPath(); circ(ctx, f.x, sy, f.r * (1 + e * 1.4)); ctx.fill();
      } else if (f.type === 'spark') {
        drawStar(ctx, f.x, sy, f.r * (1 - e * 0.5), e < 0.5 ? '#FFFFFF' : COL.yellow, 1 - e);
      } else if (f.type === 'ring') {
        const r = f.w * 0.5 + e * 50;
        ctx.lineWidth = 5 * (1 - e); ctx.strokeStyle = `rgba(255,255,255,${1 - e})`;
        ctx.beginPath(); ctx.ellipse(f.x + CFG.DEPTH_X / 2, sy - CFG.DEPTH_Y / 2, r, r * 0.3, 0, 0, TAU); ctx.stroke();
        ctx.lineWidth = 3 * (1 - e); ctx.strokeStyle = `rgba(255,194,71,${1 - e})`;
        ctx.beginPath(); ctx.ellipse(f.x + CFG.DEPTH_X / 2, sy - CFG.DEPTH_Y / 2, r * 0.8, r * 0.24, 0, 0, TAU); ctx.stroke();
      } else if (f.type === 'text') {
        const a = e < 0.7 ? 1 : 1 - (e - 0.7) / 0.3, pop = easeOutBack(Math.min(1, f.t / 0.25));
        ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, sy); ctx.scale(pop, pop);
        outlinedText(ctx, f.str, 0, 0, `700 ${f.size}px ${FD}`, '#FFFFFF', f.small ? COL.green : COL.purple, f.small ? 4 : 5);
        ctx.restore();
      }
    }
  }

  function drawWind(ctx, s) {
    if (!s.wind) return;
    const d = sign(s.wind.vx), a = Math.min(1, s.wind.t * 3);
    // streaks
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * a})`; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const ph = (s.t * 0.9 + k * 0.23) % 1, y = 150 + k * 34 + Math.sin(k * 3.1) * 10;
      const x = d > 0 ? -40 + ph * (CFG.W + 80) : CFG.W + 40 - ph * (CFG.W + 80);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - d * 26, y); ctx.stroke();
    }
    // pill (below the combo pill if present)
    ctx.globalAlpha = a;
    ctx.save(); if (s.combo >= 2) ctx.translate(0, 34);
    rr(ctx, 12, 16, 88, 26, 13, 'rgba(255,255,255,.88)');
    ctx.font = `600 12px ${FB}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = COL.muted;
    ctx.fillText(TQT('Viento'), 24, 29.5);
    ctx.strokeStyle = COL.purple; ctx.lineWidth = 2.4; ctx.beginPath();
    const ax = 80;
    ctx.moveTo(ax - 9, 29); ctx.lineTo(ax + 9, 29); ctx.moveTo(ax + 9 * d, 29); ctx.lineTo(ax + 4 * d, 24.5); ctx.moveTo(ax + 9 * d, 29); ctx.lineTo(ax + 4 * d, 33.5); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function drawButton(ctx, b, label, pressed) {
    const off = pressed ? 5 : 0;
    rr(ctx, b.x, b.y + 6, b.w, b.h, b.h / 2, COL.purpleEdge);
    const g = ctx.createLinearGradient(0, b.y + off, 0, b.y + off + b.h);
    g.addColorStop(0, COL.purpleHi); g.addColorStop(1, COL.purple);
    rr(ctx, b.x, b.y + off, b.w, b.h, b.h / 2, g);
    rr(ctx, b.x + 18, b.y + off + 7, b.w - 36, 6, 3, 'rgba(255,255,255,.22)');
    outlinedText(ctx, label, b.x + b.w / 2, b.y + off + b.h / 2 + 1, `600 23px ${FD}`, '#FFFFFF');
  }

  function wrapLines(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
    if (line) lines.push(line);
    return lines;
  }

  const START_BTN = { x: 75, y: 282, w: 180, h: 58 };
  const OVER_BTN = { x: 70, y: 290, w: 190, h: 56 };
  const CARD = { x: 32, y: 60, w: 266, h: 312 };

  function drawStart(ctx, s) {
    const a = 1;
    const bob = Math.sin(s.t * 1.6) * 3;
    // panel
    rr(ctx, CARD.x, 76 + 6, CARD.w, 292, 30, 'rgba(34,50,79,.08)');
    rr(ctx, CARD.x, 76, CARD.w, 292, 30, 'rgba(255,255,255,.9)');
    ctx.globalAlpha = a;
    rr(ctx, CFG.W / 2 - 44, 98, 88, 22, 11, '#F1EDFF');
    ctx.font = `600 11px ${FB}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = COL.purple; ctx.fillText(TQT('MINIJUEGO'), CFG.W / 2, 109.5);
    outlinedText(ctx, TQT('Torre de Tiny'), CFG.W / 2, 148 + bob * 0.3, `700 36px ${FD}`, COL.ink);
    ctx.font = `600 15px ${FB}`; ctx.fillStyle = COL.muted; ctx.textAlign = 'center';
    const lines = wrapLines(ctx, TQT('Toca para soltar cada piso. Lo que sobre se cae… ¡y cuidado, que la torre se inclina!'), 222);
    lines.forEach((ln, k) => ctx.fillText(ln, CFG.W / 2, 190 + k * 21));
    drawButton(ctx, START_BTN, TQT('Jugar'), s.ui.pressed === 'start');
    if (s.best > 0) {
      ctx.font = `600 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.textAlign = 'center';
      ctx.fillText(TQT(s.best === 1 ? 'Tu récord: {a} piso' : 'Tu récord: {a} pisos').replace('{a}', s.best), CFG.W / 2, 368 - 12);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(ctx, s) {
    const showNum = s.phase === 'play' || s.phase === 'tipping' || s.phase === 'topple' || (s.phase === 'collapse' && s.phaseT < 0.9);
    if (showNum) {
      const pop = s.floors.length > 1 ? floorSquash(s.floors[topIndex(s)].landT) : [1, 1];
      ctx.save(); ctx.translate(CFG.W / 2, 60); ctx.scale(2 - pop[1], 2 - pop[1]);
      ctx.font = `700 54px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(34,50,79,.16)'; ctx.fillText(String(s.score), 0, 4);
      outlinedText(ctx, String(s.score), 0, 0, `700 54px ${FD}`, '#FFFFFF', 'rgba(82,55,201,.35)', 6);
      ctx.restore();
      ctx.font = `600 11px ${FB}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.fillText(s.score === 1 ? TQT('PISO') : TQT('PISOS'), CFG.W / 2, 94);
      // best
      if (s.best > 0) {
        rr(ctx, CFG.W - 88, 16, 76, 26, 13, 'rgba(255,255,255,.85)');
        ctx.font = `600 12px ${FB}`; ctx.textAlign = 'center'; ctx.fillStyle = COL.muted; ctx.textBaseline = 'middle';
        ctx.fillText(TQT('Récord') + ' ' + s.best, CFG.W - 50, 29.5);
      }
      // combo (top-left, mirrors the record pill)
      if (s.combo >= 2) {
        const w = 90, pop = easeOutBack(Math.min(1, s.floors[topIndex(s)].landT / 0.3));
        ctx.save(); ctx.translate(12 + w / 2, 29); ctx.scale(pop, pop);
        rr(ctx, -w / 2, -13 + 3, w, 26, 13, COL.yellowEdge);
        rr(ctx, -w / 2, -13, w, 26, 13, COL.yellow);
        ctx.font = `600 14px ${FD}`; ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(TQT('Combo') + ' ×' + s.combo, 0, 1);
        ctx.restore();
      }
      drawBalance(ctx, s);
    }
    if (s.banner) {
      const b = s.banner, e = b.t / b.life;
      const inE = easeOutBack(Math.min(1, b.t / 0.45)), out = e > 0.85 ? (e - 0.85) / 0.15 : 0;
      const y = lerp(-40, 106, inE) - out * 150;
      ctx.font = `600 17px ${FD}`;
      const w = ctx.measureText(b.str).width + 40;
      ctx.globalAlpha = 1 - out;
      rr(ctx, CFG.W / 2 - w / 2, y + 4, w, 34, 17, COL.purpleEdge);
      rr(ctx, CFG.W / 2 - w / 2, y, w, 34, 17, COL.purple);
      outlinedText(ctx, b.str, CFG.W / 2, y + 17.5, `600 17px ${FD}`, '#FFFFFF');
      drawStar(ctx, CFG.W / 2 - w / 2 + 6, y + 2, 6, COL.yellow, 1 - out);
      drawStar(ctx, CFG.W / 2 + w / 2 - 6, y + 30, 5, COL.yellow, 1 - out);
      ctx.globalAlpha = 1;
    }
  }

  function drawBalance(ctx, s) {
    if (s.score < 2) return;
    const cx = CFG.W / 2, y = CFG.H - 22, half = 58;
    rr(ctx, cx - half - 12, y - 25, (half + 12) * 2, 36, 16, 'rgba(255,255,255,.82)');
    ctx.font = `600 9px ${FB}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = COL.muted;
    ctx.fillText(TQT('EQUILIBRIO'), cx, y - 14);
    // zone tint
    const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    g.addColorStop(0, 'rgba(255,90,110,.55)'); g.addColorStop(0.25, 'rgba(255,194,71,.45)'); g.addColorStop(0.5, 'rgba(76,217,100,.45)');
    g.addColorStop(0.75, 'rgba(255,194,71,.45)'); g.addColorStop(1, 'rgba(255,90,110,.55)');
    rr(ctx, cx - half, y - 3, half * 2, 6, 3, g);
    ctx.fillStyle = 'rgba(34,50,79,.35)'; ctx.fillRect(cx - 1, y - 6, 2, 12);
    const d = clamp(s.bal.signed, -1, 1), mx = cx + d * half;
    const col = Math.abs(d) < 0.45 ? COL.green : Math.abs(d) < 0.75 ? COL.orange : COL.red;
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); circ(ctx, mx, y, 7.5); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); circ(ctx, mx, y, 5.2); ctx.fill();
  }

  function drawOver(ctx, s) {
    const e = easeOutBack(Math.min(1, s.overT / 0.5));
    const dy = (1 - e) * -60, a = Math.min(1, s.overT / 0.25);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, dy);
    rr(ctx, CARD.x, CARD.y + 7, CARD.w, CARD.h, 30, 'rgba(34,50,79,.12)');
    rr(ctx, CARD.x, CARD.y, CARD.w, CARD.h, 30, '#FFFFFF');
    outlinedText(ctx, TQT('¡Se cayó la torre!'), CFG.W / 2, CARD.y + 40, `700 25px ${FD}`, COL.ink);
    ctx.font = `600 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.textAlign = 'center';
    ctx.fillText(s.reason === 'miss' ? TQT('Ese piso se te escapó por el borde.') : TQT('Se inclinó demasiado hacia un lado.'), CFG.W / 2, CARD.y + 68);
    // big number
    outlinedText(ctx, String(s.score), CFG.W / 2, CARD.y + 128, `700 70px ${FD}`, COL.purple);
    ctx.font = `600 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText(s.score === 1 ? TQT('Piso') : TQT('Pisos'), CFG.W / 2, CARD.y + 170);
    if (s.newBest) {
      ctx.save(); ctx.translate(CFG.W / 2 + 70, CARD.y + 104); ctx.rotate(0.14);
      const pulse = 1 + 0.04 * Math.sin(s.t * 5); ctx.scale(pulse, pulse);
      rr(ctx, -46, -12 + 3, 92, 24, 12, COL.yellowEdge); rr(ctx, -46, -12, 92, 24, 12, COL.yellow);
      ctx.font = `600 12px ${FD}`; ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TQT('¡Nuevo récord!'), 0, 0.5);
      ctx.restore();
    }
    // chips
    const chip = (x, label, val) => {
      rr(ctx, x, CARD.y + 188, 104, 40, 14, '#F3F0FF');
      ctx.font = `600 11px ${FB}`; ctx.fillStyle = COL.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 52, CARD.y + 200);
      ctx.font = `600 17px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText(String(val), x + 52, CARD.y + 217);
    };
    chip(CFG.W / 2 - 110, TQT('Perfectos'), s.perfects);
    chip(CFG.W / 2 + 6, TQT('Mejor'), s.best);
    drawButton(ctx, OVER_BTN, TQT('Otra vez'), s.ui.pressed === 'over');
    ctx.restore();
  }

  function draw(ctx, s) {
    const sky = skyAt(s.cam.y);
    drawSky(ctx, s, sky);
    drawClouds(ctx, s, sky, false);
    ctx.save(); ctx.translate(s.cam.sx, s.cam.sy);
    drawGround(ctx, s);
    drawBodies(ctx, s, s.bodies, sky.night);
    drawTower(ctx, s, sky.night);
    drawBlock(ctx, s, sky.night);
    drawBodies(ctx, s, s.debris, sky.night);
    drawFx(ctx, s);
    ctx.restore();
    drawClouds(ctx, s, sky, true);
    drawTinyFloating(ctx, s);
    drawWind(ctx, s);
    if (s.phase === 'start') drawStart(ctx, s);
    else drawHud(ctx, s);
    if (s.phase === 'over') drawOver(ctx, s);
    if (s.fade > 0) { const v = s.view; ctx.fillStyle = `rgba(255,255,255,${s.fade})`; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
  }

  /* ------------------------------------------------------------------
   * 6. HOST: mount / unmount / loop / input
   * ------------------------------------------------------------------ */
  let H = null; // host runtime (one instance)

  function loadBest() { let v = 0; try { v = parseInt(root.localStorage.getItem(CFG.STORAGE_KEY), 10) || 0; } catch (e) { v = 0; } return Math.max(v, tqBest()); }
  let memBest = 0;

  function hit(b, p, pad) { pad = pad || 8; return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + 6 + pad; }

  function restart() {
    const best = Math.max(H.s.best, memBest);
    const scene = H.s.scene, auto = H.s.auto, tiny = H.s.tiny;
    H.s = createState(best, scene); H.s.auto = auto; H.s.view = H.view;
    H.s.tiny.x = tiny.x; H.s.tiny.y = tiny.y; // Tiny glides from where it was
    H.s.fade = 1; startPlay(H.s);
  }

  function onDown(e) {
    if (!H) return;
    e.preventDefault();
    const p = toLogical(e), s = H.s;
    if (s.phase === 'start') { if (hit(START_BTN, p)) s.ui.pressed = 'start'; }
    else if (s.phase === 'over') { if (s.overT > 0.5 && hit(OVER_BTN, p)) s.ui.pressed = 'over'; }
    else if (s.phase === 'play') tap(s);
  }
  function onUp(e) {
    if (!H) return;
    const p = toLogical(e), s = H.s, pr = s.ui.pressed;
    s.ui.pressed = null;
    if (pr === 'start' && hit(START_BTN, p, 20)) startPlay(s);
    else if (pr === 'over' && hit(OVER_BTN, p, 20)) { memBest = Math.max(memBest, s.best); restart(); }
  }
  function onCancel() { if (H) H.s.ui.pressed = null; }
  function toLogical(e) {
    const r = H.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - H.ox) / H.k, y: (e.clientY - r.top - H.oy) / H.k };
  }

  /**
   * Canvas fills the container. The 330×525 field is fit-contained and centred;
   * any extra area shows more world (sky/ground), never blank bars.
   * If the container has no height of its own, the canvas takes the field's aspect.
   */
  function resize() {
    if (!H) return;
    const c = H.container;
    const cw = c.clientWidth || CFG.W;
    H.canvas.style.height = '0px';
    let ch = c.clientHeight;
    if (ch < 50) ch = (cw * CFG.H) / CFG.W;
    const dpr = Math.min(3, root.devicePixelRatio || 1);
    H.canvas.style.width = cw + 'px'; H.canvas.style.height = ch + 'px';
    H.canvas.width = Math.round(cw * dpr); H.canvas.height = Math.round(ch * dpr);
    H.k = Math.min(cw / CFG.W, ch / CFG.H);
    H.ox = (cw - CFG.W * H.k) / 2; H.oy = (ch - CFG.H * H.k) / 2;
    H.dpr = dpr;
    H.view = { x0: -H.ox / H.k, y0: -H.oy / H.k, x1: (cw - H.ox) / H.k, y1: (ch - H.oy) / H.k };
    if (H.s) H.s.view = H.view;
  }

  function frame(now) {
    if (!H) return;
    const dt = Math.min(0.05, Math.max(0, (now - (H.last || now)) / 1000));
    H.last = now;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < steps; i++) update(H.s, dt / steps);
    const ctx = H.ctx;
    H.s.view = H.view;
    ctx.setTransform(H.k * H.dpr, 0, 0, H.k * H.dpr, H.ox * H.dpr, H.oy * H.dpr);
    draw(ctx, H.s);
    H.raf = root.requestAnimationFrame(frame);
  }

  function mount(containerEl) {
    if (H) unmount();
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block'; canvas.style.touchAction = 'none'; canvas.style.userSelect = 'none';
    canvas.style.webkitTapHighlightColor = 'transparent'; canvas.setAttribute('aria-label', TQT('Torre de Tiny'));
    containerEl.appendChild(canvas);
    memBest = Math.max(memBest, loadBest());
    H = { container: containerEl, canvas, ctx: canvas.getContext('2d'), s: createState(memBest), raf: 0, last: 0, k: 1, ox: 0, oy: 0, dpr: 1, view: null };
    resize();
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onCancel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    if (root.ResizeObserver) { H.ro = new root.ResizeObserver(resize); H.ro.observe(containerEl); }
    else root.addEventListener('resize', resize);
    H.raf = root.requestAnimationFrame(frame);
  }

  function unmount() {
    if (!H) return;
    root.cancelAnimationFrame(H.raf);
    H.canvas.removeEventListener('pointerdown', onDown);
    H.canvas.removeEventListener('pointerup', onUp);
    H.canvas.removeEventListener('pointercancel', onCancel);
    H.canvas.removeEventListener('pointerleave', onCancel);
    if (H.ro) H.ro.disconnect(); else root.removeEventListener('resize', resize);
    if (H.canvas.parentNode) H.canvas.parentNode.removeChild(H.canvas);
    H = null;
  }

  root.TQTorre = {
    mount, unmount,
    again() { if (H) { memBest = Math.max(memBest, H.s.best); restart(); } },
    // Pure functions exposed for tests / tuning simulations
    _pure: { CFG, computeDrop, stackBalance, slideSpeed, slideStep, springStep, bendDisp, bendAngle, skyAt },
    // Debug hooks for the test harness (not needed by the app)
    _debug: {
      get state() { return H && H.s; },
      auto(on, errPx, until) { if (H) H.s.auto = on ? { err: errPx || 0, until: until || 0 } : null; },
      tap() { if (H) tap(H.s); },
      start() { if (H && H.s.phase === 'start') startPlay(H.s); },
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
