/* =====================================================================
 * TinyQuit · Minijuego "Tiro con arco" — PROTOTIPO canvas 2D
 * ---------------------------------------------------------------------
 * API:  window.TQArco = { mount(containerEl), unmount() }
 *
 * Structure (mirrors a future Flutter CustomPainter port):
 *   1. CFG / COL         tuning constants + palette (everything tweakable)
 *   2. Pure helpers      math, easing, projection, physics, scoring, sway
 *   3. State factory     createState(), deco generation (seeded)
 *   4. update(st, dt)    game logic / state machine, no drawing
 *   5. draw*(ctx, st)    rendering only, reads state, never mutates it
 *   6. Input             pointer events → state transitions
 *   7. mount / unmount   canvas, DPR, resize, RAF lifecycle
 *
 * World units: metres. Camera at (0, EYE, 0) looking +z (horizontal).
 * Logical field: 330 × 525 px ("base" coords); a camera zoom transform
 * (FOV change around the target centre) is applied on top for focus /
 * flight shots. HUD is drawn in un-zoomed logical coords.
 * ===================================================================== */
(function (global) {
  'use strict';

  // ---- puente con la app (Flutter): textos traducidos, récord y resultado ----
  // window.TQ_TR = {texto español: traducción}; window.TQ_BEST = récord guardado en la app;
  // window.TQBridge.postMessage(json) (canal de la app) recibe el resultado al terminar.
  function TQT(s) { try { const d = global.TQ_TR; return (d && typeof d[s] === 'string' && d[s]) || s; } catch (e) { return s; } }
  function tqSend(o) { try { if (global.TQBridge && global.TQBridge.postMessage) global.TQBridge.postMessage(JSON.stringify(o)); } catch (e) { /* sin app */ } }
  function vib(p) { try { if (global.TQBridge) tqSend({ ev: 'vib', p: p }); else if (global.navigator && global.navigator.vibrate) global.navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  function tqBest() { try { const v = +global.TQ_BEST; return isFinite(v) && v > 0 ? Math.floor(v) : 0; } catch (e) { return 0; } }

  /* ============================ 1. TUNING ============================ */
  const CFG = {
    W: 330, H: 525,          // logical field (portrait)
    HORIZON: 210,            // px — horizon line (~40% down)
    FOCAL: 900,              // px — perspective focal length (smaller = wider FOV)
    EYE: 1.6,                // m  — camera / eye height

    ARROWS: 5,
    DISTANCES: [18, 25, 32, 40, 50],   // m per arrow

    // Target (game-sized: a real 122 cm FITA face would be R=0.61)
    TARGET_R: 0.85,          // m — face radius
    TARGET_Y: 1.3,           // m — face centre height
    BOSS_HALF: 1.0,          // m — straw boss half-size (sticks, 0 pts)
    X_RING: 0.05,            // fraction of R — inner "X" (10 + celebration)

    // Ballistics (pure functions planShot / shotPos)
    V_MIN: 18, V_MAX: 56,    // m/s at 0% / 100% draw
    POWER_EXP: 1.4,          // draw→speed curve (weak draws drop hard)
    GRAVITY: 1.8,            // m/s² game gravity (real = 9.8, too punishing)
    MISS_GRAVITY: 40,        // m/s² after passing the target plane (drops into grass)
    WIND_ACC: 0.45,          // m/s² sideways per km/h (drift = ½·a·t²)
    WIND_MAX: [1.2, 2.0, 2.8, 3.5, 4.0], // km/h cap per arrow
    WIND_MIN_FRAC: 0.2,      // wind ∈ [MIN_FRAC·max, max]
    LAUNCH: { x: 0.02, y: 1.42, z: 1.95 }, // m — arrow TIP at release (tail ≈ 1.2 m from camera)
    SWEET_FROM: 0.85,        // draw ≥ 85% = "sweet zone" → full arrow speed (plateau)

    // Input / aiming (px in logical coords)
    // Power  = vertical drag DOWN (0 → DRAW_PX).          Aim X = horizontal drag.
    // Aim Y  = target centre; pulling FURTHER than full draw ("overdraw") raises
    //          the sight to compensate gravity at long range (power stays 100%).
    DRAW_PX: 100,            // drag-down distance for full draw
    MIN_POWER: 0.15,         // below: release cancels (no shot)
    AIM_SENS_X: 0.8,         // sight px per finger px (horizontal)
    AIM_OVERDRAW_SENS: 0.55, // sight rises this many px per px of overdraw
    AIM_OVERDRAW_MAX: 60,    // px — max sight raise
    INPUT_SMOOTH: 16,        // 1/s low-pass on the finger (aim + power), no jitter
    BOW_RAISE_K: 16,         // 1/s — bow comes up on press
    // Sway (Lissajous wobble, px) — 25% softer than v1
    SWAY_BASE: 2.1,          // steady breathing wobble
    SWAY_SETTLE: 5.25,       // extra wobble right after pressing…
    SWAY_SETTLE_RATE: 2.4,   // …decaying at this rate (1/s)
    FATIGUE_T: 2.5,          // s — holding longer than this = fatigue
    SWAY_FATIGUE: 6.75,      // px/s growth after FATIGUE_T
    SWAY_MAX: 18,

    // 3D arrow rendering (metres)
    ARROW_LEN: 0.75,         // shaft length in flight
    ROLL_RATE: 28,           // rad per physical second (fletching spin)
    VANE_R: 0.1, VANE_L: 0.22,  // fletching height / length (a bit oversized for readability)
    VANE_TWIST: 0.6,         // rad — helical twist so feathers show area when seen from behind
    STUCK_VISIBLE: 0.6,      // visible shaft once stuck
    STUCK_MIN_PX: 0.22,      // min foreshortened shaft length, in "metres at that depth"
    GROUND_DIVE: 0.55,       // min downward slope of arrows stuck in grass (≈30°)

    // Camera
    AIM_ZOOM: 0.3,           // extra zoom at full draw ("focus")
    FLIGHT_ZOOM_BASE: 1.7,   // flight zoom = BASE + PER_M·distance
    FLIGHT_ZOOM_PER_M: 0.02,
    FLIGHT_ANIM_BASE: 0.5,   // s — visual flight duration = BASE + PER_M·d
    FLIGHT_ANIM_PER_M: 0.01,
    SLOWMO_FROM: 0.72,       // fraction of flight where slow motion starts
    SLOWMO_RATE: 0.4,        // playback speed in slow motion
    LAUNCH_SLOW_UNTIL: 0.14, // fraction of flight shown slower right after release…
    LAUNCH_SLOW_RATE: 0.5,   // …so you see the arrow leave the bow spinning
    IMPACT_HOLD: 1.75,       // s — show result before the next arrow
    MOVE_TIME: 0.9,          // s — target slides to next distance


    STARS: [25, 35, 45],     // total needed for 1 / 2 / 3 stars
    BEST_KEY: 'tq_arco_best',
  };

  const COL = {
    sky0: '#8AD6FF', sky1: '#BEE9FF', sky2: '#E6F7FF',
    meadowL: '#9BE39F', meadowM: '#5CCB6A', meadowD: '#3FA557',
    path: '#F2E2B8', pathEdge: '#E4CD97',
    ink: '#22324F', muted: '#45516D',
    purple: '#7A5AF8', purpleL: '#9B82FF', purpleD: '#5237C9',
    yellow: '#FFC247', orange: '#FF9A3C', red: '#FF5A6E', green: '#4CD964',
    blue: '#5BB8F5', dark: '#3A4868', white: '#FFFFFF',
    cloudShadow: '#D9E6F2', pink: '#FF8FC0',
    wood: '#C98B55', woodD: '#A86A3C', woodDD: '#7A4A2A', trunk: '#B07A4A',
    straw: '#F2E2B8', strawD: '#DCC48C',
  };
  const FONT_D = 'Fredoka, Nunito, sans-serif';
  const FONT_B = 'Fredoka, sans-serif'; // todo en Fredoka (Jose, 11 oct)
  const font = (w, px, fam) => w + ' ' + px + 'px ' + fam;

  /* ========================= 2. PURE HELPERS ========================= */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (cur, target, k, dt) => lerp(cur, target, 1 - Math.exp(-k * dt));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** World (m) → base screen (px). s = px per metre at that depth. */
  function project(x, y, z) {
    const s = CFG.FOCAL / z;
    return { x: CFG.W / 2 + x * s, y: CFG.HORIZON - (y - CFG.EYE) * s, s };
  }
  /** Base screen point → world point on the plane at depth z. */
  function unproject(sx, sy, z) {
    return { x: ((sx - CFG.W / 2) * z) / CFG.FOCAL, y: CFG.EYE - ((sy - CFG.HORIZON) * z) / CFG.FOCAL };
  }

  const powerFromDrag = (dy) => clamp(dy / CFG.DRAW_PX, 0, 1);
  /** Sight in base coords from (filtered) drag delta. X = sideways drag; Y = centre, raised only by overdraw. */
  function sightFromDrag(dx, dy, tc) {
    const over = clamp((dy - CFG.DRAW_PX) * CFG.AIM_OVERDRAW_SENS, 0, CFG.AIM_OVERDRAW_MAX);
    return { x: tc.x + dx * CFG.AIM_SENS_X, y: tc.y - over };
  }
  /** Arrow speed fraction: sweet zone (≥ SWEET_FROM) is a plateau at full speed. */
  const speedFrac = (power) => Math.pow(clamp(power / CFG.SWEET_FROM, 0, 1), CFG.POWER_EXP);
  function swayAmp(hold) {
    const settle = CFG.SWAY_SETTLE * Math.exp(-hold * CFG.SWAY_SETTLE_RATE);
    const fatigue = Math.max(0, hold - CFG.FATIGUE_T) * CFG.SWAY_FATIGUE;
    return Math.min(CFG.SWAY_MAX, CFG.SWAY_BASE + settle + fatigue);
  }
  /** Breathing / Lissajous wobble offset (px). */
  function swayOffset(t, hold) {
    const a = swayAmp(hold);
    return {
      x: a * (0.7 * Math.sin(t * 1.7) + 0.3 * Math.sin(t * 3.3 + 1.3)),
      y: a * (0.6 * Math.sin(t * 1.25 + 0.6) + 0.25 * Math.sin(t * 2.9 + 2.1)) + 1.2 * Math.sin(t * 0.9),
    };
  }
  /** Signed wind in km/h (+ = blows to the right). */
  function rollWind(i, rnd) {
    const max = CFG.WIND_MAX[Math.min(i, CFG.WIND_MAX.length - 1)];
    const v = max * (CFG.WIND_MIN_FRAC + (1 - CFG.WIND_MIN_FRAC) * rnd());
    return Math.round(v * 10) / 10 * (rnd() < 0.5 ? -1 : 1);
  }
  /**
   * Plan a shot. The sight marks where a wind-less, gravity-less arrow would
   * cross the target plane; wind and gravity are then added on top.
   */
  function planShot(aimX, aimY, power, wind, dist) {
    const L = CFG.LAUNCH;
    const aim = unproject(aimX, aimY, dist);
    const v = CFG.V_MIN + (CFG.V_MAX - CFG.V_MIN) * speedFrac(power);
    const T = (dist - L.z) / v;
    return {
      x0: L.x, y0: L.y, z0: L.z,
      vx: (aim.x - L.x) / T, vy: (aim.y - L.y) / T, vz: v,
      ax: wind * CFG.WIND_ACC, g: CFG.GRAVITY, T, dist, power, wind,
    };
  }
  /** Position at physical time t (piecewise: extra gravity after the plane). */
  function shotPos(sh, t) {
    const tt = Math.min(t, sh.T);
    let y = sh.y0 + sh.vy * tt - 0.5 * sh.g * tt * tt;
    if (t > sh.T) {
      const d = t - sh.T, vyT = sh.vy - sh.g * sh.T;
      y += vyT * d - 0.5 * CFG.MISS_GRAVITY * d * d;
    }
    return { x: sh.x0 + sh.vx * t + 0.5 * sh.ax * t * t, y, z: sh.z0 + sh.vz * t };
  }
  function shotVel(sh, t) {
    const vy = sh.vy - sh.g * Math.min(t, sh.T) - (t > sh.T ? CFG.MISS_GRAVITY * (t - sh.T) : 0);
    return { x: sh.vx + sh.ax * t, y: vy, z: sh.vz };
  }
  /** First time the arrow touches the ground and whether that's before the target plane. */
  function groundTime(sh) {
    const g = sh.g;
    const t1 = (sh.vy + Math.sqrt(sh.vy * sh.vy + 2 * g * sh.y0)) / g;
    if (t1 <= sh.T) return { t: t1, beforePlane: true };
    const p = shotPos(sh, sh.T), vyT = sh.vy - g * sh.T, G = CFG.MISS_GRAVITY;
    const d = (vyT + Math.sqrt(vyT * vyT + 2 * G * Math.max(0, p.y))) / G;
    return { t: sh.T + d, beforePlane: false };
  }
  /** Classify a crossing of the target plane at (x, y). */
  function classifyPlaneHit(x, y) {
    const r = Math.hypot(x, y - CFG.TARGET_Y) / CFG.TARGET_R;
    if (r <= 1) return { kind: r <= CFG.X_RING ? 'x' : 'ring', score: clamp(10 - Math.floor(r * 10), 1, 10), r };
    if (Math.abs(x) <= CFG.BOSS_HALF && Math.abs(y - CFG.TARGET_Y) <= CFG.BOSS_HALF) return { kind: 'boss', score: 0 };
    return { kind: 'miss', score: 0 };
  }
  const starsFor = (total) => CFG.STARS.reduce((n, th) => n + (total >= th ? 1 : 0), 0);
  const flightZoom = (d) => CFG.FLIGHT_ZOOM_BASE + CFG.FLIGHT_ZOOM_PER_M * d;
  const flightAnimTime = (d) => CFG.FLIGHT_ANIM_BASE + CFG.FLIGHT_ANIM_PER_M * d;
  const norm3 = (v) => { const m = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / m, y: v.y / m, z: v.z / m }; };
  /** Orthonormal basis (a, b) perpendicular to unit dir — for the fletching ring. */
  function perpBasis(d) {
    const a = norm3({ x: -d.z, y: 0, z: d.x });
    return { a, b: { x: a.y * d.z - a.z * d.y, y: a.z * d.x - a.x * d.z, z: a.x * d.y - a.y * d.x } };
  }
  const fmtWind = (w) => Math.abs(w).toFixed(1).replace('.', ',');
  function scoreColor(sc) {
    if (sc >= 9) return { bg: COL.yellow, fg: COL.ink };
    if (sc >= 7) return { bg: COL.red, fg: COL.white };
    if (sc >= 5) return { bg: COL.blue, fg: COL.white };
    if (sc >= 3) return { bg: COL.dark, fg: COL.white };
    if (sc >= 1) return { bg: COL.white, fg: COL.ink };
    return { bg: '#E3E8EF', fg: '#8A94A8' };
  }
  function missHint(x, y, wind) {
    const dy = y - CFG.TARGET_Y;
    if (Math.abs(x) > Math.abs(dy)) {
      if (Math.sign(x) === Math.sign(wind) && Math.abs(wind) > 1.5) return TQT('El viento la ha desviado');
      return x < 0 ? TQT('Demasiado a la izquierda') : TQT('Demasiado a la derecha');
    }
    return dy > 0 ? TQT('Alta: tira un poco menos') : TQT('Baja: tira un poco más');
  }

  /* ========================= 3. STATE ========================= */
  function loadBest() {
    let v = 0; try { v = parseInt(global.localStorage.getItem(CFG.BEST_KEY), 10); } catch (e) { v = 0; } return Math.max(isFinite(v) ? v : 0, tqBest());
  }
  function saveBest(v) {
    try { global.localStorage.setItem(CFG.BEST_KEY, String(v)); } catch (e) { /* ignore */ }
  }

  function makeDeco(seed) {
    const r = mulberry32(seed);
    const trees = [];
    for (let z = 14; z < 170; z += 6 + r() * 3) {
      for (const side of [-1, 1]) {
        trees.push({ x: side * (5.8 + r() * 1.6), z: z + r() * 2, sc: 0.85 + r() * 0.4, ph: r() * 6.28, tone: r() });
        if (r() < 0.8) trees.push({ x: side * (10 + r() * 3), z: z + 3 + r() * 3, sc: 0.95 + r() * 0.5, ph: r() * 6.28, tone: r() });
      }
    }
    const tufts = [], flowers = [];
    for (let i = 0; i < 90; i++) {
      const z = 3 + Math.pow(r(), 1.6) * 45;
      let x = (r() * 2 - 1) * 5.2;
      if (Math.abs(x) < 1.1) x += Math.sign(x || 1) * 1.2;
      tufts.push({ x, z, ph: r() * 6.28, h: 0.18 + r() * 0.14 });
    }
    const fc = [COL.white, COL.yellow, COL.pink, '#FFFFFF', '#FFE59A'];
    for (let i = 0; i < 46; i++) {
      const z = 3.5 + Math.pow(r(), 1.4) * 40;
      let x = (r() * 2 - 1) * 5;
      if (Math.abs(x) < 1.15) x += Math.sign(x || 1) * 1.3;
      flowers.push({ x, z, c: fc[Math.floor(r() * fc.length)] });
    }
    const clouds = [
      { x: 70, y: 112, s: 0.75, v: 4 }, { x: 262, y: 104, s: 0.62, v: 3 },
      { x: 175, y: 160, s: 0.45, v: 6 }, { x: -20, y: 168, s: 0.4, v: 5 }, { x: 330, y: 176, s: 0.36, v: 4.5 },
    ];
    return { trees, tufts, flowers, clouds };
  }

  function createState() {
    return {
      phase: 'start', t: 0, phaseT: 0,
      rnd: mulberry32((Date.now() & 0xffff) ^ 0x9e37),
      arrowIdx: 0, results: [], total: 0, best: loadBest(), newBest: false,
      targetDist: CFG.DISTANCES[0], distFrom: CFG.DISTANCES[0], distTo: CFG.DISTANCES[0],
      wind: 1.2, windVis: 1.2,
      pointer: { id: null, sx: 0, sy: 0, x: 0, y: 0, fx: 0, fy: 0 },
      drawing: { hold: 0, power: 0, powerVis: 0, sight: { x: CFG.W / 2, y: 225 }, sweetT: 99, inSweet: false },
      bowUp: 0, view: { x0: 0, y0: 0, x1: CFG.W, y1: CFG.H },
      shot: null, u: 0, trail: [], zoomAtRelease: 1,
      stuck: [], ground: [], particles: [], popups: [], banners: [],
      cam: { zoom: 1, fx: CFG.W / 2, fy: 225, shake: 0 },
      wobble: { t: 99, amp: 0 },
      tiny: { mood: 'happy', moodT: 0, bubble: '', bubbleT: 0, jumpT: 99 },
      arrowIn: 1, bowRelease: 99, hintSeen: false, pressedBtn: null, endT: 0, cancelT: 99,
    };
  }

  /* ========================= 4. UPDATE ========================= */
  function setPhase(st, p) { st.phase = p; st.phaseT = 0; }
  function tinySay(st, mood, text, dur) {
    st.tiny.mood = mood; st.tiny.moodT = dur || 2.2; st.tiny.bubble = text || ''; st.tiny.bubbleT = text ? (dur || 2.2) : 0;
    st.tiny.jumpT = 0;
  }
  function pushBanner(st, text, sub, dur, delay) {
    st.banners.push({ text, sub, dur: dur || 1.6, t: -(delay || 0) });
  }

  function newGame(st) {
    tqSend({ ev: 'play' });
    st.arrowIdx = 0; st.results = []; st.total = 0; st.newBest = false;
    st.stuck = []; st.ground = []; st.particles = []; st.popups = []; st.banners = [];
    st.targetDist = st.distFrom = st.distTo = CFG.DISTANCES[0];
    st.shot = null;
    startArrow(st);
  }
  function startArrow(st) {
    st.wind = rollWind(st.arrowIdx, st.rnd);
    st.arrowIn = 0; st.shot = null; st.trail = [];
    const d = CFG.DISTANCES[st.arrowIdx];
    pushBanner(st, d + ' m', st.wind === 0 ? TQT('Sin viento') : TQT('Viento ') + fmtWind(st.wind) + ' km/h ' + (st.wind > 0 ? '→' : '←'), 1.5);
    setPhase(st, 'ready');
  }
  function nextArrow(st) {
    st.arrowIdx++;
    if (st.arrowIdx >= CFG.ARROWS) {
      if (st.total > st.best) { st.best = st.total; st.newBest = true; saveBest(st.total); }
      tqSend({ game: 'arco', score: st.total, hits: st.results.filter((r) => r && r.score > 0).length, bulls: st.results.filter((r) => r && r.kind === 'x').length });
      const stars = starsFor(st.total);
      tinySay(st, stars >= 2 ? 'wow' : stars === 1 ? 'happy' : 'sad', '', 99);
      setPhase(st, 'end'); st.endT = 0;
      return;
    }
    st.distFrom = st.targetDist; st.distTo = CFG.DISTANCES[st.arrowIdx];
    setPhase(st, 'move');
  }

  function fire(st) {
    vib(18);
    const dr = st.drawing;
    const sh = planShot(dr.sight.x, dr.sight.y, dr.power, st.wind, st.targetDist);
    const g = groundTime(sh);
    sh.kind = g.beforePlane ? 'short' : 'pending';
    sh.tEnd = g.beforePlane ? g.t : sh.T;
    sh.tLand = g.t;
    sh.rate = sh.T / flightAnimTime(st.targetDist);
    sh.roll0 = st.rnd() * Math.PI * 2;
    st.shot = sh; st.u = 0; st.trail = [];
    st.zoomAtRelease = st.cam.zoom;
    st.bowRelease = 0; st.hintSeen = true;
    st.tiny.mood = 'wow'; st.tiny.moodT = 5;
    setPhase(st, 'flight');
  }

  function spawnBurst(st, x, y, n, colors, speed, kind) {
    for (let i = 0; i < n; i++) {
      const a = st.rnd() * Math.PI * 2, v = speed * (0.35 + st.rnd() * 0.65);
      st.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25,
        life: 0, max: 0.55 + st.rnd() * 0.5, c: colors[i % colors.length],
        size: kind === 'star' ? 3.5 + st.rnd() * 2.5 : 1.4 + st.rnd() * 1.6, kind: kind || 'dot', rot: st.rnd() * 6,
      });
    }
  }

  function recordResult(st, res) {
    st.results.push(res); st.total += res.score;
  }

  function onPlaneHit(st, hit, p) {
    const sh = st.shot, d = st.targetDist;
    const v = shotVel(sh, sh.T), vl = Math.hypot(v.x, v.y, v.z);
    const dir = { x: v.x / vl, y: v.y / vl, z: v.z / vl };
    const sp = project(p.x, p.y, d);
    if (hit.kind === 'miss') {
      sh.kind = 'miss'; sh.tEnd = sh.tLand; sh.missHint = missHint(p.x, p.y, st.wind);
      return;
    }
    vib(hit.score >= 10 ? [40, 40, 90] : 50);
    // Sticks in face or boss
    sh.kind = hit.kind; st.u = sh.T;
    st.stuck.push({ lx: p.x, ly: p.y - CFG.TARGET_Y, dir, kind: hit.kind, roll: sh.roll0 + sh.T * CFG.ROLL_RATE, t0: st.t });
    st.wobble = { t: 0, amp: 0.045 * (p.x >= 0 ? 1 : -1) };
    st.cam.shake = hit.kind === 'x' ? 4 : 2.5;
    spawnBurst(st, sp.x, sp.y, 10, [COL.straw, '#FFFFFF', COL.strawD], 40, 'dot');
    let text, sub = '', color = COL.ink, big = false;
    if (hit.kind === 'boss') {
      recordResult(st, { score: 0, kind: 'boss', dist: d });
      text = TQT('¡Fuera!'); sub = TQT('Casi… ¡en la paja!'); color = COL.muted;
      tinySay(st, 'sad', TQT('¡Ánimo!'));
    } else {
      // Racha de dieces seguidos: 10 · 11 · 13 · 16 · 20 (un extra pequeño que va subiendo)
      let streak = 0;
      if (hit.score >= 10) for (let i = st.results.length - 1; i >= 0 && (st.results[i].base || 0) >= 10; i--) streak++;
      const bonus = hit.score >= 10 ? [0, 1, 3, 6, 10][Math.min(streak, 4)] : 0, pts = hit.score + bonus;
      recordResult(st, { score: pts, base: hit.score, kind: hit.kind, dist: d });
      if (hit.kind === 'x') {
        text = TQT('¡DIANA!'); sub = '+' + pts; color = COL.orange; big = true;
        if (bonus) { text = TQT('¡Racha de dianas!'); }
        spawnBurst(st, sp.x, sp.y, 12, [COL.yellow, '#FFE59A', COL.orange], 80, 'star');
        st.popups.push({ ring: true, x: sp.x, y: sp.y, t: 0 });
        tinySay(st, 'wow', TQT('¡¡DIANA!!'));
      } else {
        text = '+' + pts;
        sub = bonus ? TQT('¡Racha de dianas!') : hit.score >= 10 ? TQT('¡Perfecto!') : hit.score >= 9 ? TQT('¡Genial!') : hit.score >= 7 ? TQT('¡Muy bien!') : hit.score >= 5 ? TQT('¡Bien!') : TQT('¡Dentro!');
        color = scoreColor(hit.score).bg === COL.white ? COL.muted : scoreColor(hit.score).bg;
        if (hit.score >= 9) spawnBurst(st, sp.x, sp.y, 6, [COL.yellow, '#FFE59A'], 55, 'star');
        tinySay(st, hit.score >= 9 ? 'wow' : hit.score >= 5 ? 'happy' : 'sad', hit.score >= 9 ? TQT('¡Guau!') : hit.score >= 5 ? TQT('¡Bien!') : TQT('¡Casi!'));
      }
    }
    const top = project(0, CFG.TARGET_Y + CFG.BOSS_HALF + 0.35, d);
    st.popups.push({ x: sp.x, y: Math.min(sp.y, top.y + 10) - 6, text, sub, color, t: 0, big });
    setPhase(st, 'impact');
  }

  function onLand(st) {
    const sh = st.shot, p = shotPos(sh, sh.tEnd), v = shotVel(sh, sh.tEnd);
    const vl = Math.hypot(v.x, v.y, v.z), d0 = { x: v.x / vl, y: v.y / vl, z: v.z / vl };
    // plausible "stuck in grass" angle: at least GROUND_DIVE downward slope
    const dir = norm3({ x: d0.x, y: Math.min(d0.y, -CFG.GROUND_DIVE), z: d0.z });
    st.ground.push({ x: p.x, z: p.z, dir, roll: sh.roll0 + sh.tEnd * CFG.ROLL_RATE, t0: st.t });
    const gp = project(p.x, 0, p.z);
    spawnBurst(st, gp.x, gp.y, 7, [COL.meadowM, COL.meadowL, COL.meadowD], 30, 'dot');
    recordResult(st, { score: 0, kind: 'miss', dist: st.targetDist });
    const top = project(0, CFG.TARGET_Y + CFG.BOSS_HALF + 0.35, st.targetDist);
    const sub = sh.kind === 'short' ? TQT('Tensa más el arco') : sh.missHint || '';
    st.popups.push({ x: top.x, y: top.y, text: TQT('¡Fuera!'), sub, color: COL.red, t: 0 });
    tinySay(st, 'sad', sh.kind === 'short' ? TQT('¡Más fuerte!') : TQT('¡Otra vez!'));
    setPhase(st, 'impact');
  }

  function dr0(st, dt) { st.drawing.sweetT += dt; }
  function update(st, dt) {
    st.t += dt; st.phaseT += dt;
    const W = CFG.W;
    // --- ambient
    st.windVis = damp(st.windVis, st.wind, 2.5, dt);
    for (const c of st.deco.clouds) {
      c.x += (c.v + st.windVis * 2) * dt * c.s;
      const v = st.view; if (c.x > v.x1 + 90) c.x = v.x0 - 90; if (c.x < v.x0 - 90) c.x = v.x1 + 90;
    }
    const tn = st.tiny;
    tn.jumpT += dt;
    if (tn.moodT > 0) { tn.moodT -= dt; if (tn.moodT <= 0) tn.mood = 'happy'; }
    if (tn.bubbleT > 0) tn.bubbleT -= dt;
    st.wobble.t += dt; st.bowRelease += dt; st.cancelT += dt;
    st.cam.shake = damp(st.cam.shake, 0, 8, dt);
    for (const b of st.banners) b.t += dt;
    st.banners = st.banners.filter((b) => b.t < b.dur);
    st.bowUp = damp(st.bowUp, st.phase === 'drawing' ? 1 : 0, st.phase === 'drawing' ? CFG.BOW_RAISE_K : 3.5, dt);
    dr0(st, dt);

    let zoomTarget = 1, zoomK = 5;
    const dr = st.drawing;
    switch (st.phase) {
      case 'ready':
        st.arrowIn = Math.min(1, st.arrowIn + dt / 0.35);
        dr.powerVis = damp(dr.powerVis, 0, 14, dt);
        break;
      case 'drawing': {
        dr.hold += dt;
        const pt = st.pointer;
        // low-pass filtered finger → smooth, jitter-free power and aim
        pt.fx = damp(pt.fx, pt.x, CFG.INPUT_SMOOTH, dt); pt.fy = damp(pt.fy, pt.y, CFG.INPUT_SMOOTH, dt);
        const dx = pt.fx - pt.sx, dy = pt.fy - pt.sy;
        dr.power = powerFromDrag(dy);
        dr.powerVis = dr.power;
        const sweet = dr.power >= CFG.SWEET_FROM;
        if (sweet && !dr.inSweet) { dr.sweetT = 0; st.cam.shake = Math.max(st.cam.shake, 1.2); }
        dr.inSweet = sweet;
        const tc = project(0, CFG.TARGET_Y, st.targetDist);
        const base = sightFromDrag(dx, dy, tc), sw = swayOffset(st.t, dr.hold);
        dr.sight = { x: base.x + sw.x, y: base.y + sw.y };
        zoomTarget = 1 + CFG.AIM_ZOOM * dr.powerVis;
        if (dr.hold > CFG.FATIGUE_T + 0.4 && tn.bubbleT <= 0 && tn.bubble !== TQT('¡Suelta ya!')) tinySay(st, 'wow', TQT('¡Suelta ya!'), 1.6);
        break;
      }
      case 'flight': {
        const sh = st.shot;
        const frac = st.u / sh.T;
        const slow = frac > CFG.SLOWMO_FROM && sh.kind === 'pending' ? CFG.SLOWMO_RATE
          : frac < CFG.LAUNCH_SLOW_UNTIL ? lerp(CFG.LAUNCH_SLOW_RATE, 1, frac / CFG.LAUNCH_SLOW_UNTIL) : 1;
        const prevU = st.u;
        st.u += dt * sh.rate * slow;
        if (sh.kind === 'pending' && st.u >= sh.T) {
          const p = shotPos(sh, sh.T);
          onPlaneHit(st, classifyPlaneHit(p.x, p.y), p);
        }
        if (st.phase === 'flight' && st.u >= sh.tEnd) { st.u = sh.tEnd; onLand(st); }
        if (prevU !== st.u || st.phase === 'flight') {
          const q = shotPos(sh, st.u), v = norm3(shotVel(sh, st.u)), L = CFG.ARROW_LEN;
          st.trail.push({ x: q.x - v.x * L, y: q.y - v.y * L, z: q.z - v.z * L });
          if (st.trail.length > 14) st.trail.shift();
        }
        const fz = flightZoom(st.targetDist);
        { const fr = clamp(st.u / sh.T, 0, 1); zoomTarget = lerp(st.zoomAtRelease, fz, 1 - (1 - fr) * (1 - fr)); }
        if (sh.kind === 'miss') zoomTarget = fz * 0.85;
        zoomK = 12;
        break;
      }
      case 'impact':
        zoomTarget = st.shot && st.shot.kind !== 'short' && st.shot.kind !== 'miss' ? flightZoom(st.targetDist) * 1.04 : flightZoom(st.targetDist) * 0.8;
        zoomK = 4;
        if (st.trail.length) st.trail.shift();
        if (st.phaseT > CFG.IMPACT_HOLD) nextArrow(st);
        break;
      case 'move': {
        const k = easeInOutCubic(clamp(st.phaseT / CFG.MOVE_TIME, 0, 1));
        st.targetDist = lerp(st.distFrom, st.distTo, k);
        zoomTarget = 1; zoomK = 6;
        if (st.phaseT >= CFG.MOVE_TIME) { st.targetDist = st.distTo; startArrow(st); }
        break;
      }
      case 'end':
        st.endT += dt; zoomTarget = 1; break;
      default: break;
    }
    st.cam.zoom = damp(st.cam.zoom, zoomTarget, zoomK, dt);
    const tc = project(0, CFG.TARGET_Y, st.targetDist);
    st.cam.fx = tc.x; st.cam.fy = tc.y;

    // particles & popups (base coords)
    for (const p of st.particles) {
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.vx *= 0.98; p.rot += dt * 4;
    }
    st.particles = st.particles.filter((p) => p.life < p.max);
    for (const p of st.popups) p.t += dt;
    st.popups = st.popups.filter((p) => p.t < (p.ring ? 0.6 : 1.7));
  }

  /* ========================= 5. DRAW ========================= */
  // --- primitives
  function rrPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function fillRR(ctx, x, y, w, h, r, fill) { ctx.beginPath(); rrPath(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  /** Toy "3D" block: solid darker bottom edge. */
  function block3D(ctx, x, y, w, h, r, top, bottom, depth) {
    fillRR(ctx, x, y + depth, w, h, r, bottom);
    fillRR(ctx, x, y, w, h, r, top);
  }
  function starPath(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.48 : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function outlinedText(ctx, text, x, y, fill, stroke, lw) {
    ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
  }
  function wrapText(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function cloudPuff(ctx, x, y, s, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s);
    const puffs = (dy) => {
      ctx.beginPath();
      ctx.arc(-24, 6 + dy, 17, 0, 6.29); ctx.moveTo(24, 6 + dy);
      ctx.arc(0, -4 + dy, 24, 0, 6.29);
      ctx.moveTo(40, 6 + dy); ctx.arc(24, 6 + dy, 16, 0, 6.29);
      ctx.moveTo(22, -8 + dy); ctx.arc(10, -12 + dy, 14, 0, 6.29);
      rrPath(ctx, -40, 4 + dy, 80, 20, 10);
    };
    puffs(4); ctx.fillStyle = COL.cloudShadow; ctx.fill();
    puffs(0); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
  }

  // --- Tiny mascot (SVG geometry, viewBox 8 6 104 90)
  function tinyBodyPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(58, 58); ctx.arc(34, 58, 24, 0, Math.PI * 2);
    ctx.moveTo(90, 40); ctx.arc(60, 40, 30, 0, Math.PI * 2);
    ctx.moveTo(111, 56); ctx.arc(88, 56, 23, 0, Math.PI * 2);
    rrPath(ctx, 12, 52, 96, 36, 18);
  }
  function drawTiny(ctx, cx, cy, size, mood, t, opts) {
    opts = opts || {};
    const s = size / 104;
    ctx.save(); ctx.translate(cx, cy);
    if (opts.squash) ctx.scale(1 + opts.squash * 0.06, 1 - opts.squash * 0.08);
    ctx.scale(s, s); ctx.translate(-60, -51);
    ctx.save(); ctx.translate(0, 5); tinyBodyPath(ctx); ctx.fillStyle = COL.cloudShadow; ctx.fill(); ctx.restore();
    tinyBodyPath(ctx); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    const lx = opts.look || 0;
    const blink = (t % 3.4) < 0.12 ? 0.15 : 1;
    ctx.fillStyle = COL.ink;
    for (const ex of [48, 72]) {
      ctx.beginPath(); ctx.ellipse(ex + lx, 62, 5, 6.6 * blink, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (blink === 1) { circle(ctx, 50 + lx, 59.5, 1.8, '#FFFFFF'); circle(ctx, 74 + lx, 59.5, 1.8, '#FFFFFF'); }
    ctx.globalAlpha = 0.75; ctx.fillStyle = COL.pink;
    ctx.beginPath(); ctx.ellipse(37, 73, 6, 4, 0, 0, Math.PI * 2); ctx.ellipse(83, 73, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    if (mood === 'wow') {
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.ellipse(60 + lx * 0.5, 77, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      if (mood === 'sad') { ctx.moveTo(51, 79); ctx.quadraticCurveTo(60, 69, 69, 79); } else { ctx.moveTo(51, 73); ctx.quadraticCurveTo(60, 83, 69, 73); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- world layers
  function drawSkyAndHills(ctx, st) {
    const { W, HORIZON } = CFG;
    const g = ctx.createLinearGradient(0, -40, 0, HORIZON);
    g.addColorStop(0, COL.sky0); g.addColorStop(0.55, COL.sky1); g.addColorStop(1, COL.sky2);
    ctx.fillStyle = g; ctx.fillRect(-900, -1200, W + 1800, HORIZON + 1202);
    const sun = ctx.createRadialGradient(270, 58, 4, 270, 58, 90);
    sun.addColorStop(0, 'rgba(255,247,214,0.95)'); sun.addColorStop(0.25, 'rgba(255,247,214,0.55)'); sun.addColorStop(1, 'rgba(255,247,214,0)');
    ctx.fillStyle = sun; ctx.fillRect(170, -40, 200, 200);
    for (const c of st.deco.clouds) cloudPuff(ctx, c.x, c.y, c.s, 0.96);
    // hills
    const hill = (bumps, color) => {
      ctx.fillStyle = color; ctx.beginPath();
      for (const [x, r, h] of bumps) { ctx.moveTo(x + r, HORIZON + 30); ctx.ellipse(x, HORIZON + 2, r, h, 0, Math.PI, 0); }
      ctx.fill();
    };
    hill([[-10, 90, 34], [95, 80, 26], [200, 95, 36], [320, 90, 30], [420, 60, 20]], '#CDEFD2');
    hill([[30, 70, 18], [150, 60, 14], [255, 80, 22], [360, 60, 16]], '#B2E6B8');
  }

  function drawGround(ctx, st) {
    const { W, H, HORIZON } = CFG;
    const g = ctx.createLinearGradient(0, HORIZON, 0, H);
    g.addColorStop(0, '#B7ECBA'); g.addColorStop(0.18, COL.meadowL); g.addColorStop(1, COL.meadowM);
    ctx.fillStyle = g; ctx.fillRect(-900, HORIZON, W + 1800, H - HORIZON + 1200);
    // mowed stripes (perspective bands)
    ctx.fillStyle = 'rgba(63,165,87,0.10)';
    for (let k = 0; k < 60; k += 2) {
      const z1 = 2.5 + k * 3.2, z2 = z1 + 3.2;
      const y1 = project(0, 0, z1).y, y2 = project(0, 0, z2).y;
      if (y1 < HORIZON + 0.5) break;
      ctx.fillRect(-900, y2, W + 1800, y1 - y2);
    }
    const haze = ctx.createLinearGradient(0, HORIZON, 0, HORIZON + 26);
    haze.addColorStop(0, 'rgba(230,247,255,0.7)'); haze.addColorStop(1, 'rgba(230,247,255,0)');
    ctx.fillStyle = haze; ctx.fillRect(-900, HORIZON, W + 1800, 26);
    // cream path towards the target
    const D = st.targetDist - 0.6;
    const a = project(-0.8, 0, 1.4), b = project(0.8, 0, 1.4), c = project(0.62, 0, D), d = project(-0.62, 0, D);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
    ctx.fillStyle = COL.path; ctx.fill();
    const e = project(0, 0, D);
    ctx.beginPath(); ctx.ellipse(e.x, e.y, 0.62 * e.s, 0.62 * e.s * 0.12 + 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COL.pathEdge; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    // stepping pebbles on path
    ctx.fillStyle = 'rgba(214,190,136,0.55)';
    for (let z = 4; z < D - 1; z += 3.5) {
      const p = project(((z * 7.3) % 1) * 0.6 - 0.3, 0, z);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.12 * p.s, 0.04 * p.s + 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawTree(ctx, tr, st) {
    const base = project(tr.x, 0, tr.z), s = base.s;
    if (base.x < st.view.x0 - 90 || base.x > st.view.x1 + 90) return;
    const sc = tr.sc, r = 1.25 * sc * s;
    const wn = st.windVis / 4;
    const sway = (wn * 0.14 + Math.sin(st.t * 1.7 + tr.ph) * 0.035 * (0.5 + Math.abs(wn))) * r;
    // ground shadow
    ctx.fillStyle = 'rgba(63,165,87,0.35)';
    ctx.beginPath(); ctx.ellipse(base.x, base.y, r * 0.95, r * 0.22 + 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // trunk
    const th = 1.15 * sc * s, tw = 0.3 * sc * s;
    fillRR(ctx, base.x - tw / 2, base.y - th, tw, th, tw / 2, COL.trunk);
    fillRR(ctx, base.x, base.y - th, tw / 2, th, tw / 4, '#9A6638');
    const cx = base.x + sway, cy = base.y - th - r * 0.85;
    const light = tr.tone > 0.6 ? '#A9EBAC' : COL.meadowL, mid = tr.tone > 0.6 ? '#6ED67B' : COL.meadowM;
    const blobs = (dx, dy, k) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx + r, cy + dy); ctx.arc(cx + dx, cy + dy, r * k, 0, 6.29);
      ctx.moveTo(cx + dx - 0.55 * r + 0.72 * r * k, cy + dy + 0.25 * r); ctx.arc(cx + dx - 0.55 * r, cy + dy + 0.25 * r, 0.72 * r * k, 0, 6.29);
      ctx.moveTo(cx + dx + 0.58 * r + 0.7 * r * k, cy + dy + 0.22 * r); ctx.arc(cx + dx + 0.58 * r, cy + dy + 0.22 * r, 0.7 * r * k, 0, 6.29);
      ctx.moveTo(cx + dx + 0.08 * r + 0.62 * r * k, cy + dy - 0.55 * r); ctx.arc(cx + dx + 0.08 * r, cy + dy - 0.55 * r, 0.62 * r * k, 0, 6.29);
    };
    blobs(r * 0.06, r * 0.14, 1); ctx.fillStyle = COL.meadowD; ctx.fill();
    blobs(0, 0, 1); ctx.fillStyle = mid; ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.arc(cx - 0.3 * r + sway * 0.2, cy - 0.35 * r, 0.42 * r, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 0.62 * r, cy + 0.12 * r, 0.26 * r, 0, 6.29); ctx.fill();
    if (s > 14) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(cx - 0.42 * r, cy - 0.5 * r, 0.1 * r, 0, 6.29); ctx.fill(); }
  }

  function drawTuft(ctx, tf, st) {
    const p = project(tf.x, 0, tf.z), s = p.s;
    if (p.x < st.view.x0 - 20 || p.x > st.view.x1 + 20) return;
    const h = tf.h * s, lean = (st.windVis / 4) * 0.35 + Math.sin(st.t * 2.2 + tf.ph) * 0.08;
    ctx.strokeStyle = COL.meadowD; ctx.lineCap = 'round'; ctx.lineWidth = clamp(0.035 * s, 0.8, 3);
    ctx.beginPath();
    for (const o of [-0.35, 0, 0.35]) {
      const bx = p.x + o * h * 0.5;
      ctx.moveTo(bx, p.y); ctx.quadraticCurveTo(bx + (o * 0.4 + lean * 0.5) * h, p.y - h * 0.6, bx + (o * 0.6 + lean) * h, p.y - h * (1 - Math.abs(o) * 0.3));
    }
    ctx.stroke();
  }
  function drawFlower(ctx, f) {
    const p = project(f.x, 0.04, f.z), r = clamp(0.07 * p.s, 0.8, 5);
    circle(ctx, p.x, p.y, r, f.c);
    if (r > 2) circle(ctx, p.x, p.y, r * 0.4, f.c === COL.yellow ? COL.orange : COL.yellow);
  }

  const VANES = [[COL.purple, COL.purpleD], [COL.orange, '#E07A20'], [COL.red, '#D63F55']];
  /**
   * 3D arrow seen from behind. tip = world point, dir = unit direction of travel,
   * len = visible shaft length (m), roll = spin angle of the 3 fletches (rad).
   */
  function drawArrow3D(ctx, tip, dir, len, roll, alpha) {
    const tail = { x: tip.x - dir.x * len, y: tip.y - dir.y * len, z: tip.z - dir.z * len };
    if (tail.z < 0.5) return;
    const pT = project(tail.x, tail.y, tail.z), pP = project(tip.x, tip.y, tip.z);
    ctx.save(); if (alpha != null) ctx.globalAlpha *= alpha;
    // shaft (perspective taper)
    const sx = pP.x - pT.x, sy = pP.y - pT.y, sm = Math.hypot(sx, sy);
    const nx = sm > 0.01 ? -sy / sm : 1, ny = sm > 0.01 ? sx / sm : 0;
    const wT = Math.max(0.9, 0.014 * pT.s), wP = Math.max(0.6, 0.014 * pP.s);
    const quad = (k, col) => {
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(pT.x + nx * (wT + k), pT.y + ny * (wT + k)); ctx.lineTo(pP.x + nx * (wP + k), pP.y + ny * (wP + k));
      ctx.lineTo(pP.x - nx * (wP + k), pP.y - ny * (wP + k)); ctx.lineTo(pT.x - nx * (wT + k), pT.y - ny * (wT + k));
      ctx.closePath(); ctx.fill();
    };
    if (sm > 0.5) { quad(0.7, 'rgba(34,50,79,0.75)'); quad(0, '#FFF4DC'); }
    if (sm > 8) circle(ctx, pP.x, pP.y, Math.max(0.8, wP * 1.2), '#8E9AB2');
    // fletching: 3 vanes at 120°, rolling around the shaft axis
    const { a, b } = perpBasis(dir), VR = CFG.VANE_R, VL = CFG.VANE_L;
    const vanes = [];
    for (let i = 0; i < 3; i++) {
      const ang = roll + i * 2.0944, c = Math.cos(ang), sn = Math.sin(ang);
      const e = { x: a.x * c + b.x * sn, y: a.y * c + b.y * sn, z: a.z * c + b.z * sn };
      const a2 = ang + CFG.VANE_TWIST, c2 = Math.cos(a2), s2 = Math.sin(a2);
      const e2 = { x: a.x * c2 + b.x * s2, y: a.y * c2 + b.y * s2, z: a.z * c2 + b.z * s2 };
      const at = (along, out, ee) => project(tail.x + dir.x * along + ee.x * out, tail.y + dir.y * along + ee.y * out, tail.z + dir.z * along + ee.z * out);
      vanes.push({
        pts: [at(0.015, 0, e), at(0.0, VR, e), at(0.015 + VL * 0.85, VR * 0.45, e2), at(0.015 + VL, 0, e2)],
        depth: e.z, lit: e.y * 0.8 - e.x * 0.3, col: VANES[i],
      });
    }
    vanes.sort((u, v) => v.depth - u.depth);
    const lw = Math.max(0.5, 0.005 * pT.s);
    for (const v of vanes) {
      const [q1, q2, q3, q4] = v.pts;
      ctx.beginPath(); ctx.moveTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.lineTo(q3.x, q3.y); ctx.lineTo(q4.x, q4.y); ctx.closePath();
      ctx.fillStyle = v.col[0]; ctx.fill();
      if (v.lit < 0) { ctx.fillStyle = 'rgba(34,50,79,' + (0.32 * -v.lit).toFixed(3) + ')'; ctx.fill(); }
      else { ctx.fillStyle = 'rgba(255,255,255,' + (0.28 * v.lit).toFixed(3) + ')'; ctx.fill(); }
      ctx.strokeStyle = 'rgba(34,50,79,0.35)'; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke();
    }
    // nock (closest to camera)
    const nr = Math.max(1, 0.016 * pT.s);
    circle(ctx, pT.x, pT.y, nr + Math.max(0.5, nr * 0.3), 'rgba(34,50,79,0.8)');
    circle(ctx, pT.x, pT.y, nr, COL.yellow);
    if (nr > 2.5) circle(ctx, pT.x - nr * 0.3, pT.y - nr * 0.3, nr * 0.35, 'rgba(255,255,255,0.6)');
    ctx.restore();
  }
  /** Stuck arrow: nearly end-on, but guarantee a short shaft foreshortened toward the vanishing point. */
  function stuckArrowGeom(tip, dir) {
    const L = CFG.STUCK_VISIBLE;
    const tail = { x: tip.x - dir.x * L, y: tip.y - dir.y * L, z: tip.z - dir.z * L };
    const pP = project(tip.x, tip.y, tip.z), pQ = project(tail.x, tail.y, tail.z);
    let vx = pQ.x - pP.x, vy = pQ.y - pP.y;
    const m = Math.hypot(vx, vy), minL = CFG.STUCK_MIN_PX * pP.s;
    if (m < minL) {
      const ox = pP.x - CFG.W / 2 + vx * 2, oy = pP.y - CFG.HORIZON + vy * 2 + 0.3 * pP.s;
      const om = Math.hypot(ox, oy) || 1; vx = (ox / om) * minL; vy = (oy / om) * minL;
    }
    const q = unproject(pP.x + vx, pP.y + vy, tail.z);
    const d = { x: tip.x - q.x, y: tip.y - q.y, z: tip.z - tail.z };
    return { dir: norm3(d), len: Math.hypot(d.x, d.y, d.z) };
  }
  const quiver = (age) => (age < 1.2 ? Math.sin(age * 46) * Math.exp(-age * 5.5) : 0);

  function drawTarget(ctx, st) {
    const D = st.targetDist, R = CFG.TARGET_R, TY = CFG.TARGET_Y, BH = CFG.BOSS_HALF;
    const g = project(0, 0, D), c = project(0, TY, D), s = c.s;
    // shadow
    ctx.fillStyle = 'rgba(63,165,87,0.45)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 0.5, 1.7 * s, 0.22 * s + 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // rear leg
    const rl1 = project(0, TY + 0.6, D + 0.25), rl2 = project(0, 0, D + 1.3);
    ctx.lineCap = 'round'; ctx.strokeStyle = COL.woodD; ctx.lineWidth = Math.max(1.2, 0.13 * s);
    ctx.beginPath(); ctx.moveTo(rl1.x, rl1.y); ctx.lineTo(rl2.x, rl2.y); ctx.stroke();
    const w = st.wobble, ang = w.amp * Math.exp(-w.t * 5) * Math.sin(w.t * 24);
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(ang); ctx.translate(-g.x, -g.y);
    // front legs
    const lw = Math.max(1.4, 0.15 * s);
    for (const sd of [-1, 1]) {
      const a = project(sd * 0.72, TY + 0.4, D - 0.05), b = project(sd * 1.1, 0, D - 0.3);
      ctx.strokeStyle = COL.woodD; ctx.lineWidth = lw + 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y + 0.5); ctx.stroke();
      ctx.strokeStyle = COL.wood; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // straw boss (toy 3D)
    const bh = BH * s, bx = c.x - bh, by = c.y - bh;
    block3D(ctx, bx, by, bh * 2, bh * 2, bh * 0.22, COL.straw, COL.strawD, Math.max(1.5, 0.12 * s));
    ctx.strokeStyle = 'rgba(214,190,136,0.6)'; ctx.lineWidth = Math.max(0.6, 0.03 * s);
    ctx.beginPath();
    for (let i = 1; i < 8; i++) { const yy = by + (bh * 2 * i) / 8; ctx.moveTo(bx + bh * 0.08, yy); ctx.lineTo(bx + bh * 2 - bh * 0.08, yy); }
    ctx.stroke();
    // face
    const fr = R * s;
    circle(ctx, c.x, c.y + Math.max(1, 0.06 * s), fr * 1.02, '#C9D3DF');
    const rings = [[1.0, '#FFFFFF'], [0.8, COL.dark], [0.6, COL.blue], [0.4, COL.red], [0.2, COL.yellow]];
    for (const [k, col] of rings) circle(ctx, c.x, c.y, fr * k, col);
    if (fr > 12) {
      ctx.lineWidth = Math.max(0.5, fr * 0.008);
      for (let i = 1; i <= 10; i++) {
        const k = i / 10;
        ctx.strokeStyle = k > 0.8 ? '#C9D3DF' : k > 0.6 ? 'rgba(255,255,255,0.35)' : 'rgba(34,50,79,0.22)';
        ctx.beginPath(); ctx.arc(c.x, c.y, fr * k, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(34,50,79,0.35)';
      ctx.beginPath(); ctx.arc(c.x, c.y, fr * CFG.X_RING, 0, Math.PI * 2); ctx.stroke();
    }
    // gloss
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(c.x - fr * 0.35, c.y - fr * 0.45, fr * 0.42, fr * 0.2, -0.6, 0, Math.PI * 2); ctx.fill();
    // stuck arrows (travel with the target)
    for (const a of st.stuck) {
      const tip = { x: a.lx, y: a.ly + TY, z: D + 0.05 };
      const gm = stuckArrowGeom(tip, a.dir), q = quiver(st.t - a.t0);
      const hp = project(a.lx, a.ly + TY, D);
      ctx.fillStyle = 'rgba(34,50,79,0.45)';
      ctx.beginPath(); ctx.ellipse(hp.x, hp.y, Math.max(0.8, 0.03 * s), Math.max(0.6, 0.022 * s), 0, 0, Math.PI * 2); ctx.fill();
      drawArrow3D(ctx, tip, norm3({ x: gm.dir.x + q * 0.05, y: gm.dir.y + q * 0.03, z: gm.dir.z }), gm.len, a.roll + q * 0.3);
    }
    ctx.restore();
  }

  function drawWindsock(ctx, st) {
    const D = st.targetDist, sx = 2.7;
    const base = project(sx, 0, D + 0.4), top = project(sx, 3.2, D + 0.4), s = base.s;
    ctx.strokeStyle = '#E3E8EF'; ctx.lineWidth = Math.max(1, 0.07 * s); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
    circle(ctx, top.x, top.y, Math.max(1, 0.08 * s), COL.yellow);
    const w = st.windVis, str = clamp(Math.abs(w) / 4, 0, 1), dir = w >= 0 ? 1 : -1;
    const droop = lerp(1.25, 0.12, str); // radians below horizontal
    const segs = 4, segLen = 0.24 * s, r0 = 0.15 * s;
    ctx.save(); ctx.translate(top.x, top.y + 0.05 * s);
    for (let i = 0; i < segs; i++) {
      const a = droop + Math.sin(st.t * (5 + str * 6) + i * 0.8) * (0.05 + 0.08 * str);
      const x0 = Math.cos(a) * segLen * i * dir, y0 = Math.sin(a) * segLen * i;
      const x1 = Math.cos(a) * segLen * (i + 1) * dir, y1 = Math.sin(a) * segLen * (i + 1);
      const rA = r0 * (1 - i * 0.14), rB = r0 * (1 - (i + 1) * 0.14);
      const nx = -Math.sin(a) * dir, ny = Math.cos(a);
      ctx.fillStyle = i % 2 ? '#FFFFFF' : COL.orange;
      ctx.beginPath();
      ctx.moveTo(x0 + nx * rA * dir, y0 - ny * rA); ctx.lineTo(x1 + nx * rB * dir, y1 - ny * rB);
      ctx.lineTo(x1 - nx * rB * dir, y1 + ny * rB); ctx.lineTo(x0 - nx * rA * dir, y0 + ny * rA);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawGroundArrow(ctx, a, st) {
    const g = project(a.x, 0, a.z), s = g.s;
    if (g.x < st.view.x0 - 60 || g.x > st.view.x1 + 60) return;
    ctx.fillStyle = 'rgba(63,165,87,0.55)'; ctx.beginPath(); ctx.ellipse(g.x, g.y, 0.14 * s + 0.5, 0.035 * s + 0.4, 0, 0, 6.29); ctx.fill();
    const q = quiver(st.t - a.t0);
    drawArrow3D(ctx, { x: a.x, y: 0, z: a.z }, norm3({ x: a.dir.x + q * 0.05, y: a.dir.y, z: a.dir.z }), 0.62, a.roll + q * 0.3);
    // grass tuft hiding the entry point
    ctx.strokeStyle = COL.meadowD; ctx.lineCap = 'round'; ctx.lineWidth = clamp(0.03 * s, 0.7, 3);
    ctx.beginPath();
    for (const o of [-1, 0, 1]) { ctx.moveTo(g.x + o * 0.05 * s, g.y); ctx.lineTo(g.x + o * 0.09 * s, g.y - 0.1 * s); }
    ctx.stroke();
  }

  function drawFlyingArrow(ctx, st) {
    const sh = st.shot; if (!sh || st.phase !== 'flight') return;
    const p = shotPos(sh, st.u), dir = norm3(shotVel(sh, st.u)), L = CFG.ARROW_LEN;
    const roll = sh.roll0 + st.u * CFG.ROLL_RATE;
    // trail of the nock (motion streak)
    const pts = st.trail.map((q) => project(q.x, q.y, q.z));
    ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const k = i / pts.length;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * k).toFixed(3) + ')';
      ctx.lineWidth = clamp(0.035 * pts[i].s, 0.8, 9) * k;
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
    // motion-blur ghosts
    for (const [back, al] of [[4, 0.14], [2, 0.26]]) {
      const g = st.trail[st.trail.length - 1 - back];
      if (g) drawArrow3D(ctx, { x: g.x + dir.x * L, y: g.y + dir.y * L, z: g.z + dir.z * L }, dir, L, roll - back * 0.35, al);
    }
    drawArrow3D(ctx, p, dir, L, roll);
  }

  function drawWorld(ctx, st) {
    const cam = st.cam;
    const shx = Math.sin(st.t * 57) * cam.shake, shy = Math.cos(st.t * 43) * cam.shake;
    ctx.save();
    ctx.translate(cam.fx + shx, cam.fy + shy); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.fx, -cam.fy);
    drawSkyAndHills(ctx, st);
    drawGround(ctx, st);
    // depth-sorted objects (far → near)
    const items = [];
    const D = st.targetDist;
    for (const tr of st.deco.trees) items.push({ z: tr.z, f: () => drawTree(ctx, tr, st) });
    for (const tf of st.deco.tufts) items.push({ z: tf.z, f: () => drawTuft(ctx, tf, st) });
    for (const fl of st.deco.flowers) items.push({ z: fl.z, f: () => drawFlower(ctx, fl) });
    for (const ga of st.ground) items.push({ z: ga.z, f: () => drawGroundArrow(ctx, ga, st) });
    items.push({ z: D, f: () => drawTarget(ctx, st) });
    items.push({ z: D + 0.4, f: () => drawWindsock(ctx, st) });
    if (st.shot && st.phase === 'flight') {
      const pz = shotPos(st.shot, st.u).z;
      items.push({ z: pz > D ? pz : Math.min(pz, D - 0.01), f: () => drawFlyingArrow(ctx, st) });
    }
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.f();
    // particles
    for (const p of st.particles) {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = clamp(k * 1.4, 0, 1);
      if (p.kind === 'star') { ctx.fillStyle = p.c; starPath(ctx, p.x, p.y, p.size * (0.6 + k * 0.5), p.rot); ctx.fill(); }
      else if (p.kind === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.restore();
      } else circle(ctx, p.x, p.y, p.size * k + 0.3, p.c);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function camApply(st, x, y) {
    const c = st.cam; return { x: c.fx + (x - c.fx) * c.zoom, y: c.fy + (y - c.fy) * c.zoom };
  }

  // --- HUD / foreground
  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, clamp(t, 0, 1)));
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
  }
  /** Sight (crosshair). */
  function drawSight(ctx, st) {
    if (st.phase !== 'drawing') return;
    const dr = st.drawing, p = camApply(st, dr.sight.x, dr.sight.y), pw = dr.powerVis;
    const fat = dr.hold - CFG.FATIGUE_T, sweet = pw >= CFG.SWEET_FROM;
    const settled = dr.hold > 0.5 && fat < 0;
    const col = fat > 0.9 ? (Math.sin(st.t * 16) > 0 ? COL.red : COL.orange) : fat > 0 ? COL.orange : settled ? COL.green : COL.white;
    ctx.save(); ctx.globalAlpha = clamp(st.bowUp * 1.6, 0, 1);
    ctx.lineCap = 'round';
    // crosshair
    const r = 11;
    const ring = (w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.29); ctx.stroke(); };
    ring(4.6, 'rgba(34,50,79,0.55)'); ring(2.2, '#FFFFFF');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (const [w, c] of [[4, 'rgba(34,50,79,0.55)'], [1.8, '#FFFFFF']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(p.x + dx * (r - 4), p.y + dy * (r - 4)); ctx.lineTo(p.x + dx * (r + 4), p.y + dy * (r + 4)); ctx.stroke();
      }
    }
    circle(ctx, p.x, p.y, 3.3, 'rgba(34,50,79,0.6)'); circle(ctx, p.x, p.y, 2.3, col);
    // (sin anillo de tensión alrededor de la mira: la tensión se ve en el arco, la cuerda y la barra lateral)
    ctx.restore();
  }

  function drawBow(ctx, st) {
    const dr = st.drawing, drawing = st.phase === 'drawing';
    const p = drawing ? dr.powerVis : 0;                  // string snaps forward on release
    const up = st.bowUp, upE = easeOutCubic(clamp(up, 0, 1));
    const tc = project(0, CFG.TARGET_Y, st.targetDist);
    const aimDx = drawing ? dr.sight.x - tc.x : 0, aimDy = drawing ? dr.sight.y - tc.y : 0;
    const shake = drawing ? swayAmp(dr.hold) - CFG.SWAY_BASE : 0;
    const jolt = drawing && dr.sweetT < 0.3 ? Math.sin(dr.sweetT * 42) * 2.2 * Math.exp(-dr.sweetT * 12) : 0;
    const G = {
      x: 144 + aimDx * 0.3 * upE + Math.sin(st.t * 23) * shake * 0.08 + (1 - upE) * 10,
      y: 466 + aimDy * 0.12 + Math.sin(st.t * 1.6) * 1.5 + (1 - upE) * 46 - p * 8 + jolt,
    };
    const ang = -0.2 + aimDx * 0.0012 - (1 - upE) * 0.14;
    const u = { x: Math.sin(ang), y: -Math.cos(ang) }, n = { x: -u.y, y: u.x };
    const P = (a, b) => ({ x: G.x + u.x * a + n.x * b, y: G.y + u.y * a + n.y * b });
    const L = 172;
    const vib = st.bowRelease < 0.8 ? Math.sin(st.bowRelease * 70) * 6 * Math.exp(-st.bowRelease * 6) : 0;
    const tipT = P(L - 22 * p, 6 + 20 * p), tipB = P(-(L - 22 * p), 6 + 20 * p);
    const armed = drawing || st.phase === 'ready';
    const N = armed
      ? { x: G.x + 26 + 26 * p, y: G.y + 60 + 100 * p }     // nock pulled back toward the camera
      : { x: P(0, 8).x + vib, y: P(0, 8).y };

    // limbs (tapered, toy wood) — bend more as you draw
    const limb = (sign) => {
      const a0 = P(sign * 34, -2), c1 = P(sign * 100, -(34 + 30 * p)), t1 = sign > 0 ? tipT : tipB;
      const curl = P(sign * (L + 8 - 22 * p), -6 + 14 * p);
      const pts = [];
      for (let i = 0; i <= 18; i++) {
        const k = i / 18, a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
        pts.push({ x: a * a0.x + b * c1.x + c * t1.x, y: a * a0.y + b * c1.y + c * t1.y, w: lerp(13, 5, k) });
      }
      const left = [], right = [];
      for (let i = 0; i < pts.length; i++) {
        const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
        let tx = q.x - o.x, ty = q.y - o.y; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
        left.push({ x: pts[i].x - ty * pts[i].w / 2, y: pts[i].y + tx * pts[i].w / 2 });
        right.push({ x: pts[i].x + ty * pts[i].w / 2, y: pts[i].y - tx * pts[i].w / 2 });
      }
      const shape = (ox, oy) => {
        ctx.beginPath(); ctx.moveTo(left[0].x + ox, left[0].y + oy);
        for (const q of left) ctx.lineTo(q.x + ox, q.y + oy);
        for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x + ox, right[i].y + oy);
        ctx.closePath();
      };
      shape(2.5, 3.5); ctx.fillStyle = COL.woodDD; ctx.fill();
      shape(0, 0); ctx.fillStyle = COL.wood; ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,190,0.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pts[1].x - 2, pts[1].y); for (let i = 2; i < 15; i++) ctx.lineTo(pts[i].x - 2.2 * (1 - i / 18), pts[i].y); ctx.stroke();
      ctx.strokeStyle = COL.woodD; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.quadraticCurveTo(lerp(t1.x, curl.x, 0.3) + (sign > 0 ? -4 : 4) * n.x, lerp(t1.y, curl.y, 0.6), curl.x, curl.y); ctx.stroke();
      circle(ctx, t1.x, t1.y, 3.2, '#FFF4DC');
    };
    limb(1); limb(-1);
    // string (glows warm when in the sweet zone)
    const sweet = drawing && p >= CFG.SWEET_FROM;
    if (sweet) { ctx.strokeStyle = 'rgba(255,194,71,0.55)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tipT.x, tipT.y); ctx.lineTo(N.x, N.y); ctx.lineTo(tipB.x, tipB.y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.97)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tipT.x, tipT.y); ctx.lineTo(N.x, N.y); ctx.lineTo(tipB.x, tipB.y); ctx.stroke();
    // riser + purple grip
    const r1 = P(44, 0), r2 = P(-44, 0);
    const riser = (ox, oy, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r1.x + ox, r1.y + oy); ctx.lineTo(r2.x + ox, r2.y + oy); ctx.stroke(); };
    riser(2.5, 4, 19, '#5A3620'); riser(0, 0, 19, COL.woodDD); riser(-3, -1, 6, 'rgba(255,220,180,0.25)');
    const g1 = P(15, 0), g2 = P(-17, 0);
    ctx.strokeStyle = COL.purpleD; ctx.lineWidth = 21; ctx.beginPath(); ctx.moveTo(g1.x + 1.5, g1.y + 3); ctx.lineTo(g2.x + 1.5, g2.y + 3); ctx.stroke();
    ctx.strokeStyle = COL.purple; ctx.lineWidth = 21; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(g1.x, g1.y); ctx.lineTo(g2.x, g2.y); ctx.stroke();
    ctx.strokeStyle = COL.purpleL; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const q = P(12 - i * 7, -9), q2 = P(8 - i * 7, 9); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q2.x, q2.y); ctx.stroke(); }
    ctx.lineCap = 'round';
    // nocked arrow: slides back along the rest as you draw
    if (armed) {
      const inK = easeOutCubic(st.arrowIn);
      const rest = P(20, 11);
      const nk = { x: N.x, y: N.y + (1 - inK) * 120 };
      let dx = rest.x - nk.x, dy = rest.y - nk.y; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      const len = m + 50 - 32 * p;
      const head = { x: nk.x + dx * len, y: nk.y + dy * len };
      const nx = -dy, ny = dx, w0 = 4.2 + 3.2 * p, w1 = 2.2;
      ctx.fillStyle = COL.ink;
      ctx.beginPath(); ctx.moveTo(nk.x + nx * (w0 + 1), nk.y + ny * (w0 + 1)); ctx.lineTo(head.x + nx * (w1 + 1), head.y + ny * (w1 + 1));
      ctx.lineTo(head.x - nx * (w1 + 1), head.y - ny * (w1 + 1)); ctx.lineTo(nk.x - nx * (w0 + 1), nk.y - ny * (w0 + 1)); ctx.fill();
      ctx.fillStyle = '#FFF4DC';
      ctx.beginPath(); ctx.moveTo(nk.x + nx * w0, nk.y + ny * w0); ctx.lineTo(head.x + nx * w1, head.y + ny * w1);
      ctx.lineTo(head.x - nx * w1, head.y - ny * w1); ctx.lineTo(nk.x - nx * w0, nk.y - ny * w0); ctx.fill();
      ctx.fillStyle = '#8E9AB2';
      ctx.beginPath(); ctx.moveTo(head.x + dx * 14, head.y + dy * 14); ctx.lineTo(head.x + nx * 6, head.y + ny * 6); ctx.lineTo(head.x - nx * 6, head.y - ny * 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#B9C3D6';
      ctx.beginPath(); ctx.moveTo(head.x + dx * 14, head.y + dy * 14); ctx.lineTo(head.x + nx * 6, head.y + ny * 6); ctx.lineTo(head.x, head.y); ctx.closePath(); ctx.fill();
      const fw = 13 + 8 * p, fl = 30 + 12 * p;
      for (const [side, c, cd] of [[1, COL.purple, COL.purpleD], [-1, COL.orange, '#E07A20']]) {
        const b0 = { x: nk.x + dx * 6, y: nk.y + dy * 6 }, b1 = { x: nk.x + dx * fl, y: nk.y + dy * fl };
        ctx.fillStyle = cd;
        ctx.beginPath(); ctx.moveTo(b1.x, b1.y + 2); ctx.lineTo(b0.x + nx * fw * side, b0.y + ny * fw * side + 2); ctx.lineTo(b0.x, b0.y + 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b0.x + nx * fw * side, b0.y + ny * fw * side); ctx.lineTo(b0.x, b0.y); ctx.closePath(); ctx.fill();
      }
      circle(ctx, nk.x, nk.y, 3.5 + p, COL.ink);
    }
    const ar = P(20, 11); circle(ctx, ar.x, ar.y, 3, '#5A3620');
  }

  function drawPowerMeter(ctx, st) {
    if (st.phase !== 'drawing' && st.drawing.powerVis < 0.02) return;
    const p = st.drawing.powerVis, a = clamp(st.bowUp * 1.6, 0, 1) * (st.phase === 'drawing' ? 1 : clamp(1 - st.phaseT * 3, 0, 1));
    if (a <= 0.01) return;
    const x = CFG.W - 30, y = 292, w = 16, h = 150, sweet = p >= CFG.SWEET_FROM;
    ctx.save(); ctx.globalAlpha = a;
    block3D(ctx, x, y, w, h, 8, 'rgba(255,255,255,0.92)', 'rgba(34,50,79,0.18)', 4);
    const sy = y + 3 + (h - 6) * (1 - 1), sh = (h - 6) * (1 - CFG.SWEET_FROM);
    fillRR(ctx, x + 3, sy, w - 6, sh, 5, 'rgba(255,194,71,0.35)');
    const fh = (h - 6) * p;
    if (fh > 1) fillRR(ctx, x + 3, y + h - 3 - fh, w - 6, fh, 5, sweet ? COL.yellow : mixHex('#B8F0BD', COL.green, p / CFG.SWEET_FROM));
    const ty = y + 3 + sh;
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 3, ty); ctx.lineTo(x + w + 3, ty); ctx.stroke();
    ctx.font = font(600, 10, FONT_B); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    outlinedText(ctx, TQT('Tensión'), x + w / 2, y + h + 8, COL.muted, '#FFFFFF', 3);
    ctx.restore();
  }

  function drawTinySpectator(ctx, st) {
    const tn = st.tiny;
    let y = 486, squash = 0;
    const jt = tn.jumpT;
    if (tn.mood === 'wow' && jt < 0.9) y -= Math.abs(Math.sin((jt / 0.45) * Math.PI)) * 12;
    else if (tn.mood === 'happy' && jt < 0.5) y -= Math.sin((jt / 0.5) * Math.PI) * 9;
    else if (tn.mood === 'sad') { squash = jt < 0.4 ? Math.sin((jt / 0.4) * Math.PI) : 0; y += 2; }
    y += Math.sin(st.t * 2.2) * 1.2;
    ctx.fillStyle = 'rgba(63,165,87,0.45)';
    ctx.beginPath(); ctx.ellipse(46, 514, 26 - (486 - y) * 0.4, 5, 0, 0, 6.29); ctx.fill();
    drawTiny(ctx, 46, y, 62, tn.mood, st.t, { look: 2, squash });
    if (tn.bubbleT > 0 && tn.bubble) {
      const a = clamp(tn.bubbleT * 4, 0, 1), k = easeOutBack(clamp((2.2 - tn.bubbleT) * 5, 0, 1));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(58, 432); ctx.scale(k, k);
      ctx.font = font(600, 12, FONT_B); const tw = ctx.measureText(tn.bubble).width + 20;
      block3D(ctx, -tw / 2 + 4, -14, tw, 26, 13, '#FFFFFF', COL.cloudShadow, 3);
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-2, 10); ctx.lineTo(-12, 20); ctx.fill();
      ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tn.bubble, 4, -1);
      ctx.restore();
    }
  }

  function hudPill(ctx, x, y, w, h) { block3D(ctx, x, y, w, h, h / 2, 'rgba(255,255,255,0.96)', 'rgba(34,50,79,0.16)', 4); }

  function drawHUD(ctx, st) {
    const W = CFG.W;
    ctx.textBaseline = 'middle';
    // arrow counter
    hudPill(ctx, 14, 14, 98, 34);
    ctx.font = font(600, 12, FONT_B); ctx.fillStyle = COL.muted; ctx.textAlign = 'left'; ctx.fillText(TQT('Flecha'), 28, 31.5);
    ctx.font = font(700, 18, FONT_D); ctx.fillStyle = COL.ink;
    ctx.fillText(Math.min(st.arrowIdx + 1, CFG.ARROWS) + '/' + CFG.ARROWS, 72, 31);
    // distance
    const dTxt = Math.round(st.phase === 'move' ? st.targetDist : CFG.DISTANCES[Math.min(st.arrowIdx, CFG.ARROWS - 1)]) + ' m';
    hudPill(ctx, W / 2 - 38, 14, 76, 34);
    const ix = W / 2 - 18, iy = 31;
    circle(ctx, ix, iy, 8, '#FFFFFF'); circle(ctx, ix, iy, 6.5, COL.blue); circle(ctx, ix, iy, 4.5, COL.red); circle(ctx, ix, iy, 2.3, COL.yellow);
    ctx.font = font(700, 17, FONT_D); ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.fillText(dTxt, W / 2 - 6, 31);
    // score
    hudPill(ctx, W - 112, 14, 98, 34);
    ctx.fillStyle = COL.yellow; starPath(ctx, W - 94, 31, 9, 0); ctx.fill();
    ctx.font = font(700, 19, FONT_D); ctx.fillStyle = COL.ink; ctx.textAlign = 'right'; ctx.fillText(String(st.total), W - 48, 31);
    ctx.font = font(600, 11, FONT_B); ctx.fillStyle = COL.muted; ctx.textAlign = 'left'; ctx.fillText('pts', W - 45, 32.5);
    // chips
    for (let i = 0; i < CFG.ARROWS; i++) {
      const cx = 27 + i * 26, cy = 70, r = st.results[i];
      if (r) {
        const c = scoreColor(r.score);
        circle(ctx, cx, cy + 2.5, 11, 'rgba(34,50,79,0.2)'); circle(ctx, cx, cy, 11, '#FFFFFF'); circle(ctx, cx, cy, 9, c.bg);
        ctx.font = font(700, r.score >= 10 ? 10 : 12, FONT_D); ctx.fillStyle = c.fg; ctx.textAlign = 'center';
        ctx.fillText(r.kind === 'x' ? 'X' : String(r.score), cx, cy + 0.5);
      } else {
        const cur = i === st.arrowIdx && st.phase !== 'end';
        circle(ctx, cx, cy + 2, 10, 'rgba(34,50,79,0.10)'); circle(ctx, cx, cy, 10, cur ? '#FFFFFF' : 'rgba(255,255,255,0.8)');
        if (cur) { ctx.strokeStyle = COL.purple; ctx.lineWidth = 2.2 + Math.sin(st.t * 5) * 0.6; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 6.29); ctx.stroke(); }
      }
    }
    // wind
    const wx = W - 134, wy = 58, ww = 120, wh = 26;
    hudPill(ctx, wx, wy, ww, wh);
    const w = st.wind, dir = w >= 0 ? 1 : -1, str = Math.abs(w) / 4;
    const ax = wx + 26, ay = wy + wh / 2;
    ctx.strokeStyle = COL.blue; ctx.lineCap = 'round'; ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      const ph = ((st.t * (0.8 + str * 1.6) + i / 3) % 1);
      const x0 = ax + dir * (ph * 22 - 11), yy = ay - 5 + i * 5;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.beginPath(); ctx.moveTo(x0 - dir * 6, yy); ctx.lineTo(x0 + dir * 2, yy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = COL.purple; ctx.beginPath();
    const hx = ax + dir * 16;
    ctx.moveTo(hx + dir * 5, ay); ctx.lineTo(hx - dir * 3, ay - 5); ctx.lineTo(hx - dir * 3, ay + 5); ctx.closePath(); ctx.fill();
    ctx.font = font(700, 14, FONT_D); ctx.fillStyle = COL.ink; ctx.textAlign = 'left';
    ctx.fillText(fmtWind(w), wx + 50, ay);
    const nw = ctx.measureText(fmtWind(w)).width;
    ctx.font = font(600, 10, FONT_B); ctx.fillStyle = COL.muted; ctx.fillText('km/h', wx + 53 + nw, ay + 1);
  }

  function drawPopups(ctx, st) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of st.popups) {
      const s = camApply(st, p.x, p.y);
      if (p.ring) {
        const k = p.t / 0.6;
        ctx.strokeStyle = 'rgba(255,194,71,' + (1 - k).toFixed(3) + ')'; ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(s.x, s.y, 8 + k * 60, 0, 6.29); ctx.stroke();
        continue;
      }
      const inK = easeOutBack(clamp(p.t / 0.35, 0, 1)), out = clamp((1.7 - p.t) / 0.35, 0, 1);
      const y = clamp(s.y - 22 - easeOutCubic(clamp(p.t / 1.7, 0, 1)) * 26, 110, 380);
      const x = clamp(s.x, 80, CFG.W - 80);
      ctx.save(); ctx.globalAlpha = out; ctx.translate(x, y); ctx.scale(inK, inK);
      ctx.font = font(700, p.big ? 34 : 30, FONT_D);
      ctx.fillStyle = 'rgba(34,50,79,0.18)'; ctx.fillText(p.text, 0, 3);
      outlinedText(ctx, p.text, 0, 0, p.color, '#FFFFFF', 7);
      if (p.sub) {
        ctx.font = font(900, p.big ? 20 : 13, p.big ? FONT_D : FONT_B);
        outlinedText(ctx, p.sub, 0, p.big ? 28 : 24, p.big ? COL.ink : COL.muted, '#FFFFFF', 5);
      }
      ctx.restore();
    }
  }

  function drawBanners(ctx, st) {
    const b = st.banners.find((x) => x.t >= 0);
    if (!b) return;
    const inK = easeOutBack(clamp(b.t / 0.35, 0, 1)), out = clamp((b.dur - b.t) / 0.3, 0, 1);
    ctx.save(); ctx.globalAlpha = out; ctx.translate(CFG.W / 2, 128); ctx.scale(inK, inK);
    ctx.font = font(700, 20, FONT_D); const w1 = ctx.measureText(b.text).width;
    ctx.font = font(600, 12, FONT_B); const w2 = ctx.measureText(b.sub || '').width;
    const w = Math.max(w1, w2) + 40, h = b.sub ? 54 : 38;
    const gold = false;
    block3D(ctx, -w / 2, -h / 2, w, h, 18, gold ? '#FFF6DA' : '#FFFFFF', gold ? '#F0C765' : COL.cloudShadow, 5);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font(700, 20, FONT_D); ctx.fillStyle = gold ? '#D98A1C' : COL.ink; ctx.fillText(b.text, 0, b.sub ? -9 : 0);
    if (b.sub) { ctx.font = font(600, 12, FONT_B); ctx.fillStyle = COL.muted; ctx.fillText(b.sub, 0, 13); }
    ctx.restore();
  }

  function drawFinger(ctx, x, y, pressed) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.18);
    const shapes = () => { ctx.beginPath(); rrPath(ctx, -8, -4, 16, 40, 8); rrPath(ctx, -15, 22, 34, 34, 13); rrPath(ctx, -24, 26, 13, 22, 6.5); };
    shapes(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
    shapes(); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    fillRR(ctx, -4.5, -0.5, 9, 8, 3.5, '#FFE3EE');
    ctx.restore();
    if (pressed > 0) {
      ctx.strokeStyle = 'rgba(122,90,248,' + (0.7 * (1 - pressed)).toFixed(3) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x - 1, y - 4, 10 + pressed * 16, 0, 6.29); ctx.stroke();
    }
  }
  /** One-time tutorial on the first arrow: step 1 = drag down, step 2 = aim & release. */
  function drawHint(ctx, st) {
    if (st.hintSeen || st.arrowIdx !== 0) return;
    let step, a = 1;
    if (st.phase === 'ready') { if (st.phaseT < 0.4 || st.banners.length) return; a = clamp((st.phaseT - 0.4) * 3, 0, 1); step = 1; }
    else if (st.phase === 'drawing') step = st.drawing.power >= CFG.SWEET_FROM ? 2 : 1;
    else return;
    const W = CFG.W;
    ctx.save(); ctx.globalAlpha = a;
    if (st.phase === 'ready') { fillView(ctx, st, 'rgba(34,50,79,0.16)'); }
    const t1 = step === 1 ? TQT('Arrastra hacia abajo para tensar') : TQT('Mueve para apuntar y suelta');
    const t2 = step === 1 ? (st.phase === 'drawing' ? TQT('Un poco más… hasta la zona amarilla') : TQT('Cuanto más tiras, más fuerza')) : TQT('Tira aún más para subir la mira');
    ctx.font = font(700, 15, FONT_D); const w1 = ctx.measureText(t1).width;
    ctx.font = font(600, 11, FONT_B); const w2 = ctx.measureText(t2).width;
    const w = Math.max(w1, w2) + 58, cy = st.phase === 'ready' ? 300 : 92;
    block3D(ctx, W / 2 - w / 2, cy, w, 48, 18, '#FFFFFF', COL.cloudShadow, 5);
    circle(ctx, W / 2 - w / 2 + 22, cy + 24, 11, COL.purple);
    ctx.font = font(700, 13, FONT_D); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(step), W / 2 - w / 2 + 22, cy + 25);
    ctx.textAlign = 'left';
    ctx.font = font(700, 15, FONT_D); ctx.fillStyle = COL.ink; ctx.fillText(t1, W / 2 - w / 2 + 40, cy + 17);
    ctx.font = font(600, 11, FONT_B); ctx.fillStyle = COL.muted; ctx.fillText(t2, W / 2 - w / 2 + 40, cy + 34);
    if (st.phase === 'ready') {
      // animated finger: press → drag down → hold → fade
      const c = (st.phaseT * 0.6) % 1;
      const press = c < 0.15 ? c / 0.15 : 0;
      const k = easeInOutCubic(clamp((c - 0.15) / 0.5, 0, 1));
      const x = 236, y0 = 372, y = y0 + k * 88;
      const fa = c > 0.88 ? (1 - c) / 0.12 : 1;
      ctx.globalAlpha = a * fa;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4; ctx.setLineDash([2, 8]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y0 - 4); ctx.lineTo(x, y - 4); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        const cy2 = y0 + 18 + i * 20, al = clamp(k * 3 - i, 0, 1);
        ctx.strokeStyle = 'rgba(122,90,248,' + (0.85 * al).toFixed(3) + ')'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(x - 30, cy2 - 5); ctx.lineTo(x - 24, cy2 + 1); ctx.lineTo(x - 18, cy2 - 5); ctx.stroke();
      }
      drawFinger(ctx, x, y, press > 0 ? press : 0);
    } else {
      // around the finger: aim arrows (step 2) or down chevrons (step 1)
      const fp = { x: st.pointer.fx, y: st.pointer.fy };
      ctx.strokeStyle = 'rgba(122,90,248,0.9)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const bob = Math.sin(st.t * 6) * 3;
      if (step === 2) {
        for (const sd of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(fp.x + sd * (26 + bob), fp.y - 7); ctx.lineTo(fp.x + sd * (33 + bob), fp.y); ctx.lineTo(fp.x + sd * (26 + bob), fp.y + 7); ctx.stroke();
        }
      } else {
        ctx.beginPath(); ctx.moveTo(fp.x - 7, fp.y + 26 + bob); ctx.lineTo(fp.x, fp.y + 33 + bob); ctx.lineTo(fp.x + 7, fp.y + 26 + bob); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function fillView(ctx, st, color) {
    const v = st.view; ctx.fillStyle = color; ctx.fillRect(v.x0 - 2, v.y0 - 2, v.x1 - v.x0 + 4, v.y1 - v.y0 + 4);
  }

  function drawCancelNote(ctx, st) {
    if (st.cancelT > 1.1) return;
    const a = clamp((1.1 - st.cancelT) * 3, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.font = font(600, 13, FONT_B); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    outlinedText(ctx, TQT('Tensa más para disparar'), CFG.W / 2 + 30, 380 - st.cancelT * 12, COL.ink, '#FFFFFF', 5);
    ctx.restore();
  }

  function drawVignette(ctx, st) {
    const p = st.phase === 'drawing' ? st.drawing.powerVis : st.phase === 'flight' ? 0.7 : 0;
    if (p <= 0.01) return;
    const g = ctx.createRadialGradient(CFG.W / 2, 240, 120, CFG.W / 2, 260, 380);
    g.addColorStop(0, 'rgba(34,50,79,0)'); g.addColorStop(1, 'rgba(34,50,79,' + (0.22 * p).toFixed(3) + ')');
    ctx.fillStyle = g; const v = st.view; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  }

  // --- buttons & cards
  function purpleButton(ctx, r, label, pressed) {
    const d = 6, off = pressed ? 4 : 0;
    fillRR(ctx, r.x, r.y + d, r.w, r.h, r.h / 2, COL.purpleD);
    const g = ctx.createLinearGradient(0, r.y + off, 0, r.y + off + r.h);
    g.addColorStop(0, COL.purpleL); g.addColorStop(1, COL.purple);
    fillRR(ctx, r.x, r.y + off, r.w, r.h, r.h / 2, g);
    fillRR(ctx, r.x + 14, r.y + off + 6, r.w - 28, r.h * 0.28, r.h * 0.14, 'rgba(255,255,255,0.18)');
    ctx.font = font(700, 22, FONT_D); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, r.x + r.w / 2, r.y + off + r.h / 2 + 1);
  }
  const START_BTN = { x: 65, y: 352, w: 200, h: 56 };
  const END_BTN = { x: 65, y: 424, w: 200, h: 56 };
  const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y - 4 && y <= r.y + r.h + 8;

  function card(ctx, x, y, w, h) {
    fillRR(ctx, x, y + 7, w, h, 28, 'rgba(34,50,79,0.16)');
    fillRR(ctx, x, y, w, h, 28, '#FFFFFF');
  }

  function drawStart(ctx, st) {
    const W = CFG.W, k = easeOutBack(clamp(st.phaseT / 0.5, 0, 1));
    fillView(ctx, st, 'rgba(230,247,255,0.35)');
    ctx.save(); ctx.translate(W / 2, 290); ctx.scale(k, k); ctx.translate(-W / 2, -290);
    card(ctx, 24, 132, W - 48, 300);
    drawTiny(ctx, W / 2, 126 + Math.sin(st.t * 2) * 2, 86, 'happy', st.t, { look: 0 });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font(700, 30, FONT_D); ctx.fillStyle = COL.ink; ctx.fillText(TQT('Tiro con arco'), W / 2, 202);
    ctx.font = font(600, 14, FONT_B); ctx.fillStyle = COL.muted;
    const lines = wrapText(ctx, TQT('5 flechas. Tira hacia atrás para tensar, apunta y suelta. ¡Ojo con el viento!'), W - 100);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 236 + i * 20));
    // mini legend
    const ly = 236 + lines.length * 20 + 16;
    ctx.font = font(600, 11, FONT_B);
    const items = [[TQT('Diana'), COL.yellow], [TQT('Viento'), COL.blue], [TQT('5 distancias'), COL.purple]];
    let lx = W / 2 - 118;
    for (const [t, c] of items) {
      const tw = ctx.measureText(t).width + 28;
      fillRR(ctx, lx, ly - 11, tw, 22, 11, '#F1F5FA');
      circle(ctx, lx + 11, ly, 5, c);
      ctx.fillStyle = COL.muted; ctx.textAlign = 'left'; ctx.fillText(t, lx + 20, ly + 0.5);
      lx += tw + 6;
    }
    ctx.textAlign = 'center';
    if (st.best > 0) { ctx.font = font(600, 12, FONT_B); ctx.fillStyle = COL.muted; ctx.fillText(TQT('Récord: ') + st.best + ' pts', W / 2, 336); }
    purpleButton(ctx, START_BTN, TQT('Jugar'), st.pressedBtn === 'start');
    ctx.restore();
  }

  function drawEnd(ctx, st) {
    const W = CFG.W, t = st.endT;
    fillView(ctx, st, 'rgba(34,50,79,' + (0.32 * clamp(t * 3, 0, 1)).toFixed(3) + ')');
    const k = easeOutBack(clamp(t / 0.5, 0, 1));
    ctx.save(); ctx.translate(W / 2, 300); ctx.scale(k, k); ctx.translate(-W / 2, -300);
    card(ctx, 20, 104, W - 40, 400);
    const stars = starsFor(st.total);
    drawTiny(ctx, W / 2, 98 + Math.sin(st.t * 2.4) * 2, 84, stars >= 2 ? 'wow' : stars === 1 ? 'happy' : 'sad', st.t, {});
    const titles = [TQT('¡Sigue practicando!'), TQT('¡Bien hecho!'), TQT('¡Muy bien!'), TQT('¡Increíble!')];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font(700, 26, FONT_D); ctx.fillStyle = COL.ink; ctx.fillText(titles[stars], W / 2, 168);
    for (let i = 0; i < 3; i++) {
      const sx = W / 2 + (i - 1) * 52, sy = 212 - (i === 1 ? 6 : 0);
      const on = i < stars, pk = easeOutBack(clamp((t - 0.45 - i * 0.18) / 0.35, 0, 1));
      const sz = (i === 1 ? 23 : 19) * (on ? pk : 1);
      ctx.fillStyle = on ? '#E0A21F' : '#D5DCE6'; starPath(ctx, sx, sy + 3, sz, 0); ctx.fill();
      ctx.fillStyle = on ? COL.yellow : '#E9EEF4'; starPath(ctx, sx, sy, sz, 0); ctx.fill();
      if (on) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; starPath(ctx, sx - sz * 0.2, sy - sz * 0.25, sz * 0.25, 0); ctx.fill(); }
    }
    const shown = Math.round(st.total * easeOutCubic(clamp((t - 0.3) / 0.8, 0, 1)));
    ctx.font = font(700, 58, FONT_D); ctx.fillStyle = COL.purple; ctx.fillText(String(shown), W / 2, 272);
    ctx.font = font(600, 13, FONT_B); ctx.fillStyle = COL.muted; ctx.fillText(TQT('puntos de ') + CFG.ARROWS * 10, W / 2, 306);
    if (st.newBest && t > 1.1) {
      const bk = easeOutBack(clamp((t - 1.1) / 0.35, 0, 1));
      ctx.save(); ctx.translate(W / 2, 334); ctx.scale(bk, bk);
      block3D(ctx, -68, -13, 136, 26, 13, COL.yellow, '#E0A21F', 3);
      ctx.font = font(600, 13, FONT_B); ctx.fillStyle = COL.ink; ctx.fillText(TQT('¡Nuevo récord!'), 0, 0.5);
      ctx.restore();
    } else if (!st.newBest) {
      ctx.font = font(600, 13, FONT_B); ctx.fillStyle = COL.muted; ctx.fillText(TQT('Récord: ') + st.best + ' pts', W / 2, 334);
    }
    for (let i = 0; i < CFG.ARROWS; i++) {
      const r = st.results[i] || { score: 0, kind: 'miss', dist: CFG.DISTANCES[i] };
      const cx = W / 2 + (i - 2) * 52, cy = 372, c = scoreColor(r.score);
      circle(ctx, cx, cy + 3, 17, 'rgba(34,50,79,0.16)'); circle(ctx, cx, cy, 17, '#F1F5FA'); circle(ctx, cx, cy, 14, c.bg);
      ctx.font = font(700, 15, FONT_D); ctx.fillStyle = c.fg; ctx.fillText(r.kind === 'x' ? 'X' : String(r.score), cx, cy + 1);
      ctx.font = font(600, 10, FONT_B); ctx.fillStyle = COL.muted; ctx.fillText(r.dist + ' m', cx, cy + 28);
    }
    purpleButton(ctx, END_BTN, TQT('Otra vez'), st.pressedBtn === 'again');
    ctx.restore();
  }

  function render(ctx, st) {
    drawWorld(ctx, st);
    drawVignette(ctx, st);
    if (st.phase === 'start') { drawTinySpectator(ctx, st); drawStart(ctx, st); return; }
    drawPopups(ctx, st);
    drawSight(ctx, st);
    drawBow(ctx, st);
    drawTinySpectator(ctx, st);
    drawPowerMeter(ctx, st);
    drawHUD(ctx, st);
    drawBanners(ctx, st);
    drawHint(ctx, st);
    drawCancelNote(ctx, st);
    if (st.phase === 'end') drawEnd(ctx, st);
  }

  /* ========================= 6. INPUT ========================= */
  function onDown(st, x, y) {
    switch (st.phase) {
      case 'start': if (inRect(START_BTN, x, y)) st.pressedBtn = 'start'; return true;
      case 'end': if (st.endT > 0.5 && inRect(END_BTN, x, y)) st.pressedBtn = 'again'; return true;
      case 'ready':
        st.pointer.sx = x; st.pointer.sy = y; st.pointer.x = x; st.pointer.y = y; st.pointer.fx = x; st.pointer.fy = y;
        st.drawing.hold = 0; st.drawing.power = 0; st.drawing.powerVis = 0; st.drawing.inSweet = false; st.drawing.sweetT = 99;
        { const tc = project(0, CFG.TARGET_Y, st.targetDist); st.drawing.sight = sightFromDrag(0, 0, tc); }
        st.tiny.bubbleT = 0; st.tiny.bubble = '';
        setPhase(st, 'drawing'); return true;
      case 'impact': if (st.phaseT > 0.5) nextArrow(st); return false;
      default: return false;
    }
  }
  function onMove(st, x, y) { st.pointer.x = x; st.pointer.y = y; }
  function onUp(st, x, y) {
    if (st.phase === 'start' && st.pressedBtn === 'start') { st.pressedBtn = null; if (inRect(START_BTN, x, y)) newGame(st); return; }
    if (st.phase === 'end' && st.pressedBtn === 'again') { st.pressedBtn = null; if (inRect(END_BTN, x, y)) newGame(st); return; }
    st.pressedBtn = null;
    if (st.phase === 'drawing') {
      st.pointer.x = x; st.pointer.y = y;
      if (st.drawing.power < CFG.MIN_POWER) { setPhase(st, 'ready'); st.arrowIn = 1; st.cancelT = 0; return; }
      fire(st);
    }
  }

  /* ========================= 7. MOUNT ========================= */
  let inst = null;

  function mount(containerEl) {
    if (inst) unmount();
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block'; canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none'; canvas.style.webkitUserSelect = 'none'; canvas.style.webkitTapHighlightColor = 'transparent';
    canvas.setAttribute('aria-label', TQT('Minijuego: Tiro con arco'));
    // Fill mode: container already has a height (e.g. full-screen) → canvas covers it,
    // the 330×525 field is fit-contained and the extra area is painted with sky/meadow.
    // Width mode: container height is auto → canvas height = width · 525/330.
    const fillMode = containerEl.clientHeight > 0;
    const prevPos = containerEl.style.position;
    if (fillMode) {
      if (global.getComputedStyle(containerEl).position === 'static') containerEl.style.position = 'relative';
      canvas.style.position = 'absolute'; canvas.style.left = '0'; canvas.style.top = '0';
    }
    containerEl.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const st = createState();
    st.deco = makeDeco(20240917);
    let raf = 0, last = 0, cssW = 0, cssH = 0, dpr = 1, activeId = null, scale = 1, offX = 0, offY = 0;

    function resize() {
      const cw = containerEl.clientWidth || CFG.W;
      const ch = fillMode ? containerEl.clientHeight || (cw * CFG.H) / CFG.W : (cw * CFG.H) / CFG.W;
      dpr = Math.min(global.devicePixelRatio || 1, 3);
      if (cw === cssW && ch === cssH && canvas.width === Math.round(cw * dpr)) return;
      cssW = cw; cssH = ch;
      canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      scale = Math.min(cw / CFG.W, ch / CFG.H);
      offX = (cw - CFG.W * scale) / 2; offY = (ch - CFG.H * scale) / 2;
      st.view = { x0: -offX / scale, y0: -offY / scale, x1: CFG.W + offX / scale, y1: CFG.H + offY / scale };
    }
    function toLogical(e) {
      const r = canvas.getBoundingClientRect(), k = r.width / cssW || 1;
      return { x: ((e.clientX - r.left) / k - offX) / scale, y: ((e.clientY - r.top) / k - offY) / scale };
    }
    const pd = (e) => {
      if (activeId !== null) return;
      const p = toLogical(e);
      if (onDown(st, p.x, p.y)) { activeId = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      e.preventDefault();
    };
    const pm = (e) => { if (e.pointerId !== activeId) return; const p = toLogical(e); onMove(st, p.x, p.y); e.preventDefault(); };
    const pu = (e) => {
      if (e.pointerId !== activeId) return;
      activeId = null; const p = toLogical(e); onUp(st, p.x, p.y);
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    };
    const pc = (e) => {
      if (e.pointerId !== activeId) return;
      activeId = null; st.pressedBtn = null;
      if (st.phase === 'drawing') { setPhase(st, 'ready'); st.arrowIn = 1; }
    };
    const ctxMenu = (e) => e.preventDefault();
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', pm);
    canvas.addEventListener('pointerup', pu);
    canvas.addEventListener('pointercancel', pc);
    canvas.addEventListener('contextmenu', ctxMenu);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(resize); ro.observe(containerEl); }
    global.addEventListener('resize', resize);
    resize();

    function frame(ts) {
      const dt = (last ? clamp((ts - last) / 1000, 0, 0.05) : 0.016) * (st.timeScale || 1); // timeScale: test/debug hook
      last = ts;
      update(st, dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sc = scale * dpr;
      ctx.setTransform(sc, 0, 0, sc, offX * dpr, offY * dpr);
      render(ctx, st);
      raf = global.requestAnimationFrame(frame);
    }
    raf = global.requestAnimationFrame(frame);

    inst = {
      canvas, st,
      destroy() {
        global.cancelAnimationFrame(raf);
        canvas.removeEventListener('pointerdown', pd);
        canvas.removeEventListener('pointermove', pm);
        canvas.removeEventListener('pointerup', pu);
        canvas.removeEventListener('pointercancel', pc);
        canvas.removeEventListener('contextmenu', ctxMenu);
        global.removeEventListener('resize', resize);
        if (ro) ro.disconnect();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        if (fillMode) containerEl.style.position = prevPos;
      },
    };
    return inst;
  }
  function unmount() { if (inst) { inst.destroy(); inst = null; } }

  global.TQArco = {
    mount, unmount,
    again() { if (inst) newGame(inst.st); },
    // Exposed for tests / porting reference (pure functions + constants).
    _pure: { CFG, project, unproject, planShot, shotPos, groundTime, classifyPlaneHit, swayOffset, swayAmp, sightFromDrag, powerFromDrag, rollWind, starsFor },
    _debug: () => (inst ? inst.st : null),
  };
})(typeof window !== 'undefined' ? window : globalThis);
