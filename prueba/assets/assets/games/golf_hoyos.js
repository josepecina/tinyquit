/* =====================================================================
 * TinyQuit · Minigolf v7 — banco de hoyos. Campo 330 × 525 (la franja de arriba, y < 50, es para el marcador).
 * Cada hoyo tiene UN reto propio (su «firma») y un ambiente. Ideas de los obstáculos clásicos del minigolf
 * (molino, volcán, pirámides, ventanas, olas, laberinto, rampa, tubería, V, rombo…) y de los juegos de minigolf
 * (hielo, viento, cintas, portales, rutas con riesgo). Todos comprobados con solve.js (misma física que el juego).
 * Elementos: ver physics.js. Ángulos en radianes (D = grados → radianes).
 * ===================================================================== */
(function (root) {
  const D = (g) => (g * Math.PI) / 180;
  const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const rhomb = (x, y, w, h) => [[x, y - h], [x + w, y], [x, y + h], [x - w, y]];
  const tri = (x, y, s, rot) => [0, 1, 2].map((k) => [x + Math.cos(rot + (k * 2 * Math.PI) / 3) * s, y + Math.sin(rot + (k * 2 * Math.PI) / 3) * s]);
  const H = [
    // ------------------------------------------------------------------ PAR 3
    { id: 'rombo', name: 'La pirámide', par: 3, theme: 'prado', shape: box(60, 80, 270, 505), ball: [165, 465], cup: [165, 135],
      pyramids: [[165, 300, 27, D(45)]], sand: [[105, 185, 22, 14]] },

    { id: 'ventanas', name: 'Las ventanas', par: 3, theme: 'sakura', shape: box(40, 60, 290, 505), ball: [95, 465], cup: [228, 118],
      blocks: [[40, 282, 61, 16], [133, 282, 16, 16], [181, 282, 16, 16], [229, 282, 61, 16]], sand: [[165, 190, 38, 15]] },

    { id: 'volcan', name: 'El volcán', par: 3, theme: 'desierto', shape: box(50, 60, 280, 505), ball: [165, 465], cup: [165, 190],
      slopes: [{ c: [165, 190], r: 92, g: 210 }], posts: [[105, 345, 7], [225, 345, 7]], sand: [[80, 95, 22, 14], [250, 95, 22, 14]] },

    { id: 'piramides', name: 'Las pirámides', par: 3, theme: 'desierto', shape: [[40, 505], [160, 505], [295, 200], [295, 60], [175, 60], [40, 360]], ball: [100, 468], cup: [240, 105],
      pyramids: [[150, 330, 21, D(15)], [210, 240, 18, D(-10)], [106, 408, 14, D(30)]] },

    { id: 'tuberia', name: 'Dos nubes', par: 3, theme: 'noche', shape: box(50, 60, 280, 505), ball: [165, 468], cup: [205, 108],
      blocks: [[50, 245, 230, 18]], pipe: [[95, 345, 95, 185, D(-45)], [235, 345, 245, 190, D(180)]], sand: [[110, 100, 26, 14]] },

    { id: 'hielo', name: 'Pista de hielo', par: 3, theme: 'nieve', shape: box(60, 60, 270, 505), ball: [165, 468], cup: [165, 118],
      ice: [[60, 170, 210, 220]], posts: [[165, 290, 9], [110, 220, 6], [220, 220, 6]], sand: [[165, 78, 60, 13]] },

    { id: 'olas', name: 'Doble ola', par: 3, theme: 'otono', shape: box(60, 60, 270, 505), ball: [205, 468], cup: [115, 115],
      slopes: [{ rect: [60, 375, 210, 40], ang: D(90), g: 190 }, { rect: [60, 335, 210, 40], ang: D(-90), g: 190 },
        { rect: [60, 235, 210, 40], ang: D(90), g: 190 }, { rect: [60, 195, 210, 40], ang: D(-90), g: 190 }] },

    { id: 'uve', name: 'La uve', par: 3, theme: 'prado', shape: box(40, 60, 290, 505), ball: [165, 468], cup: [165, 145],
      walls: [[165, 330, 100, 245, 5], [165, 330, 230, 245, 5]], posts: [[70, 100, 7], [260, 100, 7]] },

    { id: 'isla', name: 'La isla', par: 4, theme: 'playa', shape: box(30, 60, 300, 505), ball: [165, 468], cup: [192, 132],
      pond: [[30, 60, 85, 178], [215, 60, 85, 178], [30, 210, 270, 92]],
      jump: [[140, 330, 50, 28, D(-90)]], slopes: [{ c: [160, 150], r: 62, g: -320 }], sand: [[165, 70, 44, 9]],
      walls: [[118, 60, 118, 207, 3], [212, 60, 212, 207, 3]] },

    { id: 'molino', name: 'El molino', par: 3, theme: 'prado', shape: box(60, 60, 270, 505), ball: [165, 468], cup: [165, 105],
      blocks: [[60, 255, 60, 26], [210, 255, 60, 26]], windmill: [[165, 262, 90, 44, 30, 4, 4]], posts: [[110, 150, 7], [220, 150, 7]] },

    { id: 'caja', name: 'La caja secreta', par: 4, theme: 'noche', shape: box(40, 60, 290, 505), ball: [165, 468], cup: [165, 172],
      walls: [[105, 112, 105, 232, 4], [105, 232, 225, 232, 4], [225, 232, 225, 112, 4], [105, 112, 143, 112, 4], [187, 112, 225, 112, 4]], posts: [[165, 340, 8]] },

    { id: 'viento', name: 'Viento de cara', par: 3, theme: 'otono', shape: box(70, 60, 260, 505), ball: [165, 468], cup: [195, 110],
      wind: [D(90), 48], posts: [[120, 350, 7], [210, 300, 7], [140, 220, 7]] },

    { id: 'nubes', name: 'Caja de nubes', par: 3, theme: 'prado', shape: [[130, 505], [200, 505], [200, 330], [300, 330], [300, 60], [30, 60], [30, 330], [130, 330]], ball: [165, 470], cup: [80, 112],
      bumpers: [[165, 215, 14], [245, 140, 14], [95, 255, 13]] },

    { id: 'crater', name: 'El cráter', par: 3, theme: 'nieve', shape: box(30, 60, 300, 505), ball: [165, 470], cup: [182, 160],
      slopes: [{ c: [165, 175], r: 66, g: -170 }], posts: [[95, 330, 8], [235, 330, 8], [165, 380, 8]],
      water: [[55, 230, 22, 60], [275, 230, 22, 60]] },

    { id: 'salto', name: 'El salto', par: 3, theme: 'playa', shape: box(40, 60, 290, 505), ball: [165, 470], cup: [165, 110],
      pond: [[40, 215, 250, 120]], jump: [[140, 345, 50, 28, D(-90)]], posts: [[110, 160, 6], [220, 160, 6]] },

    { id: 'codo', name: 'El codo', par: 3, theme: 'prado', shape: [[30, 60], [300, 60], [300, 230], [150, 230], [150, 505], [30, 505]], ball: [90, 465], cup: [255, 130],
      walls: [[150, 230, 110, 190, 5]], posts: [[90, 300, 7]], sand: [[205, 105, 30, 18]] },

    // ------------------------------------------------------------------ PAR 4
    { id: 'zeta', name: 'La zeta', par: 3, theme: 'sakura', shape: [[30, 505], [130, 505], [130, 290], [300, 290], [300, 60], [200, 60], [200, 190], [30, 190]], ball: [80, 468], cup: [250, 100],
      posts: [[165, 240, 8]], sand: [[60, 225, 22, 16]] },

    { id: 'cinta', name: 'La cinta', par: 3, theme: 'noche', shape: box(40, 60, 290, 505), ball: [165, 468], cup: [100, 105],
      belt: [[40, 250, 250, 56, 170, 0]], pond: [[252, 230, 38, 96]], posts: [[150, 180, 7], [215, 150, 7]] },

    { id: 'puerta', name: 'La puerta', par: 3, theme: 'prado', shape: box(30, 60, 300, 505), ball: [165, 470], cup: [80, 100],
      blocks: [[30, 300, 100, 18], [200, 300, 100, 18]], slider: [[130, 300, 30, 18, 40, 0, 2.6]], sand: [[220, 380, 40, 22], [140, 150, 36, 20]],
      walls: [[200, 180, 300, 120, 5]] },

    { id: 'portales', name: 'Los portales', par: 3, theme: 'noche', shape: box(30, 60, 300, 505), ball: [240, 468], cup: [85, 112],
      blocks: [[30, 272, 244, 16], [30, 160, 110, 14]], portal: [[95, 380, 240, 200]], sand: [[200, 115, 30, 15]] },

    { id: 'cuesta', name: 'La cuesta', par: 3, theme: 'prado', shape: box(70, 60, 260, 505), ball: [165, 468], cup: [195, 100],
      slopes: [{ rect: [70, 150, 190, 250], ang: D(90), g: 95 }], posts: [[130, 300, 7], [205, 235, 7], [150, 185, 7]], sand: [[110, 95, 24, 14]] },

    { id: 'diamantes', name: 'Diamantes', par: 3, theme: 'desierto', shape: box(30, 60, 300, 505), ball: [165, 470], cup: [165, 100],
      polys: [rhomb(90, 180, 14, 18), rhomb(165, 180, 14, 18), rhomb(240, 180, 14, 18), rhomb(127, 255, 14, 18), rhomb(203, 255, 14, 18),
        rhomb(90, 330, 14, 18), rhomb(165, 330, 14, 18), rhomb(240, 330, 14, 18)], sand: [[165, 125, 34, 10]] },

    { id: 'puentes', name: 'Dos puentes', par: 4, theme: 'playa', shape: box(30, 60, 300, 505), ball: [165, 468], cup: [165, 105],
      pond: [[30, 230, 270, 62]], bridge: [[64, 224, 28, 74], [238, 224, 28, 74]], blocks: [[130, 330, 70, 14]], posts: [[110, 170, 7], [220, 170, 7]] },

    { id: 'turbo', name: 'El turbo', par: 4, theme: 'prado', shape: [[30, 505], [130, 505], [130, 170], [200, 170], [200, 505], [300, 505], [300, 60], [30, 60]], ball: [80, 470], cup: [250, 455],
      boost: [[40, 200, 80, 40, D(-90), 700], [210, 200, 80, 40, D(90), 700]], sand: [[165, 100, 30, 16]], posts: [[250, 330, 8]] },

    { id: 'bosque', name: 'Bosque de troncos', par: 3, theme: 'otono', shape: box(40, 60, 290, 505), ball: [165, 470], cup: [165, 100],
      posts: [[80, 380, 7], [140, 380, 7], [200, 380, 7], [255, 380, 7], [110, 320, 7], [170, 320, 7], [230, 320, 7], [80, 260, 7], [140, 260, 7], [200, 260, 7], [255, 260, 7],
        [110, 200, 7], [170, 200, 7], [230, 200, 7], [140, 145, 7], [200, 145, 7]] },

    { id: 'patinaje', name: 'Patinaje', par: 4, theme: 'nieve', shape: [[30, 505], [150, 505], [150, 230], [300, 230], [300, 60], [30, 60]], ball: [90, 470], cup: [255, 140],
      ice: [[30, 60, 270, 170], [30, 230, 120, 200]], sand: [[90, 120, 26, 18], [205, 190, 26, 14]], posts: [[160, 140, 8], [90, 300, 7]] },

    { id: 'rutas', name: 'Dos caminos', par: 4, theme: 'playa', shape: box(30, 60, 300, 505), ball: [70, 470], cup: [255, 105],
      water: [[165, 285, 100, 78]], bridge: [[152, 205, 26, 160]], sand: [[255, 200, 24, 14]], posts: [[70, 160, 7]] },

    { id: 'puertas2', name: 'Puertas locas', par: 4, theme: 'sakura', shape: box(40, 60, 290, 505), ball: [165, 470], cup: [165, 100],
      blocks: [[40, 330, 70, 16], [210, 330, 80, 16], [40, 200, 70, 16], [210, 200, 80, 16]],
      slider: [[125, 330, 40, 16, 20, 0, 2.2], [125, 200, 40, 16, 20, 0, 3.1]], sand: [[100, 270, 26, 14]] },

    { id: 'zigzag', name: 'Zigzag de nubes', par: 4, theme: 'prado', shape: box(20, 60, 310, 505), ball: [60, 470], cup: [270, 95],
      walls: [[20, 360, 230, 360, 5], [310, 230, 100, 230, 5]], bumpers: [[150, 430, 13], [235, 295, 13], [100, 160, 13]], slopes: [{ rect: [20, 240, 290, 110], ang: D(180), g: 60 }] },

    { id: 'remolino', name: 'El remolino', par: 3, theme: 'noche', shape: box(40, 60, 290, 505), ball: [165, 470], cup: [225, 110],
      slopes: [{ c: [165, 300], r: 85, g: -230 }], pipe: [[165, 300, 70, 120, D(0)]], posts: [[165, 160, 8]], water: [[60, 410, 20, 40], [270, 410, 20, 40]] },

    // ------------------------------------------------------------------ PAR 5
    { id: 'serpiente', name: 'Gran serpiente', par: 5, theme: 'sakura', shape: box(30, 60, 300, 505), ball: [72, 470], cup: [258, 100],
      walls: [[115, 505, 115, 150, 6], [215, 60, 215, 415, 6]], sand: [[165, 300, 24, 16]], posts: [[72, 110, 7], [258, 455, 7]] },

    { id: 'castillo', name: 'El castillo', par: 4, theme: 'prado', shape: box(30, 60, 300, 505), ball: [70, 470], cup: [165, 120],
      pond: [[30, 232, 115, 46], [185, 232, 115, 46]], bridge: [[145, 226, 40, 58]],
      walls: [[90, 75, 90, 175, 5], [90, 175, 140, 175, 5], [190, 175, 240, 175, 5], [240, 175, 240, 75, 5]], slider: [[140, 168, 50, 14, 55, 0, 2.8]], posts: [[230, 380, 8]] },

    { id: 'montana', name: 'Montaña rusa', par: 6, theme: 'otono', shape: box(30, 60, 300, 505), ball: [60, 470], cup: [265, 130],
      walls: [[30, 345, 235, 345, 5], [95, 205, 300, 205, 5]],
      slopes: [{ c: [150, 425], r: 55, g: 380 }, { rect: [175, 210, 35, 130], ang: D(0), g: 140 }, { rect: [140, 210, 35, 130], ang: D(180), g: 140 }],
      pond: [[160, 60, 45, 140]], jump: [[100, 108, 44, 48, D(0)]], sand: [[226, 132, 14, 62]], posts: [[265, 280, 7]] },

    { id: 'fabrica', name: 'La fábrica', par: 4, theme: 'noche', shape: box(30, 60, 300, 505), ball: [165, 475], cup: [165, 92],
      belt: [[30, 392, 270, 36, -170, 0], [30, 300, 270, 36, 170, 0], [30, 208, 270, 36, -170, 0]],
      blocks: [[30, 160, 100, 14], [200, 160, 100, 14]], mill: [[165, 160, 40, 4.2, 2]], posts: [[90, 350, 7], [240, 258, 7]] },

    { id: 'tormenta', name: 'La tormenta', par: 6, theme: 'playa', shape: box(30, 60, 300, 505), ball: [70, 470], cup: [262, 105],
      wind: [D(0), 42], walls: [[30, 300, 222, 300, 5], [108, 180, 300, 180, 5]],
      bumpers: [[150, 420, 13], [190, 245, 13], [100, 240, 12], [180, 115, 13]], water: [[290, 400, 22, 55], [290, 240, 20, 40], [200, 495, 40, 14]] },

    { id: 'glaciar', name: 'El glaciar', par: 4, theme: 'nieve', shape: [[30, 505], [130, 505], [130, 230], [300, 230], [300, 60], [30, 60]], ball: [80, 470], cup: [262, 145],
      ice: [[30, 60, 270, 170], [30, 230, 100, 275]], sand: [[80, 95, 34, 18], [180, 205, 30, 12]], posts: [[60, 330, 7], [100, 260, 7], [140, 120, 8], [205, 95, 8], [215, 175, 7]] },

    { id: 'oasis', name: 'El oasis', par: 4, theme: 'desierto', shape: box(30, 60, 300, 505), ball: [65, 470], cup: [250, 120],
      water: [[175, 270, 85, 55]], sand: [[120, 410, 70, 26], [235, 165, 44, 14], [285, 110, 12, 34], [70, 250, 30, 60]],
      slopes: [{ c: [105, 150], r: 62, g: 300 }], posts: [[255, 380, 8], [200, 420, 7]] },

    { id: 'final', name: 'Todo en uno', par: 5, theme: 'noche', shape: box(30, 60, 300, 505), ball: [165, 470], cup: [165, 135],
      windmill: [[165, 360, 80, 40, 28, 3.6, 4]], blocks: [[30, 345, 95, 30], [205, 345, 95, 30]], portal: [[70, 300, 260, 230]], walls: [[30, 260, 220, 260, 5]],
      slopes: [{ c: [165, 135], r: 78, g: 230 }] },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = H; else root.TQGolfHoles = H;
})(typeof window !== 'undefined' ? window : this);
