/* =====================================================================
 * TinyQuit · Golf 3D — hoyo 8 «El sello de correos» (v2, 12 oct, como hoyo final del juego)
 * Inspirado en el hoyo 8 de Royal Troon (Escocia, campo del Open). Par 3, ~112 m.
 *
 * Cómo se juega (estilo golf de Wii/Switch):
 *   1) Vista desde arriba del hoyo (con tu bola marcada) → la cámara baja detrás de la bola.
 *   2) APUNTAR: desliza el dedo a los lados (o en el mapa grande). Eliges palo con ‹ ›.
 *   3) GOLPEAR: la barra se llena → toca para fijar la FUERZA → vuelve → toca en la zona central
 *      para la DIRECCIÓN (si te pasas o te quedas, la bola se va a un lado).
 *   4) La cámara sigue a la bola (siempre en el centro); al botar, enseña la bola y el hoyo juntos.
 * Tiempo al azar (sol, viento, lluvia, granizo, nublado) que cambia el viento, los botes y lo que rueda.
 * Todo a tamaño real (bola 4,3 cm, hoyo 10,8 cm). El suelo se dibuja con un shader (bordes y franjas
 * nítidos de cerca y de lejos), en el estilo de dibujos de Tiro con arco.
 * Necesita three.js r128. Física: metros, segundos.
 * ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE;
  // textos: la app pasa el idioma (TQ_LANG) y las traducciones van en golf3d_tr.js (G3_TR[idioma][texto en español])
  const T = (s) => { const L = window.TQ_LANG, d = L && L !== 'es' && window.G3_TR && window.G3_TR[L]; return (d && d[s]) || s; };
  const TF = (s, o) => T(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
  function trDom(root) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const ns = []; while (w.nextNode()) ns.push(w.currentNode); for (const n of ns) { const t = n.nodeValue.trim(); if (t && T(t) !== t) n.nodeValue = n.nodeValue.replace(t, T(t)); } root.querySelectorAll('[aria-label]').forEach((e) => e.setAttribute('aria-label', T(e.getAttribute('aria-label')))); }
  /* ------------------------------------------------------------------ 1. el hoyo (datos; los otros hoyos usarán el mismo formato) */
  // Cada hoyo son solo datos: salida, hoyo, green (con inclinación, ondulaciones y niveles), búnkeres [x, z, radio x, radio z, hondo],
  // calle (polilínea [x, z, medio ancho]), relieve (lomas), mar, árboles y límites del terreno. El motor (física, cámara, golpe, mapa) es el mismo.
  const HOLES = [
    {
      id: 'troon8', num: 8, par: 3, len: 112, name: 'El sello de correos', course: 'Royal Troon', where: 'Royal Troon · Escocia', tag: 'HOYO DE LEYENDA · OPEN',
      info: 'Inspirado en el hoyo 8 de Royal Troon: el green más estrecho del Open.', style: 'links',
      tee: { x: 0, z: 0 }, cup: { x: 1, z: -111 },
      green: { x: 0, z: -108, rx: 5.5, rz: 13, tilt: [-0.015, -0.01], bumps: [[-2.2, -102.5, 0.16, 2.8], [3.0, -116, -0.11, 2.6], [-1.5, -113.5, 0.06, 2.2]] },
      bunkers: [[-8.8, -100, 3.2, 4.6, 0.8], [-9.2, -114, 3, 4, 0.8], [-3.6, -93.5, 3.2, 2.2, 0.7], [3.6, -94.5, 3, 2.2, 0.7], [8.3, -109, 1.7, 6.5, 1.4], [0, -124.5, 4, 2.2, 0.7]],
      seaZ: -185, fair: [], flag: 'sco', scenery: [], pano: 'troon', // Ailsa Craig y la isla de Arran al fondo del mar (en el fondo pintado)
      bumps: [[0, -3, 7, 140, 70], [0, -108, 3.4, 160, 520], [-18, -108, 9, 80, 340], [21, -98, 5, 100, 420]],
      bounds: [-120, 120, 30, -260],
    },
    {
      // Recorrido Negro del Club de Campo Villa de Madrid (Javier Arana, 1957; sede del Open de España). Hoyo 18: par 4, 331 m (blancas),
      // tres búnkeres a la izquierda en la caída del drive y green elevado y ciego de tres niveles (ficha del club). Pinos y encinas.
      id: 'ccvm18', num: 18, par: 4, len: 331, name: 'La subida a casa', course: 'Club de Campo Villa de Madrid', where: 'Club de Campo · Madrid', tag: 'HOYO DE LEYENDA · OPEN DE ESPAÑA',
      info: 'Inspirado en el 18 del recorrido Negro, sede del Open de España: tres búnkeres a la izquierda en la caída del drive y un green elevado de tres niveles.', style: 'parkland',
      tee: { x: 0, z: 0 }, cup: { x: 3.5, z: -324 },
      green: { x: 2, z: -322, rx: 10, rz: 13, raise: 1.6, bank: 14, blend: 0.55, tilt: [0.004, -0.008], tiers: [[-315.5, 0.34, 1.1], [-328.5, 0.3, 1.1]], bumps: [[7, -321, 0.12, 3.5], [-3.5, -325, -0.08, 3]] },
      bunkers: [[-18, -196, 4, 7, 0.7], [-21, -216, 3.5, 6, 0.7], [-17, -237, 4, 6.5, 0.7], [-11.5, -317, 3, 5.5, 1.0], [13, -327, 3, 4.5, 1.0]],
      seaZ: null, fair: [[0, -25, 13], [0.5, -110, 16], [1.5, -200, 17], [3, -262, 15], [2.5, -298, 11]], flag: 'es', scenery: [['club', -18, -374, 34]], pano: 'madrid', club: { style: 'stucco', roof: 'hip', rc: 'terra', fl: 2, d: 14, pitch: 0.22 },
      bumps: [[0, -4, 1.5, 160, 90], [-35, -150, 3, 500, 3000], [32, -120, 2.5, 600, 2500], [2, -330, 5.5, 900, 2600], [-2, -60, -1.2, 300, 900]],
      undul: [0.45, 0.35], bounds: [-130, 130, 30, -420],
    },
    {
      // Old Course de St Andrews, hoyo 18 «Tom Morris»: par 4, 356 yardas (~326 m), calle enorme sin búnkeres, el puente de Swilcan
      // sobre el arroyo nada más salir, fuera de límites a la derecha (la calle del pueblo) y el «Valle del Pecado» delante del green.
      id: 'standrews18', num: 18, par: 4, len: 326, name: 'Tom Morris', course: 'Old Course, St Andrews', where: 'St Andrews · Escocia', tag: 'HOYO DE LEYENDA · OPEN',
      info: 'Inspirado en el 18 del Old Course: calle enorme, el puente de Swilcan, fuera de límites a la derecha y el «Valle del Pecado» delante del green.', style: 'town', flag: 'sco', pano: 'standrews', houseFace: 'x', fence: 27.3,
      club: { style: 'sand', roof: 'hip', rc: 'slate', fl: 3, d: 18, chim: true }, red: { style: 'red', roof: 'hip', rc: 'slate', fl: 5, d: 16, turrets: true },
      tee: { x: 0, z: 0 }, cup: { x: -1, z: -324 },
      green: { x: -2, z: -320, rx: 13, rz: 14, tilt: [0.004, -0.006], bank: 5, bumps: [[-5, -304.5, -1.9, 5.5], [5, -326, 0.12, 4], [-7, -328, -0.08, 3.5]] },
      bunkers: [], seaZ: null, burn: { z: -26, w: 4 }, ob: 27,
      fair: [[-4, -12, 24], [-6, -100, 30], [-8, -200, 30], [-6, -270, 26], [-3, -300, 18]],
      bumps: [[-20, -160, 0.8, 900, 2500], [10, -230, 0.6, 500, 900], [-6, -60, -0.4, 600, 800]],
      undul: [0.25, 0.2], bounds: [-140, 120, 30, -420],
      scenery: [['bridge', -9, -26, 9], ['club', -40, -372, 38], ['red', 38, -380, 32], ...[...Array(13)].map((_, i) => ['house', 46.5 + (i % 3) * 0.8, -70 - i * 21.5, 20.5])],
    },
    {
      // TPC Sawgrass (Stadium), hoyo 17: par 3 de ~137 yardas (~125 m) al famoso green en isla, con un bunkercito delante a la derecha.
      id: 'sawgrass17', num: 17, par: 3, len: 125, name: 'La isla', course: 'TPC Sawgrass', where: 'Ponte Vedra · Florida', tag: 'HOYO DE LEYENDA · THE PLAYERS',
      info: 'Inspirado en el 17 de TPC Sawgrass: un green en una isla en medio del lago. O la clavas, o al agua.', style: 'parkland', flag: 'us', trees: ['palm', 'oak', 'palm'], pano: 'sawgrass', club: { style: 'cream', roof: 'hip', rc: 'terra', fl: 2, d: 22, pitch: 0.24, tower: true },
      tee: { x: 0, z: 0 }, cup: { x: 1.5, z: -124 },
      green: { x: 1, z: -123, rx: 9, rz: 11, tilt: [-0.006, 0.008], bank: 3, raise: 0.7, bumps: [[-3, -128, 0.08, 3.5], [4, -119, -0.06, 3]] },
      bunkers: [[8.2, -117, 1.8, 1.5, 0.6]], seaZ: null, fair: [],
      lakes: [[0, -118, 40, 34, 0.7]], island: [1, -123, 11.5, 13.5],
      bumps: [[0, 6, 3.2, 500, 400]], undul: [0.25, 0.2], bounds: [-120, 120, 30, -260], teeRaise: 1.5,
      scenery: [['club', -60, -230, 46], ['palm', -36, -150, 7], ['palm', 40, -140, 7], ['palm', 44, -100, 6]],
    },
    {
      // Augusta National, hoyo 13 «Azalea»: par 5 (~465 m) que gira a la izquierda; un afluente del arroyo Rae corre por la izquierda y cruza
      // por delante del green; cuatro búnkeres detrás del green; pinos altos y azaleas en flor.
      id: 'augusta13', num: 13, par: 5, len: 465, name: 'Azaleas', course: 'Augusta National', where: 'Augusta · Georgia', tag: 'HOYO DE LEYENDA · MASTERS',
      info: 'Inspirado en el 13 de Augusta: gira a la izquierda entre pinos y azaleas, y un arroyo cruza delante del green. ¿Te atreves a ir en dos?', style: 'parkland', flag: 'us', trees: ['tallpine', 'tallpine', 'oak'], pano: 'augusta',
      tee: { x: 0, z: 0 }, cup: { x: -168, z: -398 },
      green: { x: -166, z: -396, rx: 11, rz: 9, tilt: [0.01, 0.006], bank: 5, bumps: [[-172, -400, 0.15, 4], [-160, -392, -0.08, 3.5]] },
      bunkers: [[-178, -408, 3.2, 2.2, 0.8], [-170, -411, 2.8, 2, 0.8], [-160, -409, 2.6, 2, 0.8], [-153, -402, 2.2, 2.6, 0.8]], seaZ: null,
      fair: [[0, -25, 13], [-1, -150, 17], [-8, -235, 18], [-50, -295, 17], [-100, -340, 15], [-125, -358, 11]],
      river: [[-30, -100, 2], [-33, -170, 2.4], [-42, -245, 2.6], [-78, -285, 2.8], [-125, -330, 2.8], [-138, -362, 3], [-152, -378, 3.2], [-185, -381, 3]],
      via: [-6, -230],
      bumps: [[0, -10, 1.5, 300, 200], [-60, -180, -1.5, 900, 3000], [60, -200, 4, 800, 6000], [-170, -398, 1.6, 600, 600]],
      undul: [0.5, 0.4], bounds: [-240, 70, 30, -470],
      scenery: [...[...Array(12)].map((_, i) => ['azalea', -190 + i * 6 + (i % 3), -420 - (i % 2) * 4, 6]), ['azalea', -45, -255, 7], ['azalea', -52, -268, 6], ['azalea', -38, -282, 6]],
    },
    {
      // Pebble Beach, hoyo 7: par 3 cortísimo (~97 m) cuesta abajo hacia un green pequeño en la punta, con el Pacífico detrás y a la derecha
      // y búnkeres alrededor. El viento del mar lo cambia todo.
      id: 'pebble7', num: 7, par: 3, len: 97, name: 'La punta', course: 'Pebble Beach', where: 'Pebble Beach · California', tag: 'HOYO DE LEYENDA · US OPEN',
      info: 'Inspirado en el 7 de Pebble Beach: un par 3 cortito y cuesta abajo hacia un green en la punta, con el Pacífico detrás.', style: 'parkland', flag: 'us', trees: ['cypress', 'cypress', 'pine'], pano: 'pebble', ocean: { z: -60, y: -4.6 },
      tee: { x: 0, z: 0 }, cup: { x: 2, z: -96 },
      green: { x: 2, z: -95, rx: 6, rz: 7.5, tilt: [0.01, 0.012], bank: 4, bumps: [[0, -98, 0.07, 2.5]] },
      bunkers: [[-6, -88, 3, 2, 0.7], [-8.5, -97, 2.2, 4, 0.7], [2, -105, 4.5, 1.6, 0.6], [9, -94, 1.8, 4, 0.7], [5, -86.5, 2.4, 1.3, 0.6]], seaZ: null, fair: [[0, -20, 7], [1, -60, 9], [2, -82, 6]],
      lakes: [[48, -110, 36, 70, 6], [0, -186, 110, 62, 6], [-60, -140, 30, 30, 6]],
      bumps: [[0, 6, 11, 900, 3000], [2, -95, 2, 300, 300]], undul: [0.3, 0.25], bounds: [-120, 120, 30, -230],
      scenery: [['rock', 22, -120, 8], ['rock', 30, -95, 6], ['rock', -14, -122, 7], ['cypress', -30, -40, 11], ['cypress', -26, -70, 10]],
    },
    {
      // Carnoustie, hoyo 18 «Home»: par 4 larguísimo (~450 m); el arroyo Barry cruza la calle dos veces (al salir y delante del green)
      // y corre por la izquierda, con fuera de límites a la izquierda. Búnkeres junto al green y el hotel detrás.
      id: 'carnoustie18', num: 18, par: 4, len: 450, name: 'El arroyo Barry', course: 'Carnoustie', where: 'Carnoustie · Escocia', tag: 'HOYO DE LEYENDA · OPEN',
      info: 'Inspirado en el 18 de Carnoustie: el arroyo Barry cruza la calle dos veces y hay fuera de límites a la izquierda. Uno de los finales más duros del Open.', style: 'town', flag: 'sco', pano: 'carnoustie', club: { style: 'hotel', roof: 'flat', fl: 4, d: 20 },
      tee: { x: 0, z: 0 }, cup: { x: 3, z: -444 },
      green: { x: 2, z: -440, rx: 10, rz: 14, tilt: [0.004, -0.008], bank: 4, bumps: [[-2, -446, 0.1, 4], [6, -434, -0.07, 3.5]] },
      bunkers: [[-12, -430, 3, 4, 1], [-11.5, -447, 2.6, 3.5, 1], [14.5, -438, 3, 4, 1]], seaZ: null, obL: -40,
      fair: [[0, -110, 14], [0, -250, 16], [2, -380, 15], [2, -414, 9]],
      river: [[60, -58, 3], [-24, -108, 3], [-29, -250, 3], [-31, -398, 3], [0, -421, 3.5], [45, -425, 3.5]],
      bumps: [[0, 6, 1, 300, 200], [30, -250, 1.2, 600, 3000]], undul: [0.25, 0.2], bounds: [-130, 130, 30, -500],
      scenery: [['club', 22, -490, 70], ['house', -55, -480, 16], ['house', 60, -470, 16], ['house', 80, -455, 14]],
    },
    {
      // Valderrama, hoyo 17: par 5 (~470 m) con un lago justo delante del green, que cae hacia el agua; sede de la Ryder Cup de 1997.
      id: 'valderrama17', num: 17, par: 5, len: 470, name: 'El lago', course: 'Valderrama', where: 'Sotogrande · Cádiz', tag: 'HOYO DE LEYENDA · RYDER CUP',
      info: 'Inspirado en el 17 de Valderrama (Ryder Cup 1997): un lago justo delante de un green que cae hacia el agua. ¿Vas en dos o te quedas corto?', style: 'parkland', flag: 'es', trees: ['cork', 'cork', 'pine'], pano: 'valderrama', club: { style: 'stucco', roof: 'hip', rc: 'terra', fl: 2, d: 14, pitch: 0.22, tower: true },
      tee: { x: 0, z: 0 }, cup: { x: 7, z: -464 },
      green: { x: 6, z: -462, rx: 11, rz: 10, tilt: [0, -0.02], bank: 4, bumps: [[2, -466, 0.1, 3.5], [10, -458, -0.06, 3]] },
      bunkers: [[6, -475, 4.5, 2, 0.8], [-8, -463, 2.4, 4, 0.8]], seaZ: null,
      fair: [[0, -25, 13], [2, -150, 15], [4, -260, 15], [3, -365, 13], [5, -405, 8]],
      lakes: [[7, -441, 24, 9, 0.6]],
      bumps: [[0, 4, 1.5, 300, 200], [-40, -250, 2.5, 800, 4000], [40, -300, 2, 700, 4000]], undul: [0.35, 0.3], bounds: [-130, 130, 30, -520],
      scenery: [['club', -45, -505, 40]],
    },
    {
      // Old Course de St Andrews, hoyo 14 «Long»: par 5 enorme (~565 m), los búnkeres «Beardies» a la izquierda de la caída,
      // fuera de límites (el muro) a la derecha y el gigantesco búnker «Hell» en medio de la calle a unos 100 m del green.
      id: 'standrews14', num: 14, par: 5, len: 565, name: 'El infierno', course: 'Old Course, St Andrews', where: 'St Andrews · Escocia', tag: 'HOYO DE LEYENDA · OPEN',
      info: 'Inspirado en el 14 del Old Course: un par 5 enorme, con fuera de límites a la derecha y el gigantesco búnker «Hell» en medio de la calle.', style: 'links', flag: 'sco', pano: 'standrews14', wall: 27.6,
      tee: { x: 0, z: 0 }, cup: { x: -6, z: -558 },
      green: { x: -6, z: -555, rx: 13, rz: 15, tilt: [0.006, -0.006], bank: 4, bumps: [[-10, -560, 0.12, 4.5], [0, -548, -0.08, 4]] },
      bunkers: [[-31, -195, 2.5, 2, 0.9], [-35, -206, 2, 1.8, 0.9], [-28, -213, 2, 1.6, 0.9], [-13, -462, 9, 6, 1.8], [-17, -540, 2.5, 2, 0.9]], seaZ: null, ob: 27,
      fair: [[-5, -30, 20], [-12, -200, 25], [-18, -330, 22], [-12, -440, 22], [-6, -530, 15]],
      bumps: [[-15, -300, 0.9, 1500, 6000], [-10, -480, -0.6, 300, 500]], undul: [0.35, 0.3], bounds: [-130, 110, 30, -620],
      scenery: [],
    },
    /* v8: seis hoyos nuevos por el mundo (2 de cada par) */
    {
      // Casa de Campo, «Teeth of the Dog» (Pete Dye, 1971), hoyo 5: par 3 de 176 yardas por encima de una cala del Caribe; el mar a la izquierda
      // y detrás del green, y la roca de coral afilada (el «diente de perro» que da nombre al campo) haciendo de orilla. A la derecha hay sitio.
      id: 'teeth5', num: 5, par: 3, len: 150, name: 'Diente de perro', course: 'Casa de Campo', where: 'La Romana · República Dominicana', tag: 'HOYO DE LEYENDA · CARIBE',
      info: 'Inspirado en el 5 de Teeth of the Dog: se tira por encima de una cala del Caribe, con el mar a la izquierda y detrás del green. A la derecha hay sitio para no mojarse.', style: 'parkland', flag: 'do', trees: ['palm', 'palm', 'bush'], pano: 'casadecampo',
      ocean: { z: 80, y: -2.4 }, land: { drop: 4.5, edge: 2.5, rock: '#77746C', polys: [[[-4, 22, 15], [3, -14, 12]], [[70, 40, 70], [88, -60, 72], [80, -125, 70], [50, -150, 30]], [[40, -144, 15], [1, -148, 14.5]]] },
      tee: { x: 0, z: 0 }, cup: { x: -1, z: -149 },
      green: { x: -1, z: -147, rx: 8.5, rz: 9.5, tilt: [0.008, 0.008], bank: 3, bumps: [[3, -151, 0.1, 3.2], [-4, -143, -0.06, 2.8]] },
      bunkers: [[10, -141, 2.6, 5, 0.8], [5, -134.5, 4, 1.8, 0.7], [11.5, -154, 2.2, 3, 0.8]], seaZ: null, fair: [[27, -88, 9], [21, -120, 9], [9, -134, 6]],
      bumps: [[0, 6, 0.8, 300, 300]], undul: [0.25, 0.2], bounds: [-110, 110, 40, -230], teeRaise: 0.8,
      scenery: [['palm', 22, -12, 7], ['palm', 30, -42, 8], ['palm', 36, -70, 7], ['palm', 40, -118, 7], ['palm', 28, -162, 8], ['palm', 18, 14, 6], ['rock', -12, -30, 6], ['rock', 15, -55, 7], ['rock', 12, -100, 6], ['rock', -14, -136, 6], ['rock', -9, -161, 7], ['rock', -16, 6, 6]],
    },
    {
      // Royal Melbourne, recorrido Oeste (Alister MacKenzie, 1926), hoyo 5: par 3 de 161 m que cruza un valle hasta un green en la loma de enfrente.
      // Lo que se queda corto vuelve talud abajo; el green cae de atrás hacia delante y los búnkeres del «sandbelt» llegan hasta su borde.
      id: 'melbourne5', num: 5, par: 3, len: 161, name: 'El valle', course: 'Royal Melbourne', where: 'Melbourne · Australia', tag: 'HOYO DE LEYENDA · SANDBELT',
      info: 'Inspirado en el 5 del recorrido Oeste de Royal Melbourne: cruzas un valle hasta un green en la loma de enfrente. Si te quedas corto, la bola vuelve cuesta abajo; si te pasas, el putt de vuelta da miedo.', style: 'parkland', flag: 'au', trees: ['gum', 'gum', 'oak'], pano: 'melbourne', dry: 0.25,
      tee: { x: 0, z: 0 }, cup: { x: 2, z: -160 },
      green: { x: 1, z: -158, rx: 9, rz: 12, raise: 0.3, bank: 5, tilt: [0.004, -0.022], bumps: [[5, -164, 0.1, 3.5], [-3, -151, -0.06, 3]] },
      bunkers: [[13.5, -150, 4.5, 3.5, 1.1], [-12.5, -157, 3, 6.5, 1.1], [-6, -145.5, 3.4, 2, 0.9], [12.2, -165, 2.6, 4.2, 1.0], [-5, -172.5, 4.5, 2.2, 1.0]], seaZ: null,
      fair: [[0, -100, 9], [0.5, -132, 11], [1, -144, 9]],
      bumps: [[0, 2, 5, 900, 1400], [0, -82, -6.5, 3500, 900], [1, -166, 5.5, 1400, 700]], undul: [0.3, 0.25], bounds: [-110, 110, 30, -240],
      scenery: [['gum', -30, -60, 7], ['gum', 28, -95, 7], ['gum', -26, -192, 8], ['gum', 32, -186, 7], ['gum', -40, -125, 7]],
    },
    {
      // Le Golf National, recorrido L'Albatros (Ryder Cup 2018 y golf de los Juegos de París 2024), hoyo 18: par 4 de 471 yardas (~431 m),
      // agua a la izquierda en la caída del drive y delante del green, búnkeres a la derecha y un green grande con muchas ondulaciones.
      id: 'national18', num: 18, par: 4, len: 431, name: 'El último lago', course: 'Le Golf National', where: 'París · Francia', tag: 'HOYO DE LEYENDA · RYDER CUP',
      info: 'Inspirado en el 18 de Le Golf National (Ryder Cup 2018 y Juegos de París 2024): agua a la izquierda y delante del green, búnkeres a la derecha. Hay que ir por el centro.', style: 'links', oaks: 40, gorse: 0, wild: ['bush', 140], dry: 0.15, flag: 'fr', pano: 'paris', club: { style: 'hotel', roof: 'flat', fl: 3, d: 18 },
      tee: { x: 0, z: 0 }, cup: { x: -5, z: -428 },
      green: { x: -4, z: -425, rx: 13, rz: 12, tilt: [0.006, -0.006], bank: 4, tiers: [[-422, 0.22, 1.4]], bumps: [[2, -431, 0.12, 3.5], [-10, -428, -0.09, 3], [3, -418, 0.07, 3]] },
      bunkers: [[19, -238, 4, 8, 0.8], [20, -265, 3.5, 6, 0.8], [11.5, -432, 2.6, 5, 1.0], [-3, -441, 5, 2, 0.9]], seaZ: null,
      fair: [[0, -30, 13], [2, -150, 16], [2, -260, 16], [-1, -350, 15], [3, -396, 10]],
      lakes: [[-44, -285, 20, 80, 0.8], [-24, -408, 13, 11, 0.8]],
      bumps: [[0, 4, 1.2, 300, 200], [40, -300, 4.5, 260, 9000], [-80, -300, 3, 300, 9000], [-4, -470, 6, 2500, 250], [34, -425, 5, 220, 1500], [27, -110, 3.6, 130, 2600], [-27, -120, 3, 130, 2400]], undul: [0.25, 0.2], bounds: [-130, 120, 30, -520],
      scenery: [['club', 30, -500, 64]],
    },
    {
      // Mid Ocean Club (Charles Blair Macdonald, 1921), hoyo 5 «Cape»: par 4 desde un tee alto sobre el acantilado (unos 15 m) con el lago
      // Mangrove a la izquierda; la calle lo rodea y el green queda casi en ángulo recto. Cuanto más lago cruzas, más corto el segundo golpe.
      id: 'midocean5', num: 5, par: 4, len: 340, name: 'El cabo', course: 'Mid Ocean Club', where: 'Tucker\'s Town · Bermudas', tag: 'HOYO DE LEYENDA · BERMUDAS',
      info: 'Inspirado en el 5 del Mid Ocean Club: desde un tee alto, la calle rodea un lago por la izquierda. Cuanto más lago te atreves a cruzar, más fácil te queda el green.', style: 'parkland', flag: 'bm', trees: ['palm', 'cedar', 'cedar'], pano: 'bermuda', houseStyle: 'pastel', club: { style: 'pink', roof: 'hip', rc: 'white', fl: 2, d: 16, pitch: 0.3 },
      tee: { x: 0, z: 0 }, cup: { x: -142, z: -269 },
      green: { x: -140, z: -268, rx: 12, rz: 11, tilt: [-0.012, 0.004], bank: 4, bumps: [[-145, -264, 0.1, 3.5], [-134, -273, -0.07, 3]] },
      bunkers: [[24, -175, 4, 9, 0.8], [-132, -282, 4.5, 2.4, 0.9], [-128, -255, 3.5, 2.4, 0.9], [-155, -270, 2.2, 4, 0.9]], seaZ: null,
      fair: [[8, -115, 15], [5, -185, 17], [-28, -238, 16], [-80, -262, 14], [-122, -270, 10]],
      lakes: [[-82, -140, 60, 70, 0.9]],
      bumps: [[0, 8, 14, 1500, 1800], [60, -150, 5, 2500, 9000], [-175, -150, 6, 2500, 9000], [-140, -310, 4, 4000, 900]], undul: [0.2, 0.15], bounds: [-230, 90, 30, -330],
      scenery: [['house', 52, -60, 11], ['house', 66, -118, 10], ['house', 58, -238, 11], ['house', -205, -290, 10], ['house', -210, -232, 11], ['house', -60, -312, 10], ['club', -196, -165, 34], ['palm', 18, -40, 7], ['palm', -110, -232, 7], ['palm', -168, -250, 7]],
    },
    {
      // Cape Kidnappers (Tom Doak, 2004), hoyo 15 «Pirate's Plank»: par 5 de 650 yardas (~594 m) por una lengua de tierra cada vez más
      // estrecha, con acantilados a los dos lados que caen al Pacífico. Pasto dorado (tussock) y nada de árboles.
      id: 'kidnappers15', num: 15, par: 5, len: 594, name: 'La plancha del pirata', course: 'Cape Kidnappers', where: 'Hawke\'s Bay · Nueva Zelanda', tag: 'HOYO DE LEYENDA · ACANTILADOS',
      info: 'Inspirado en el 15 de Cape Kidnappers: un par 5 larguísimo por una lengua de tierra que se estrecha hasta el green, con acantilados a los dos lados. Un paso en falso… y al mar.', style: 'links', oaks: 0, gorse: 0, wild: ['tussock', 160], dry: 0.9, flag: 'nz', pano: 'hawkes',
      ocean: { z: 80, y: -34 }, land: { drop: 38, edge: 9, rock: '#D6C9AA', polys: [[[0, 30, 30], [0, -140, 38], [-6, -320, 33], [-10, -470, 25], [-7, -560, 19.5], [-4, -600, 17]], [[-30, -250, 14], [-82, -275, 9]], [[25, -395, 12], [70, -425, 8]]] },
      tee: { x: 0, z: 0 }, cup: { x: -5, z: -590 },
      green: { x: -6, z: -587, rx: 9, rz: 11, tilt: [0.004, -0.006], bank: 4, bumps: [[-9, -592, 0.1, 3.2], [-2, -582, -0.07, 3]] },
      bunkers: [[16, -300, 3.5, 7, 0.8], [-24, -420, 3, 6, 0.8], [8, -505, 3, 5, 0.8], [7, -582, 2.4, 4, 0.9], [-18, -590, 2.2, 3.5, 0.9]], seaZ: null,
      fair: [[0, -40, 14], [0, -200, 20], [-6, -330, 18], [-9, -470, 14], [-7, -545, 11], [-6, -575, 8]],
      bumps: [[0, 6, 1.2, 300, 200], [-5, -300, 1.5, 600, 40000], [0, 20, 9, 3000, 40000]], undul: [0.45, 0.35], bounds: [-140, 130, 40, -660],
      scenery: [],
    },
    {
      // Kawana, recorrido Fuji (Charles Alison, 1936), hoyo 15: par 5 de 480 yardas (~439 m) con el mar y el acantilado a la izquierda, la calle
      // cayendo fuerte desde la salida, muchos búnkeres hondos a la derecha y un green poco profundo partido en dos niveles por una loma.
      id: 'kawana15', num: 15, par: 5, len: 439, name: 'El acantilado', course: 'Kawana · Fuji', where: 'Ito · Japón', tag: 'HOYO DE LEYENDA · JAPÓN',
      info: 'Inspirado en el 15 del recorrido Fuji de Kawana: el mar y el acantilado a la izquierda, búnkeres hondos a la derecha y un green estrecho de dos niveles. Se puede llegar en dos… si te atreves.', style: 'parkland', flag: 'jp', trees: ['jpine', 'jpine', 'pine'], pano: 'izu', club: { style: 'cream', roof: 'hip', rc: 'terra', fl: 3, d: 16, pitch: 0.24 },
      ocean: { z: 80, y: -24 }, land: { drop: 28, edge: 8, rock: '#5E5A55', polys: [[[95, 40, 128], [100, -200, 130], [92, -340, 128], [85, -470, 118]]] },
      tee: { x: 0, z: 0 }, cup: { x: 2, z: -436 },
      green: { x: 1, z: -434, rx: 14, rz: 8, tilt: [0.004, 0.004], bank: 4, tiers: [[-434, 0.35, 1.2]], bumps: [[-6, -437, 0.08, 3], [7, -432, -0.06, 3]] },
      bunkers: [[22, -230, 4, 8, 1.4], [24, -275, 3.5, 6, 1.4], [20, -395, 3, 5, 1.4], [19.5, -432, 3, 4.5, 1.5], [1, -446, 6, 2, 1.0]], seaZ: null,
      fair: [[-2, -50, 14], [0, -180, 17], [4, -300, 17], [3, -400, 13], [1, -424, 8]],
      bumps: [[0, 8, 9, 1500, 2600], [8, -330, 2, 300, 900], [-6, -380, -1.4, 200, 600]], undul: [0.7, 0.55], bounds: [-90, 130, 40, -520],
      scenery: [['club', 75, -505, 46], ['jpine', -22, -120, 9], ['jpine', -24, -262, 9], ['jpine', -25, -362, 8], ['jpine', -20, -470, 8]],
    },
  ];
  let HOLE = HOLES[0], HI = 0;
  const BALL_R = 0.0214, CUP_R = 0.054, SEA_Y = -0.7; // el mar es un plano a -0,7 m: donde el suelo queda por debajo, hay agua
  /* ------------------------------------------------------------------ 2. terreno y superficies */
  function hRaw(x, z) {
    let y = 0;
    for (const b of HOLE.bumps) y += b[2] * Math.exp(-((x - b[0]) ** 2 / b[3] + (z - b[1]) ** 2 / b[4]));
    // 7.3 (F4): relieve natural con ruido suave (lomas irregulares, nada de «olas» repetidas) y, en hoyos sin agua,
    // una pendiente general (cuesta arriba / abajo / llano) distinta en cada hoyo, como en un campo de verdad
    const u = HOLE.undul || [0.35, 0.25]; y += u[0] * 2.2 * vnoise(x / 70, z / 70, 1) + u[1] * 1.4 * vnoise(x / 26, z / 26, 7);
    y += incline() * (HOLE.tee.z - z);
    if (HOLE.seaZ != null && z < HOLE.seaZ + 45) y -= (z - HOLE.seaZ - 45) ** 2 * 0.004;
    if (HOLE.land) { const L = HOLE.land, d = landD(x, z); // acantilados: fuera de la tierra el suelo cae en picado hasta el mar
      if (d > -3) { const t0 = Math.max(0, Math.min(1, (d + 3) / 3)); y -= 0.6 * t0 * t0; }
      if (d > 0) { const t = Math.min(1, d / L.edge), r = 1 + 0.12 * Math.sin(x * 0.37 + z * 0.21) + 0.06 * Math.sin(x * 1.3 - z * 0.9); y -= L.drop * r * t * t * (3 - 2 * t) + Math.max(0, d - L.edge) * 0.08; } }
    return y;
  }
  // ruido de valor suave (−0,5…0,5), barato y determinista
  function vh(ix, iz, sd) { let n = (ix * 374761393 + iz * 668265263 + sd * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967295 - 0.5; }
  function vnoise(x, z, sd) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = vh(ix, iz, sd), b = vh(ix + 1, iz, sd), c = vh(ix, iz + 1, sd), d = vh(ix + 1, iz + 1, sd); return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz; }
  // pendiente general del hoyo (m por m hacia el green): + sube, − baja. Solo donde no hay agua ni acantilados.
  const INCL = [0, 0.012, -0.01, 0.006, 0.018, -0.016, 0, 0.01, -0.008, 0.004];
  function incline() { if (HOLE.incl != null) return HOLE.incl; if ((HOLE.lakes && HOLE.lakes.length) || HOLE.seaZ != null || HOLE.river || HOLE.land || HOLE.burn || HOLE.ocean) return 0; return INCL[HI % INCL.length]; }
  // distancia al borde de la tierra (negativa dentro): varias «tiras» de tierra [x, z, medio ancho] con un borde irregular de roca
  function landD(x, z) { let best = 1e9; for (const P of HOLE.land.polys) { if (P.length === 1) { best = Math.min(best, Math.hypot(x - P[0][0], z - P[0][1]) - P[0][2]); continue; }
      for (let i = 0; i < P.length - 1; i++) { const [ax, az, aw] = P[i], [bx, bz, bw] = P[i + 1], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t) - (aw + (bw - aw) * t)); } }
    return best + 1.8 * Math.sin(x * 0.29 + z * 0.13) + 1.1 * Math.sin(x * 0.71 - z * 0.47) + 0.6 * Math.sin(x * 1.9 + z * 1.4); }
  let G0, GY, TY, GB, MAPB;
  function derive() {
    G0 = HOLE.green; GY = hRaw(G0.x, G0.z) + (G0.raise || 0); TY = hRaw(HOLE.tee.x, HOLE.tee.z) + (HOLE.teeRaise || 0); GB = G0.bumps || [];
    // mapa: el hoyo entero en 2:3 (sin estirar)
    const z0 = HOLE.tee.z + 14, z1 = Math.min(HOLE.cup.z, G0.z - G0.rz) - 21, w = ((z0 - z1) * 2) / 3, cx = (HOLE.tee.x + HOLE.cup.x) / 2;
    MAPB = { x0: cx - w / 2, x1: cx + w / 2, z0, z1 };
  }
  derive();
  function bunkerR(b, a) { const s = b[0] * 0.37 + b[1] * 0.91; return 1 + 0.12 * Math.sin(2 * a + s) + 0.08 * Math.sin(3 * a + s * 1.7) + 0.05 * Math.sin(5 * a + s * 0.6); }
  function bunkerD(b, x, z) { const dx = (x - b[0]) / b[2], dz = (z - b[1]) / b[3]; return Math.hypot(dx, dz) / bunkerR(b, Math.atan2(dz, dx)); }
  // ondulaciones del green (una loma atrás-izquierda y una hondonada delante-derecha): cada zona cae hacia un lado
  function greenBumps(x, z) {
    let y = 0; for (const [bx, bz, a, r] of GB) y += a * Math.exp(-((x - bx) ** 2 + (z - bz) ** 2) / (r * r));
    for (const [zl, hgt, wd] of G0.tiers || []) { const t = Math.max(0, Math.min(1, (zl - z) / wd * 0.5 + 0.5)); y += hgt * t * t * (3 - 2 * t); } // niveles del green (suben hacia el fondo)
    return y;
  }
  let FLAT = null; // solo pruebas: suelo llano de una superficie
  function h(x, z) {
    if (FLAT) return 0;
    let y = hRaw(x, z);
    const bk = G0.bank || 4, dg = ((x - G0.x) / (G0.rx + bk)) ** 2 + ((z - G0.z) / (G0.rz + bk)) ** 2;
    if (dg < 1) { const b0 = G0.blend || 0.55, w = G0.blend ? Math.min(1, (1 - Math.sqrt(dg)) / (1 - b0)) : dg < b0 ? 1 : 1 - (dg - b0) / (1 - b0), // con «blend»: talud más tendido (radial)
      s = w * w * (3 - 2 * w); y = y * (1 - s) + (GY + G0.tilt[0] * (x - G0.x) + G0.tilt[1] * (z - G0.z) + greenBumps(x, z)) * s; }
    const dt = ((x - HOLE.tee.x) / 6) ** 2 + ((z - HOLE.tee.z) / 7) ** 2;
    if (dt < 1) { const w = dt < 0.5 ? 1 : 1 - (dt - 0.5) / 0.5, s = w * w * (3 - 2 * w); y = y * (1 - s) + TY * s; }
    for (const b of HOLE.bunkers) { const d = bunkerD(b, x, z); if (d < 1) y -= b[4] * (1 - d * d); }
    if (HOLE.burn) { const d = Math.abs(z - HOLE.burn.z) / (HOLE.burn.w * 0.5 + 1.2); if (d < 1) y -= 1.0 * (1 - d * d); }
    // lagos (y la isla que dejan dentro) y ríos: el suelo baja hacia el agua
    for (const L of HOLE.lakes || []) { const d = lakeD(L, x, z); if (d < 1.25) { const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }; let k = 1; const I = HOLE.island; if (I) { const di = Math.hypot((x - I[0]) / I[2], (z - I[1]) / I[3]); k = Math.min(1, Math.max(0, (di - 1) / 0.25)); } if (L[4] > 3) { const kk = Math.min(1, (1.25 - d) / 0.35) * k; y -= L[4] * kk * kk * (3 - 2 * kk); } else y -= k * (L[4] * 0.55 * sm((1.25 - d) / 0.25) + 1.1 * sm((1 - d) / 0.12)); } }
    if (HOLE.river) { const rd = riverD(x, z); if (rd < 1.2) { const k = Math.min(1, (1.2 - rd) / 1.2); y -= 0.7 * k * k * (3 - 2 * k); } }
    return Math.max(y, HOLE.land ? -HOLE.land.drop - 8 : -12);
  }
  function meshH(x, z) { if (FLAT) return 0; const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz; return h(ix, iz) * (1 - fx) * (1 - fz) + h(ix + 1, iz) * fx * (1 - fz) + h(ix, iz + 1) * (1 - fx) * fz + h(ix + 1, iz + 1) * fx * fz; }
  function lakeD(L, x, z) { const dx = (x - L[0]) / L[2], dz = (z - L[1]) / L[3]; return Math.hypot(dx, dz) / bunkerR([L[0], L[1]], Math.atan2(dz, dx)); }
  const OCN = () => HOLE.ocean && HOLE.ocean.y != null && HOLE.seaZ == null;
  function inWater(x, z) {
    if (OCN() && z < HOLE.ocean.z + 40 && h(x, z) < HOLE.ocean.y - 0.03) return true;
    for (const L of HOLE.lakes || []) if (!(OCN() && L[4] > 3) && lakeD(L, x, z) < 1) { const I = HOLE.island; if (!I || Math.hypot((x - I[0]) / I[2], (z - I[1]) / I[3]) > 1) return true; }
    return !!HOLE.river && riverD(x, z) < 0;
  }
  function riverD(x, z) { const F = HOLE.river; let best = 1e9; for (let i = 0; i < F.length - 1; i++) { const [ax, az, aw] = F[i], [bx, bz, bw] = F[i + 1], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t) - (aw + (bw - aw) * t)); } return best; }
  function fairD(x, z) { // distancia a la calle (negativa dentro)
    const F = HOLE.fair; let best = 1e9; for (let i = 0; i < F.length - 1; i++) { const [ax, az, aw] = F[i], [bx, bz, bw] = F[i + 1], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t) - (aw + (bw - aw) * t)); } return best; }
  const inFair = (x, z) => HOLE.fair.length > 1 && fairD(x, z) < 0;
  const inEll = (x, z, cx, cz, rx, rz) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 < 1;
  function surf(x, z) {
    if (FLAT) return FLAT;
    if (HOLE.seaZ != null && z < HOLE.seaZ + 40) { const y = h(x, z); if (z < HOLE.seaZ + 30 && y < SEA_Y) return 'sea'; if (y < SEA_Y + 0.55) return 'beach'; }
    if (HOLE.burn && Math.abs(z - HOLE.burn.z) < HOLE.burn.w * 0.5) return 'sea';
    if (inWater(x, z)) return 'sea';
    if (HOLE.ob != null && x > HOLE.ob) return 'ob';
    if (HOLE.obL != null && x < HOLE.obL) return 'ob';
    for (const b of HOLE.bunkers) if (bunkerD(b, x, z) < 1) return 'sand';
    if (inEll(x, z, G0.x, G0.z, G0.rx, G0.rz)) return 'green';
    if (inEll(x, z, G0.x, G0.z, G0.rx + 3, G0.rz + 3)) return 'ante';
    if (Math.abs(x - HOLE.tee.x) < 3.5 && z < HOLE.tee.z + 4 && z > HOLE.tee.z - 5) return 'tee';
    if (inFair(x, z)) return 'fair';
    return 'rough';
  }
  const SURF = {
    green: { e: 0.27, keep: 0.6, f: 0.55, skid: 2.2, lie: 1, name: 'el green' }, ante: { e: 0.38, keep: 0.5, f: 1.5, skid: 3, lie: 1, name: 'el antegreen' },
    tee: { e: 0.4, keep: 0.5, f: 1.5, skid: 3, lie: 1, name: 'la salida' }, fair: { e: 0.4, keep: 0.5, f: 1.5, skid: 3, lie: 1, name: 'la calle' }, rough: { e: 0.24, keep: 0.3, f: 4.6, skid: 0, lie: 0.85, name: 'la hierba alta' },
    sand: { e: 0.04, keep: 0.12, f: 9, skid: 6, lie: 0.6, name: 'el búnker' }, beach: { e: 0.05, keep: 0.15, f: 8, skid: 6, lie: 0.6, name: 'la playa' }, ob: { e: 0, keep: 0, f: 99, lie: 1, name: 'fuera de límites' }, sea: { e: 0, keep: 0, f: 99, lie: 1, name: 'el mar' },
  };
  /* ------------------------------------------------------------------ 3. palos y tiempo */
  const CLUBS = [
    { id: 'driver', name: 'Driver', carry: 225, deg: 11, spin: 0.3, icon: 'driver' },
    { id: 'wood', name: 'Madera 3', carry: 200, deg: 13, spin: 0.42, icon: 'wood' },
    { id: 'i5', name: 'Hierro 5', carry: 165, deg: 20, spin: 0.65, icon: 'iron' },
    { id: 'i7', name: 'Hierro 7', carry: 140, deg: 26, spin: 0.8, icon: 'iron' },
    { id: 'i9', name: 'Hierro 9', carry: 115, deg: 34, spin: 1.0, icon: 'iron' },
    { id: 'wedge', name: 'Wedge', carry: 85, deg: 47, spin: 1.3, icon: 'wedge' },
    { id: 'putt', name: 'Putter', carry: 0, deg: 0, spin: 0, icon: 'putter' },
  ];
  const WEATHERS = {
    sol: { name: 'Sol', wind: [4, 12], fric: 1, e: 1, keep: 1, fog: 1 },
    viento: { name: 'Ventisca', wind: [28, 40], fric: 1, e: 1, keep: 1, fog: 1 },
    nublado: { name: 'Nublado', wind: [7, 15], fric: 1.04, e: 0.97, keep: 0.98, fog: 0.75 },
    lluvia: { name: 'Lluvia', wind: [10, 18], fric: 1.45, e: 0.62, keep: 0.75, fog: 0.6 },
    granizo: { name: 'Granizo', wind: [12, 22], fric: 0.86, e: 1.1, keep: 1.07, fog: 0.7 }, // suelo duro: bota y rueda más
  };
  const BOING = 1.12, GREEN_SLOPE = 5 / 7; // 7.3 (F4): rodadura real (esfera que rueda); antes 0,55 y la bola se paraba en caídas fuertes // en el green la caída cuenta algo más de la mitad: se lee, pero no manda // cuánto botan las superficies (1 = antes de v16)
  const G = 9.81, DRAG = 0.0042, LIFT = 0.0019;
  const W = { kind: 'sol', kmh: 0, dir: 0, x: 0, z: 0 };
  function setWeather(kind) {
    let k = kind; if (!k) { const all = ['sol', 'sol', 'viento', 'nublado', 'lluvia', 'granizo'].filter((q) => q !== W.kind); k = all[Math.floor(Math.random() * all.length)]; } const d = WEATHERS[k];
    W.kind = k; W.kmh = Math.round(d.wind[0] + Math.random() * (d.wind[1] - d.wind[0])); W.dir = Math.random() * Math.PI * 2;
    W.x = (Math.cos(W.dir) * W.kmh) / 3.6; W.z = (Math.sin(W.dir) * W.kmh) / 3.6;
  }
  function airStep(b, dt) {
    const wk = b.noWind ? 0 : 1.4, rvx = b.vx - W.x * wk, rvz = b.vz - W.z * wk, v = Math.hypot(rvx, b.vy, rvz); // el viento pesa (×1,4 sobre el modelo base)
    b.vx += -DRAG * v * rvx * dt; b.vz += -DRAG * v * rvz * dt;
    b.vy += (-G - DRAG * v * b.vy + LIFT * b.spin * v * v * 0.5) * dt;
    if (b.side) { const hv = Math.hypot(b.vx, b.vz) || 1, a = b.side * 0.06 * hv; const ux = b.vx / hv, uz = b.vz / hv; b.vx += -uz * a * dt; b.vz += ux * a * dt; b.side *= Math.exp(-0.25 * dt); }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.spin *= Math.exp(-0.25 * dt);
  }
  (function calib() {
    for (const c of CLUBS) {
      if (!c.carry) { c.v = 7; continue; }
      let lo = 10, hi = 100;
      for (let k = 0; k < 32; k++) { const m = (lo + hi) / 2, a = (c.deg * Math.PI) / 180, b = { x: 0, y: 0, z: 0, vx: 0, vy: m * Math.sin(a), vz: -m * Math.cos(a), spin: c.spin }; for (let i = 0; i < 4000; i++) { airStep(b, 1 / 120); if (b.y < 0 && i > 5) break; } if (-b.z < c.carry) lo = m; else hi = m; }
      c.v = (lo + hi) / 2;
    }
  })();
  /* ------------------------------------------------------------------ 4. estado y física de la bola */
  const st = { phase: 'intro', t: 0, strokes: 0, club: 4, yaw: 0, b: null, last: null, msg: '', msgT: 0, path: [], sinkT: 0, burst: [], swing: null, landed: false };
  function resetBall(p) { st.b = { x: p.x, y: h(p.x, p.z), z: p.z, vx: 0, vy: 0, vz: 0, spin: 0, spin0: 0, mode: 'rest', bounces: 0, over: false, zc: 0, vzc: 0, sunk: false }; st.landed = false; }
  const cupD = () => Math.hypot(HOLE.cup.x - st.b.x, HOLE.cup.z - st.b.z);
  const lie = () => surf(st.b.x, st.b.z);
  function yawToCup() { st.yaw = Math.atan2(-(HOLE.cup.x - st.b.x), -(HOLE.cup.z - st.b.z)); }
  function pickClub() {
    const d = cupD(), s = lie(); if (s === 'green' || (s === 'ante' && d < 14)) return 6;
    let best = 0; for (let i = 0; i < 6; i++) if (CLUBS[i].carry * (SURF[s].lie || 1) >= d * 0.97) best = i; return best; // si ninguno llega, el driver
  }
  // PUTT: apuntas a un punto (antes del hoyo, al hoyo o pasado) y la bola sale con la velocidad justa para pararse a esa distancia
  // con la pendiente de verdad; la caída lateral la curva, y la fuerza de tu gesto la cambia un poco.
  function rollSim(v0, yaw, fine) { const Wk = WEATHERS[W.kind], dt = fine ? 1 / 240 : 1 / 120; let x = st.b.x, z = st.b.z, vx = -Math.sin(yaw) * v0, vz = -Math.cos(yaw) * v0; const pts = [{ x, z }];
    for (let i = 0; i < (fine ? 9600 : 4800); i++) { const s = surf(x, z); if (s === 'sea' || s === 'ob') break; const f = SURF[s].f * Wk.fric, n = normalAt(x, z), gk = GREEN_SLOPE, ax = G * n.x * n.y * gk, az = G * n.z * n.y * gk, sp = Math.hypot(vx, vz);
      vx += ax * dt; vz += az * dt; if (sp > 1e-4) { const fr = Math.min(sp, f * dt); vx -= (vx / sp) * fr; vz -= (vz / sp) * fr; } x += vx * dt; z += vz * dt; if (i % (fine ? 10 : 5) === 0) pts.push({ x, z }); if (Math.hypot(vx, vz) < 0.03 && Math.hypot(ax, az) < f) break; }
    pts.push({ x, z }); return pts; }
  function puttSpeed(D, yaw, fine) {
    const key = [st.b.x.toFixed(3), st.b.z.toFixed(3), yaw.toFixed(4), D.toFixed(3), W.kind, fine ? 1 : 0].join(); if (st.psK === key) return st.psV;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw); let lo = 0.03, hi = 14;
    for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2, e = rollSim(m, yaw, fine), q = e[e.length - 1], dd = (q.x - st.b.x) * fx + (q.z - st.b.z) * fz; if (dd < D) lo = m; else hi = m; }
    st.psK = key; st.psV = (lo + hi) / 2; return st.psV; }
  // 7.3 (Jose): el putt va recto por la línea que marcas y se para justo donde marca la carga (haya caídas o no).
  // Si lo clavas, va justo ahí; si el dedo se tuerce o vas fuerte/flojo, se va un poco por ese lado (es sensible).
  const puttDec = () => Math.max(0.3, SURF.green.f * WEATHERS[W.kind].fric);
  function puttLine(L, yaw) { const b = st.b, ux = -Math.sin(yaw), uz = -Math.cos(yaw), n = Math.max(2, Math.ceil(L / 0.25)), pts = []; for (let i = 0; i <= n; i++) pts.push({ x: b.x + ux * (L * i) / n, z: b.z + uz * (L * i) / n }); return pts; }
  const puttMax = () => Math.max(3, Math.min(40, cupD() * 1.6 + 1));
  function shotVel(power, acc, yawExtra) {
    const c = CLUBS[st.club], s = lie();
    if (c.id === 'putt') { const P = st.puttShot || { L: puttMax() * Math.max(0, power), yaw: st.yaw }, v = Math.sqrt(2 * puttDec() * P.L); return { vx: -Math.sin(P.yaw) * v, vz: -Math.cos(P.yaw) * v, vy: 0 }; } // 7.3: putt por la línea marcada, distancia exacta
    const lieK = c.id === 'wedge' && s === 'sand' ? 0.8 : SURF[s].lie, v = c.v * Math.sqrt(Math.max(0, s === 'sand' ? 0.2 + 0.8 * power : power)) * lieK, a = ((c.id === 'wedge' && s === 'sand' ? 60 : c.deg) * Math.PI) / 180, yaw = st.yaw + acc * 0.32 + (yawExtra || 0);
    return { vx: -Math.sin(yaw) * v * Math.cos(a), vz: -Math.cos(yaw) * v * Math.cos(a), vy: v * Math.sin(a) };
  }
  const sideOf = (ex) => ex * ({ driver: 1, wood: 0.9, i5: 0.7, i7: 0.55, i9: 0.4, wedge: 0.22, putt: 0 }[CLUBS[st.club].id]) * 1.2;
  function launch(power, acc, tempo) {
    const c = CLUBS[st.club], b = st.b, s = lie(), jitter = s === 'rough' ? (Math.random() - 0.5) * 0.06 : s === 'sand' ? (Math.random() - 0.5) * 0.05 : 0;
    { const tz0 = tempo || 0; st.puttEx = c.id === 'putt' ? Math.sign(tz0) * Math.max(0, Math.abs(tz0) - 0.3) : 0; }
    const v = shotVel(power, acc, jitter); b.vx = v.vx; b.vy = v.vy; b.vz = v.vz;
    b.spin = b.spin0 = c.spin * (1 - Math.min(0.5, Math.abs(acc) * 2));
    b.bspin = b.spin0 * (0.12 + 0.88 * Math.pow(Math.min(1, power), 1.5)) * (s === 'rough' ? 0.55 : s === 'sand' ? (c.id === 'wedge' ? 0.85 : 0.6) : 1); // efecto al botar: golpes cortos y desde el rough frenan menos
    st.lastDry = { x: b.x, z: b.z }; st.dryK = 0; st.dropAt = null;
    // ritmo: muy rápido = slice (se curva a la derecha), muy lento = gancho (a la izquierda). Más con driver, casi nada con wedge.
    const tz = tempo || 0, ex = Math.sign(tz) * Math.max(0, Math.abs(tz) - 0.3);
    b.side = sideOf(ex);
    if (false && c.id === 'putt' && ex) { const yaw = 0.025 * ex, cs = Math.cos(yaw), sn = Math.sin(yaw), vx = b.vx; b.vx = vx * cs - b.vz * sn; b.vz = vx * sn + b.vz * cs; } // putt: se abre o se cierra
    b.mode = c.id === 'putt' ? 'putt' : 'air'; if (b.mode === 'air') b.y += 0.01;
    if (b.mode === 'putt') { const P = st.puttShot || { L: puttMax() * Math.max(0, power), yaw: st.yaw }; b.pt = { x0: b.x, z0: b.z, ux: -Math.sin(P.yaw), uz: -Math.cos(P.yaw), L: P.L, s: 0, v: Math.sqrt(2 * puttDec() * P.L), a: puttDec() }; st.puttShot = null; }
    st.flyT = 0; st.landP = null; st.tvCut = false;
    if (b.mode === 'air') { const q = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, spin: b.spin, side: b.side, noWind: b.noWind }; for (let i = 0; i < 2400; i++) { airStep(q, 1 / 120); if (i > 4 && q.y <= h(q.x, q.z)) break; }
      const dx = q.x - b.x, dz = q.z - b.z, d = Math.hypot(dx, dz) || 1; st.landP = { x: q.x, z: q.z, y: h(q.x, q.z), ux: dx / d, uz: dz / d, d }; }
    st.last = { x: b.x, z: b.z }; st.ru = null; st.strokes++; st.path = []; b.bounces = 0; st.landed = false; st.y0 = b.y;
    SND.club(c.id, s, power, st.hitQ == null ? 0.8 : st.hitQ); st.hitQ = null;
    st.phase = 'flight';
  }
  function normalAt(x, z) { const e = 0.2, dx = h(x + e, z) - h(x - e, z), dz = h(x, z + e) - h(x, z - e); return new THREE.Vector3(-dx, 2 * e, -dz).normalize(); }
  function physics(dt) {
    const b = st.b; if (!b || b.sunk || b.mode === 'rest') return;
    const Wk = WEATHERS[W.kind];
    if (b.mode === 'air') {
      airStep(b, dt);
      treeHit(b, dt); bldHit(b);
      if ((st.dryK = (st.dryK || 0) + 1) % 6 === 0 && surf(b.x, b.z) !== 'sea') st.lastDry = { x: b.x, z: b.z };
      const gy = h(b.x, b.z);
      if (OCN() && gy < HOLE.ocean.y && b.y <= HOLE.ocean.y && surf(b.x, b.z) === 'sea') return water('sea'); // el mar (Pebble y los acantilados): salpica en la superficie, no en el fondo
      if (b.y <= gy) {
        const s = surf(b.x, b.z); if (s === 'sea' || s === 'ob') return water(s);
        b.y = gy; const n = normalAt(b.x, b.z), v = new THREE.Vector3(b.vx, b.vy, b.vz), vn = v.dot(n), vt = v.clone().sub(n.clone().multiplyScalar(vn)), P = SURF[s];
        const sp0 = Math.min(1.3, b.bspin != null ? b.bspin : b.spin0 || 0), first = b.bounces === 0;
        // los botes flojos (golpes cortos) rebotan proporcionalmente más, como una bola de verdad; los botes siguientes conservan casi toda la velocidad hacia delante
        const soft = 1 + 0.35 * Math.max(0, 1 - Math.abs(vn) / 14);
        const keep = first ? P.keep * Wk.keep * 0.8 * Math.max(0.12, 1 - (s === 'green' || s === 'ante' ? 0.85 : 0.55) * sp0) : Math.min(0.97, (0.25 + P.keep * 0.6) * Wk.keep);
        const e = Math.min(0.75, P.e * Wk.e * BOING * soft * (first ? 1.2 - 0.5 * Math.min(1.3, sp0) : 1.05)); // con mucho efecto (wedge) bota poco; el driver bota más
        if (first) { const ang = Math.atan2(-vn, Math.max(0.1, vt.length())); vt.multiplyScalar(Math.max(0.55, Math.min(1.2, 1.45 - ang * 0.75))); }
        vt.multiplyScalar(keep); const out = vt.add(n.clone().multiplyScalar(-vn * e));
        b.vx = out.x; b.vy = out.y; b.vz = out.z; b.spin *= 0.3; b.bounces++;
        if (first) { st.landed = true; SND.land(s, -vn); if (s === 'sand') say(T('¡Al búnker!')); } else if (-vn > 1.6) SND.land(s, -vn * 0.6);
        if (Math.abs(out.y) < 0.45 || (s === 'sand' && n.y > 0.8)) { b.mode = 'roll'; b.vy = 0; b.skidT = 0.45; }
      }
      st.path.push({ x: b.x, y: b.y, z: b.z });
    } else if (b.mode === 'putt') { // 7.3: putt por la línea marcada; frena siempre igual y se para donde marcaba
      const P = b.pt; P.v = Math.max(0, P.v - P.a * dt); P.s = Math.min(P.L, P.s + P.v * dt);
      b.x = P.x0 + P.ux * P.s; b.z = P.z0 + P.uz * P.s; b.vx = P.ux * P.v; b.vz = P.uz * P.v; b.y = h(b.x, b.z); st.landed = true; st.lastDry = { x: b.x, z: b.z };
      const s = surf(b.x, b.z); if (s === 'sea' || s === 'ob') return water(s);
      if (s !== 'green' && s !== 'ante' && s !== 'fair' && s !== 'tee') { b.mode = 'roll'; b.skidT = 0; return; } // sale del green: sigue rodando normal
      const c = HOLE.cup, d = Math.hypot(b.x - c.x, b.z - c.z);
      if (d < CUP_R * 0.92 && P.v < 1.5) return sink(); // entra (si no va disparada)
      if (P.v <= 0 || P.s >= P.L) { if (d < CUP_R + 0.012) return sink(); b.vx = b.vz = 0; b.mode = 'rest'; afterShot(); }
    } else if (b.mode === 'roll') {
      const s = surf(b.x, b.z); if (s === 'sea' || s === 'ob') return water(s);
      if (b.skidT > 0) b.skidT -= dt;
      const P = SURF[s], f = P.f * Wk.fric + (b.skidT > 0 ? (P.skid || 0) * Wk.fric : 0), n = normalAt(b.x, b.z), gk = GREEN_SLOPE, ax = G * n.x * n.y * gk, az = G * n.z * n.y * gk, sp = Math.hypot(b.vx, b.vz);
      b.vx += ax * dt; b.vz += az * dt;
      if (sp > 1e-4) { const fr = Math.min(sp, f * dt); b.vx -= (b.vx / sp) * fr; b.vz -= (b.vz / sp) * fr; }
      b.x += b.vx * dt; b.z += b.vz * dt; bldHit(b); b.y = h(b.x, b.z); st.landed = true; st.lastDry = { x: b.x, z: b.z };
      cupCheck(b, dt);
      const sp2 = Math.hypot(b.vx, b.vz);
      b.slowT = sp2 < 0.15 ? (b.slowT || 0) + dt : 0; // en un hoyito o un talud la bola podía quedarse balanceándose sin parar
      if (!b.sunk && !b.over && ((sp2 < 0.03 && Math.hypot(ax, az) < f) || b.slowT > 1.5)) { b.vx = b.vz = 0; b.mode = 'rest'; afterShot(); }
    }
  }
  function treeHit(b, dt) {
    if (!st.trees || !st.trees.length) return; st.treeCD = Math.max(0, (st.treeCD || 0) - dt); if (st.treeCD > 0) return;
    for (const t of st.trees) {
      const dx = b.x - t.x, dz = b.z - t.z; if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue; const gy = h(t.x, t.z), d = Math.hypot(dx, b.y - t.cy, dz);
      if (d < t.r) { const sp = Math.hypot(b.vx, b.vy, b.vz), k = 0.18 + Math.random() * 0.15, a = Math.random() * Math.PI * 2; // hojas y ramas: frena mucho y sale hacia cualquier lado
        b.vx = b.vx * k + Math.cos(a) * sp * 0.08; b.vz = b.vz * k + Math.sin(a) * sp * 0.08; b.vy = Math.min(b.vy * k, 0); b.spin *= 0.3; b.side = 0; st.treeCD = 0.35; say(T('¡Al árbol!')); SND.leaf(); return; }
      const hd = Math.hypot(dx, dz); if (hd < t.trunk && b.y < t.cy - t.r * 0.5 && b.y > gy) { const nx = dx / (hd || 1), nz = dz / (hd || 1), vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= 1.5 * vn * nx; b.vz -= 1.5 * vn * nz; b.vx *= 0.5; b.vz *= 0.5; st.treeCD = 0.2; SND.land('rough', 3); } return; }
    }
  }
  // edificios: la bola rebota en las paredes (y en el tejado)
  function bldHit(b) {
    if (!st.blds || !st.blds.length) return; st.bldCD = Math.max(0, (st.bldCD || 0) - 1 / 240); if (st.bldCD > 0) return;
    for (const B of st.blds) { const dx = b.x - B.x, dz = b.z - B.z; if (Math.abs(dx) > B.r || Math.abs(dz) > B.r) continue;
      const c = Math.cos(B.rot), sn2 = Math.sin(B.rot), lx = dx * c - dz * sn2, lz = dx * sn2 + dz * c, rr = BALL_R;
      if (Math.abs(lx) > B.hw + rr || Math.abs(lz) > B.hd + rr || b.y > B.top || b.y < B.y0 - 1) continue;
      let nlx = 0, nlz = 0, ny = 0; if (b.y > B.wall && b.vy < 0) ny = 1; else if (B.hw - Math.abs(lx) < B.hd - Math.abs(lz)) nlx = Math.sign(lx) || 1; else nlz = Math.sign(lz) || 1;
      const nx = nlx * c + nlz * sn2, nz = -nlx * sn2 + nlz * c, vn = b.vx * nx + b.vy * ny + b.vz * nz; if (vn >= 0) continue;
      b.vx -= 1.4 * vn * nx; b.vy -= 1.4 * vn * ny; b.vz -= 1.4 * vn * nz; b.vx *= 0.6; b.vz *= 0.6; b.vy *= 0.6; b.spin *= 0.3; b.side = 0;
      if (nlx || nlz) { const ex = (nlx ? (B.hw + rr) * Math.sign(lx) : lx), ez = (nlz ? (B.hd + rr) * Math.sign(lz) : lz); b.x = B.x + ex * c + ez * sn2; b.z = B.z - ex * sn2 + ez * c; }
      if (b.mode === 'roll' && ny) b.mode = 'air'; st.bldCD = 0.15; say(T('¡Contra el edificio!')); SND.land('fair', 12); return; }
  }
  function cupCheck(b, dt) {
    const c = HOLE.cup, d = Math.hypot(b.x - c.x, b.z - c.z), sp = Math.hypot(b.vx, b.vz);
    // borde: si la bola cuelga sobre el hoyo (su centro a menos de media bola del borde), el borde la «tira» un poco hacia dentro;
    // según la velocidad, se cuela o da la vuelta y sale (corbata)
    if (d >= CUP_R && d < CUP_R + BALL_R * 0.6 && !b.over) { const k = 1 - (d - CUP_R) / (BALL_R * 0.6), nx = (c.x - b.x) / d, nz = (c.z - b.z) / d; b.vx += nx * 2.2 * k * dt; b.vz += nz * 2.2 * k * dt; }
    if (d < CUP_R) { if (!b.over) { b.over = true; b.zc = 0; b.vzc = 0; } b.vzc += G * dt; b.zc += b.vzc * dt; if (b.zc > BALL_R * 0.9) return sink(); }
    else if (b.over) {
      b.over = false;
      if (b.zc > BALL_R * 0.72) return sink();
      if (b.zc > BALL_R * 0.18) { // corbata: la bola rodea el borde y sale desviada y más lenta
        const nx = (b.x - c.x) / d, nz = (b.z - c.z) / d, tv = -b.vx * nz + b.vz * nx, rv = b.vx * nx + b.vz * nz, keep = 0.45 + Math.random() * 0.2;
        b.vx = (-nz * tv * 0.9 + nx * Math.max(0.04, rv * 0.3)) * keep; b.vz = (nx * tv * 0.9 + nz * Math.max(0.04, rv * 0.3)) * keep; st.lipN = (st.lipN || 0) + 1; say(T('¡Uy, corbata!')); SND.lip(); }
      b.zc = 0;
    } else if (d < CUP_R + 0.008 && sp < 0.06) return sink();
  }
  const resName = (k, d) => (k === 1 ? T('¡Hoyo en uno!') : d <= -3 ? T('¡Albatros!') : d === -2 ? T('¡Eagle!') : d === -1 ? T('¡Birdie!') : d === 0 ? T('¡Par!') : d === 1 ? T('Bogey') : d === 2 ? T('Doble bogey') : d === 3 ? T('Triple bogey') : TF('+{n} sobre el par', { n: d }));
  function sink() { const b = st.b; b.sunk = true; b.mode = 'rest'; b.sinkFrom = { x: b.x, z: b.z }; st.sinkT = 0; st.phase = 'sunk'; SND.sink(); makeBurst(); const k = st.strokes, d = k - HOLE.par; say(resName(k, d)); if (d <= 0) SND.clap(d < 0 ? 1 : 0.4); }
  function water(s) {
    const b = st.b; say(T(s === 'ob' ? '¡Fuera de límites! +1 golpe' : '¡Al agua! +1 golpe'));
    if (s === 'ob') SND.water(); else { SND.splash(); const parts = []; for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.8; parts.push({ vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: 2.2 + Math.random() * 3 }); } st.splash = { x: b.x, y: h(b.x, b.z), z: b.z, t: performance.now(), parts }; }
    st.dropAt = s === 'ob' ? null : dropSpot(st.lastDry || st.last); // reglas: en el agua puedes repetir o dropar detrás, en la línea con el hoyo; fuera de límites, se repite
    st.strokes++; resetBall(st.last); yawToCup(); st.club = pickClub(); st.phase = 'splash'; st.splashT = 0;
  }
  function dropSpot(C) {
    let dx = C.x - HOLE.cup.x, dz = C.z - HOLE.cup.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const dry = (x, z) => { const s = surf(x, z); return s !== 'sea' && s !== 'ob' && s !== 'sand' && s !== 'beach'; };
    for (let t = 1.5; t < 60; t += 0.5) { const x = C.x + dx * t, z = C.z + dz * t; if (dry(x, z) && dry(x + 1.2, z) && dry(x - 1.2, z) && dry(x, z + 1.2) && dry(x, z - 1.2)) return { x, z }; }
    return null;
  }
  function afterWater(drop) { el.g3drop.style.display = 'none'; if (drop && st.dropAt) { resetBall(st.dropAt); say(T('Dropas junto al agua')); } yawToCup(); st.club = pickClub(); toAim(); }
  function afterShot() {
    const s = lie(), d = cupD();
    say(TF(`En ${SURF[s].name} · a {d}`, { d: fmtM(d) }));
    setTimeout(() => { if (st.phase === 'flight') { st.club = pickClub(); yawToCup(); toAim(); } }, 1100);
  }
  const fmtM = (d) => (d < 10 ? d.toFixed(1).replace('.', window.TQ_DEC || ',') : Math.round(d)) + ' m';
  function predict(p, ex) {
    const c = CLUBS[st.club], b0 = st.b, pts = [];
    if (c.id === 'putt') { const d = puttMax() * p; for (let k = 0; k <= 30; k++) { const t = k / 30, x = b0.x - Math.sin(st.yaw) * d * t, z = b0.z - Math.cos(st.yaw) * d * t; pts.push({ x, y: h(x, z) + 0.01, z }); } return pts; }
    const v = shotVel(p, 0), b = { x: b0.x, y: b0.y + 0.01, z: b0.z, vx: v.vx, vy: v.vy, vz: v.vz, spin: c.spin, noWind: true, side: ex ? sideOf(ex) : 0 }; // la previsión no cuenta el viento: eso lo lees tú
    for (let i = 0; i < 2400; i++) { airStep(b, 1 / 120); if (i % 4 === 0) pts.push({ x: b.x, y: b.y, z: b.z }); if (b.y < h(b.x, b.z) && i > 5) break; }
    pts.push({ x: b.x, y: h(b.x, b.z), z: b.z }); return pts;
  }
  /* ------------------------------------------------------------------ 5. dibujos (estilo Tiro con arco) */
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function rrect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function canvasTex(w, hh, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
  function sprite(draw, w, hh, scale) { const t = canvasTex(w, hh, draw); t.anisotropy = 4; const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); m.scale.set(scale, (scale * hh) / w, 1); m.center.set(0.5, 0); return m; }
  function starP(g, cx, cy, r, n, ri) { g.beginPath(); for (let k = 0; k < n * 2; k++) { const rr = k % 2 ? r * (ri || 0.42) : r, a = -Math.PI / 2 + (k * Math.PI) / n; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); }
  function ujack(g, w, hh) { // bandera de la Unión (cantón de Australia, Nueva Zelanda y Bermudas)
    g.save(); g.beginPath(); g.rect(0, 0, w, hh); g.clip(); g.fillStyle = '#012169'; g.fillRect(0, 0, w, hh);
    g.strokeStyle = '#FFFFFF'; g.lineWidth = hh * 0.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, hh); g.moveTo(w, 0); g.lineTo(0, hh); g.stroke();
    g.strokeStyle = '#C8102E'; g.lineWidth = hh * 0.067; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, hh / 2); g.moveTo(w, hh); g.lineTo(w / 2, hh / 2); g.stroke(); g.save(); g.translate(hh * 0.03, 0); g.beginPath(); g.moveTo(w, 0); g.lineTo(w / 2, hh / 2); g.moveTo(0, hh); g.lineTo(w / 2, hh / 2); g.restore(); g.stroke();
    g.fillStyle = '#FFFFFF'; g.fillRect(w / 2 - hh * 0.17, 0, hh * 0.34, hh); g.fillRect(0, hh / 2 - hh * 0.17, w, hh * 0.34);
    g.fillStyle = '#C8102E'; g.fillRect(w / 2 - hh * 0.1, 0, hh * 0.2, hh); g.fillRect(0, hh / 2 - hh * 0.1, w, hh * 0.2); g.restore(); }
  function flagDraw(c) { return (g, w, hh) => { // bandera del país del hoyo
    if (c === 'fr') { ['#0055A4', '#FFFFFF', '#EF4135'].forEach((k, i) => { g.fillStyle = k; g.fillRect((i * w) / 3, 0, w / 3 + 1, hh); }); return; }
    if (c === 'jp') { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, hh); g.fillStyle = '#BC002D'; g.beginPath(); g.arc(w / 2, hh / 2, hh * 0.3, 0, 7); g.fill(); return; }
    if (c === 'do') { const cw = hh * 0.16; g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, hh); [['#002D62', 0, 0], ['#CE1126', 1, 0], ['#CE1126', 0, 1], ['#002D62', 1, 1]].forEach(([k, i, j]) => { g.fillStyle = k; g.fillRect(i ? w / 2 + cw / 2 : 0, j ? hh / 2 + cw / 2 : 0, w / 2 - cw / 2, hh / 2 - cw / 2); });
      g.fillStyle = '#2E7D46'; g.beginPath(); g.arc(w / 2, hh / 2, hh * 0.1, 0, 7); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(w / 2, hh / 2, hh * 0.06, 0, 7); g.fill(); return; } // escudo (simplificado)
    if (c === 'au' || c === 'nz' || c === 'bm') { g.fillStyle = c === 'bm' ? '#CF142B' : '#012169'; g.fillRect(0, 0, w, hh); g.save(); ujack(g, w / 2, hh / 2); g.restore();
      if (c === 'au') { g.fillStyle = '#FFFFFF'; starP(g, w / 4, hh * 0.75, hh * 0.13, 7, 0.45); g.fill(); for (const [x, y, r] of [[0.75, 0.83, 0.065], [0.6, 0.45, 0.06], [0.75, 0.2, 0.06], [0.88, 0.4, 0.06], [0.81, 0.56, 0.035]]) { starP(g, w * x, hh * y, hh * r, x === 0.81 ? 5 : 7, 0.45); g.fill(); } }
      if (c === 'nz') for (const [x, y, r] of [[0.75, 0.82, 0.075], [0.63, 0.47, 0.065], [0.75, 0.2, 0.06], [0.86, 0.42, 0.055]]) { g.fillStyle = '#FFFFFF'; starP(g, w * x, hh * y, hh * r * 1.35, 5, 0.42); g.fill(); g.fillStyle = '#C8102E'; starP(g, w * x, hh * y, hh * r, 5, 0.42); g.fill(); }
      if (c === 'bm') { const x = w * 0.75, y = hh * 0.5, sw = hh * 0.36; g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(x - sw / 2, y - sw * 0.6); g.lineTo(x + sw / 2, y - sw * 0.6); g.lineTo(x + sw / 2, y + sw * 0.1); g.quadraticCurveTo(x + sw / 2, y + sw * 0.55, x, y + sw * 0.7); g.quadraticCurveTo(x - sw / 2, y + sw * 0.55, x - sw / 2, y + sw * 0.1); g.closePath(); g.fill();
        g.fillStyle = '#2E7FB8'; g.fillRect(x - sw / 2 + 2, y + sw * 0.12, sw - 4, sw * 0.2); g.fillStyle = '#8A5A34'; g.fillRect(x - sw * 0.2, y - sw * 0.2, sw * 0.4, sw * 0.3); g.fillStyle = '#FFFFFF'; g.fillRect(x - 1, y - sw * 0.5, 2, sw * 0.32); } // escudo con el barco (simplificado)
      return; }
    if (c === 'es') { g.fillStyle = '#C60B1E'; g.fillRect(0, 0, w, hh); g.fillStyle = '#FFC400'; g.fillRect(0, hh / 4, w, hh / 2); return; }
    if (c === 'sco') { g.fillStyle = '#005EB8'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#FFFFFF'; g.lineWidth = hh * 0.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, hh); g.moveTo(w, 0); g.lineTo(0, hh); g.stroke(); return; }
    if (c === 'us') { for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : '#B22234'; g.fillRect(0, (i * hh) / 7, w, hh / 7 + 1); } g.fillStyle = '#3C3B6E'; g.fillRect(0, 0, w * 0.42, hh * 0.57); g.fillStyle = '#FFFFFF'; for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w * 0.05 + i * w * 0.08 + (j % 2) * w * 0.04, hh * 0.08 + j * hh * 0.13, 1.8, 0, 7); g.fill(); } return; }
    g.fillStyle = '#FF5A6E'; g.fillRect(0, 0, w, hh); }; }
  function tuftDraw(g, w, hh) { g.strokeStyle = '#3FA557'; g.lineCap = 'round'; g.lineWidth = 5; for (const o of [-0.35, 0, 0.35]) { const bx = w / 2 + o * w * 0.5; g.beginPath(); g.moveTo(bx, hh); g.quadraticCurveTo(bx + o * w * 0.25, hh * 0.45, bx + o * w * 0.5, hh * (0.08 + Math.abs(o) * 0.35)); g.stroke(); } }
  function flowerDraw(c) { return (g, w, hh) => { g.strokeStyle = '#3FA557'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, hh); g.lineTo(w / 2, hh * 0.45); g.stroke(); g.fillStyle = c; for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(w / 2 + Math.cos(a * 1.256) * 6, hh * 0.35 + Math.sin(a * 1.256) * 6, 5, 0, 7); g.fill(); } g.fillStyle = '#FFC247'; g.beginPath(); g.arc(w / 2, hh * 0.35, 4, 0, 7); g.fill(); }; }
  function cloudDraw(g, w, hh) {
    const k = w / 100, x = w / 2, y = hh * 0.55;
    const puffs = (dy) => { rrect(g, x - 40 * k, y + (4 + dy) * k, 80 * k, 20 * k, 10 * k); g.moveTo(x - 7 * k, y + (6 + dy) * k); g.arc(x - 24 * k, y + (6 + dy) * k, 17 * k, 0, 7); g.moveTo(x + 24 * k, y + (6 + dy) * k); g.arc(x, y + (-4 + dy) * k, 24 * k, 0, 7); g.moveTo(x + 40 * k, y + (6 + dy) * k); g.arc(x + 24 * k, y + (6 + dy) * k, 16 * k, 0, 7); g.moveTo(x + 22 * k, y + (-8 + dy) * k); g.arc(x + 10 * k, y + (-12 + dy) * k, 14 * k, 0, 7); };
    puffs(4); g.fillStyle = '#D9E6F2'; g.fill(); puffs(0); g.fillStyle = '#FFFFFF'; g.fill();
  }
  /* ------------------------------------------------------------------ 6. escena: suelo con shader (nítido a cualquier distancia) */
  let R, S, cam, ball, ballShadow, flagPin, flagMesh, sunLight, groundMat, seaMat, host;
  const VS = 'varying vec3 vW; varying vec3 vN; varying float vD;\n void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }';
  const FS = `precision highp float;
    varying vec3 vW; varying vec3 vN; varying float vD;
    uniform vec4 uGreen; uniform vec2 uTilt; uniform vec4 uBk[6]; uniform vec2 uTee; uniform float uSeaZ; uniform vec2 uCup; uniform float uTime; uniform vec4 uGB[3]; uniform vec3 uFw[6]; uniform float uFwN; uniform vec2 uBurn; uniform float uOB; uniform float uOBL; uniform vec4 uLk[3]; uniform vec4 uIs; uniform vec3 uRv[7]; uniform float uRvN;
    uniform sampler2D uRough; uniform sampler2D uSand; uniform sampler2D uSlopeTex; uniform sampler2D uGN; uniform vec4 uGNBox; uniform vec4 uSlopeBox; uniform float uSlopeOn; uniform vec4 uCliff; uniform vec3 uRock; uniform float uDry; uniform vec3 uFog; uniform float uFogN; uniform float uFogF; uniform vec3 uSun; uniform float uWet; uniform float uHail;
    float bkR(vec4 b, float a){ float s = b.x*0.37 + b.y*0.91; return 1.0 + 0.12*sin(2.0*a+s) + 0.08*sin(3.0*a+s*1.7) + 0.05*sin(5.0*a+s*0.6); }
    float bkD(vec4 b, vec2 p){ vec2 d = (p - b.xy) / b.zw; return length(d) / bkR(b, atan(d.y, d.x)); }
    float hs(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); } // 7.3: sin sin() (en móviles dibujaba cuadros)
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hs(i), hs(i+vec2(1.0,0.0)), f.x), mix(hs(i+vec2(0.0,1.0)), hs(i+vec2(1.0,1.0)), f.x), f.y); }
    float fbm(vec2 p){ return vn(p)*0.55 + vn(p*2.07+3.1)*0.3 + vn(p*4.13+7.7)*0.15; }
    void main(){
      vec2 p = vW.xz; float aa = max(fwidth(p.x), fwidth(p.y)) * 1.2; float far = smoothstep(25.0, 140.0, vD);
      vec4 rt = texture2D(uRough, p / 3.5);
      float m1 = fbm(p / 22.0), m2 = fbm(p / 6.0 + 11.0);
      // hierba alta: verde con manchas grandes (más oscura y más amarilla a trozos) y matas
      vec3 col = mix(vec3(0.33,0.70,0.36), vec3(0.47,0.80,0.40), m1);
      col = mix(col, vec3(0.56,0.78,0.38), smoothstep(0.62, 0.9, m2) * 0.45);
      col = mix(col, vec3(0.24,0.58,0.30), rt.r * 0.55 * (1.0 - far));
      col = mix(col, vec3(0.55,0.86,0.55), rt.g * 0.4 * (1.0 - far));
      col = mix(col, mix(vec3(0.74,0.68,0.36), vec3(0.84,0.76,0.44), m2) * (0.86 + 0.2 * m1), uDry * (0.7 + 0.3 * m1)); // hierba seca y dorada (tussock)
      vec2 tq = abs(p - uTee) - vec2(3.5, 4.5);
      float teeIn = 1.0 - smoothstep(-aa, aa, max(tq.x, tq.y));
      // calle: franjas de corte anchas en los dos sentidos (cuadros suaves) y algo de variación
      float sw = clamp(fwidth(p.y) / 2.6, 0.01, 0.5); float stripe = smoothstep(0.5 - sw, 0.5 + sw, fract(p.y / 2.6)) * (1.0 - far * 0.85);
      vec3 fair = mix(vec3(0.53,0.89,0.55), vec3(0.47,0.85,0.51), stripe);
      vec2 gd = (p - uGreen.xy) / (uGreen.zw + 3.0); float gdl = length(gd); float ante = 1.0 - smoothstep(1.0 - aa*0.06, 1.0 + aa*0.06, gdl);
      float fd = 1e5; for (int i = 0; i < 5; i++) { if (float(i) >= uFwN - 1.0) break; vec3 A = uFw[i], B = uFw[i + 1]; vec2 v = B.xy - A.xy; float t = clamp(dot(p - A.xy, v) / dot(v, v), 0.0, 1.0); fd = min(fd, length(p - A.xy - v * t) - mix(A.z, B.z, t)); }
      float fwIn = 1.0 - smoothstep(-aa, aa, fd);
      col = mix(col, vec3(0.36,0.76,0.42), (1.0 - smoothstep(0.0, 1.6 + aa, fd)) * (1.0 - fwIn) * 0.75); // primer corte
      col = mix(col, fair, max(max(teeIn, ante), fwIn));
      vec2 gg = (p - uGreen.xy) / uGreen.zw; float gl = length(gg); float gin = 1.0 - smoothstep(1.0 - aa*0.06, 1.0 + aa*0.06, gl);
      float coll = (1.0 - smoothstep(1.0 + 1.0 / min(uGreen.z, uGreen.w) - aa*0.05, 1.0 + 1.0 / min(uGreen.z, uGreen.w) + aa*0.05, gl)) * (1.0 - gin);
      col = mix(col, vec3(0.48,0.86,0.50), coll); // collar del green
      vec3 greenC = vec3(0.60,0.92,0.58); // v8: green liso, sin rayas (las caídas se ven en el mapa)
      greenC *= 0.975 + 0.05 * vn((p - uGreen.xy) * 0.9); // coordenadas cercanas al green: sin pérdida de precisión
      col = mix(col, greenC, gin);
      if (uSlopeOn > 0.5) { // v8: caídas por colores sobre el propio green (se enciende y se apaga)
        vec2 suv = vec2((p.x - uSlopeBox.x) / (uSlopeBox.z - uSlopeBox.x), (p.y - uSlopeBox.y) / (uSlopeBox.w - uSlopeBox.y));
        vec4 sc = texture2D(uSlopeTex, suv); col = mix(col, sc.rgb, sc.a * 0.62 * gin * (1.0 - far)); }
      for (int i = 0; i < 6; i++) {
        float d = bkD(uBk[i], p);
        float lip = 1.0 - smoothstep(1.0, 1.09 + aa * 0.05, d);
        col = mix(col, vec3(0.27,0.62,0.34), lip * 0.85);
        float sIn = 1.0 - smoothstep(1.0 - aa*0.04, 1.0 + aa*0.04, d);
        vec3 sand = mix(vec3(0.95,0.88,0.70), vec3(0.99,0.94,0.80), texture2D(uSand, p/1.6).r);
        sand *= 0.95 + 0.05 * sin(dot(p - uBk[i].xy, vec2(0.8, 0.6)) * 9.0) * (1.0 - far); // rastrillado
        vec2 dir = normalize(p - uBk[i].xy + 1e-4);
        sand = mix(sand, vec3(0.80,0.71,0.52), smoothstep(0.7, 1.0, d) * (0.45 + 0.45 * max(dot(dir, -uSun.xz), 0.0))); // sombra del borde
        col = mix(col, sand, sIn);
      }
      float beach = (1.0 - smoothstep(-0.2, -0.1, vW.y)) * (1.0 - smoothstep(uSeaZ + 38.0, uSeaZ + 40.0, p.y));
      col = mix(col, mix(vec3(0.93,0.87,0.70), vec3(0.99,0.94,0.81), texture2D(uSand, p/2.5).r), beach);
      if (uSeaZ > -1e4) { float wet = smoothstep(-0.95, -0.72, vW.y) * (1.0 - smoothstep(-0.6, -0.45, vW.y)); col = mix(col, vec3(0.80,0.74,0.58), wet * 0.6 * beach);
        float fo = smoothstep(-0.74, -0.70, vW.y) * (1.0 - smoothstep(-0.66, -0.6 + 0.04 * sin(uTime * 0.9 + p.x * 0.2), vW.y)); col = mix(col, vec3(1.0), fo * 0.8 * beach); }
      { // fondo de lagos y ríos (el agua de verdad va encima, transparente) y orilla mojada
        float wd = 1e5; for (int i = 0; i < 3; i++) { if (uLk[i].z < 0.5) continue; vec2 d = (p - uLk[i].xy) / uLk[i].zw; wd = min(wd, (length(d) / bkR(vec4(uLk[i].xy, 1.0, 1.0), atan(d.y, d.x)) - 1.0) * min(uLk[i].z, uLk[i].w)); }
        if (uIs.z > 0.0) { float di = length((p - uIs.xy) / uIs.zw); if (di < 1.0) wd = max(wd, (1.0 - di) * min(uIs.z, uIs.w)); }
        for (int i = 0; i < 6; i++) { if (float(i) >= uRvN - 1.0) break; vec3 A = uRv[i], B = uRv[i + 1]; vec2 v = B.xy - A.xy; float t = clamp(dot(p - A.xy, v) / dot(v, v), 0.0, 1.0); wd = min(wd, length(p - A.xy - v * t) - mix(A.z, B.z, t)); }
        if (uBurn.y > 0.0) wd = min(wd, abs(p.y - uBurn.x) - uBurn.y * 0.5);
        float win = 1.0 - smoothstep(-aa, aa, wd + 0.6);
        col = mix(col, mix(vec3(0.42,0.46,0.30), vec3(0.62,0.58,0.44), vn(p * 0.8)), (1.0 - smoothstep(-0.6, 1.3 + aa, wd)) * 0.75); // orilla de barro y piedras
        col = mix(col, vec3(0.30,0.38,0.27), win);
        if (uIs.z > 0.0) { vec2 dq = (p - uIs.xy) / uIs.zw; float di = length(dq); float wood = step(1.0, di) * (1.0 - step(1.16, di)); // la isla de Sawgrass: muro de traviesas de madera
          vec3 wc = mix(vec3(0.42,0.30,0.20), vec3(0.52,0.38,0.25), step(0.5, fract(atan(dq.y, dq.x) * 40.0))) * (0.85 + 0.15 * vn(p * 3.0)); col = mix(col, wc, wood); }
      }
      if (uOBL > -1e4) { float od = abs(p.x - uOBL); col = mix(col, vec3(1.0), (1.0 - smoothstep(0.08, 0.08 + aa, od)) * step(fract(p.y / 6.0), 0.12)); }
      if (uOB > -1e4) { float od = abs(p.x - uOB); col = mix(col, vec3(1.0), (1.0 - smoothstep(0.08, 0.08 + aa, od)) * step(fract(p.y / 6.0), 0.12)); }
      if (uCliff.x > 0.5) { // acantilados: roca con estratos donde el suelo cae en picado, y rocas con espuma a la altura del mar
        float stp = 1.0 - normalize(vN).y, rk = smoothstep(0.2, 0.42, stp);
        vec3 rc = uRock * (0.84 + 0.22 * vn(p * 0.35)) * (0.9 + 0.12 * sin(vW.y * 2.6 + vn(p * 0.2) * 2.0));
        col = mix(col, rc, rk); col = mix(col, uRock * 0.72 * (0.85 + 0.3 * vn(p * 1.7)), 1.0 - smoothstep(uCliff.y + 0.3, uCliff.y + 1.4, vW.y)); }
      col = mix(col, vec3(0.93,0.96,1.0), uHail * smoothstep(0.55, 0.9, vn(p * 2.3)) * 0.35); // granizo en el suelo
      float dc = length(p - uCup);
      col = mix(col, vec3(1.0), 1.0 - smoothstep(0.062 - aa*0.3, 0.062 + aa*0.3, dc));
      col = mix(col, vec3(0.05,0.08,0.18), 1.0 - smoothstep(0.054 - aa*0.3, 0.054 + aa*0.3, dc));
      vec3 n = normalize(vN);
      { vec2 gu = (p - uGNBox.xy) / (uGNBox.zw - uGNBox.xy); float ge = smoothstep(0.0, 0.1, min(min(gu.x, 1.0 - gu.x), min(gu.y, 1.0 - gu.y)));
        if (ge > 0.0) { vec2 q = (texture2D(uGN, gu).rg * 2.0 - 1.0) * 0.25; vec3 ng = vec3(q.x, sqrt(max(0.0, 1.0 - dot(q, q))), q.y); n = normalize(mix(n, ng, ge)); } }
      float l = 0.74 + 0.38 * max(dot(n, uSun), 0.0);
      col *= l; col *= 1.0 - uWet * 0.14;
      gl_FragColor = vec4(mix(col, uFog, smoothstep(uFogN, uFogF, vD)), 1.0);
    }`;
  // agua de verdad: superficie con olas, reflejo del cielo según el ángulo (Fresnel), brillo del sol, color según la profundidad y espuma en la orilla
  const WVS = 'attribute float aDep; varying vec3 vW; varying float vDep; varying float vD;\n void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vDep = aDep; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }';
  const WFS = `precision highp float; varying vec3 vW; varying float vDep; varying float vD;
    uniform float uTime; uniform vec3 uSun; uniform vec3 uFog; uniform float uFogN; uniform float uFogF; uniform vec3 uSkyT; uniform vec3 uSkyL; uniform float uRain; uniform float uOcean;
    void main(){
      vec2 p = vW.xz; float k = mix(1.0, 0.45, uOcean), A = mix(1.0, 2.2, uOcean), hi = 1.0 - smoothstep(30.0, 140.0, vD);
      vec2 g = vec2(0.0); vec2 d; float f, ph;
      d = vec2(0.8, 0.6); f = 0.9 * k; ph = dot(p, d) * f + uTime * 1.3; g += 0.03 * A * f * cos(ph) * d;
      d = vec2(-0.5, 0.86); f = 1.7 * k; ph = dot(p, d) * f + uTime * 1.9; g += 0.018 * A * f * cos(ph) * d;
      d = vec2(0.2, -0.98); f = 3.3 * k; ph = dot(p, d) * f + uTime * 2.7; g += 0.009 * A * f * cos(ph) * d * hi;
      d = vec2(-0.9, -0.3); f = 6.1 * k; ph = dot(p, d) * f + uTime * 3.6; g += 0.004 * A * f * cos(ph) * d * hi;
      g += uRain * 0.05 * vec2(sin(p.x * 13.0 + uTime * 9.0), cos(p.y * 11.0 - uTime * 8.0)) * hi;
      vec3 N = normalize(vec3(-g.x, 1.0, -g.y)), V = normalize(cameraPosition - vW);
      float fr = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      vec3 R = reflect(-V, N), sky = mix(uSkyL, uSkyT, clamp(0.3 + R.y * 3.0, 0.0, 1.0));
      float dep = clamp(vDep / mix(0.9, 4.0, uOcean), 0.0, 1.0);
      vec3 body = mix(vec3(0.38,0.74,0.70), mix(vec3(0.09,0.40,0.56), vec3(0.07,0.33,0.60), uOcean), smoothstep(0.0, 1.0, dep));
      vec3 col = mix(body, sky, clamp(fr * 1.1, 0.0, mix(0.8, 0.5, uOcean)));
      float sd = max(dot(R, uSun), 0.0); col += vec3(1.0,0.97,0.88) * (pow(sd, 260.0) * 2.4 + pow(sd, 36.0) * 0.18) * (1.0 - uRain * 0.85);
      float foam = (1.0 - smoothstep(0.02, 0.13, vDep)) * (0.55 + 0.45 * sin(p.x * 3.0 + p.y * 2.3 + uTime * 2.0));
      col = mix(col, vec3(0.96,0.98,1.0), foam * 0.7);
      float a = max(uOcean * step(0.3, vDep), smoothstep(-0.01, 0.06, vDep) * mix(0.5, 0.95, smoothstep(0.0, 0.45, vDep)));
      gl_FragColor = vec4(mix(col, uFog, smoothstep(uFogN, mix(uFogF, min(uFogF * 1.5, 640.0), uOcean), vD)), a);
    }`;
  /* ------------------------------------------------------------------ 6b. modelos 3D (árboles, arbustos, rocas, edificios, puente, muros) y agua */
  const C3 = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const fr1 = (v) => v - Math.floor(v);
  const jc = (hex, a) => (i) => C3(hex).offsetHSL(0, 0, (fr1(Math.sin(i * 12.9898 + 4.1) * 43758.5453) - 0.5) * a);
  // une piezas en una sola geometría con color por vértice y caras planas (aspecto «low poly» cuidado)
  function mergeParts(parts) {
    const P = [], Cc = [], m = new THREE.Matrix4(), v = new THREE.Vector3(), c = new THREE.Color();
    for (const pt of parts) {
      const g = pt.g.index ? pt.g.toNonIndexed() : pt.g, pos = g.attributes.position;
      m.compose(new THREE.Vector3(...(pt.p || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(pt.r || [0, 0, 0]))), new THREE.Vector3(...(pt.s || [1, 1, 1])));
      for (let i = 0; i < pos.count; i += 3) { const col = typeof pt.c === 'function' ? pt.c(i / 3 + P.length) : pt.c; c.copy(col); for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, i + k).applyMatrix4(m); P.push(v.x, v.y, v.z); Cc.push(c.r, c.g, c.b); } }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); geo.computeVertexNormals(); return geo;
  }
  function blobGeo(r, det, amt, k) { const g = new THREE.IcosahedronGeometry(r, det), p = g.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const q = v.clone().divideScalar(r); v.multiplyScalar(1 + amt * Math.sin(q.x * 3.1 + k) * Math.sin(q.y * 2.7 + k * 1.3) * Math.sin(q.z * 3.3 + k * 0.7) * 2); p.setXYZ(i, v.x, v.y, v.z); } return g; }
  function frondGeo(n, L, droop, wid) { // hojas de palmera colgando (tiras de triángulos)
    const P = []; for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2 + j * 0.3, ca = Math.cos(a), sa = Math.sin(a), pt = (t, s) => { const r = L * t, w = wid * Math.sin(Math.PI * Math.min(1, t * 1.15)) * s; return [ca * r - sa * w, 0.35 * t - droop * t * t, sa * r + ca * w]; };
      for (let i = 0; i < 4; i++) { const t0 = i / 4, t1 = (i + 1) / 4, a0 = pt(t0, -1), b0 = pt(t0, 1), a1 = pt(t1, -1), b1 = pt(t1, 1), m0 = pt(t0, 0), m1 = pt(t1, 0); m0[1] += 0.06; m1[1] += 0.06; P.push(...a0, ...m0, ...a1, ...m0, ...m1, ...a1, ...m0, ...b0, ...m1, ...b0, ...b1, ...m1); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); return g; }
  // árboles y plantas: geometría + datos para el choque (altura del centro de la copa y radio), en metros a escala 1
  const KIT = {
    oak: { cy: 4.7, r: 2.7, mk: () => mergeParts([
      { g: new THREE.CylinderGeometry(0.22, 0.4, 3.6, 7), p: [0, 1.8, 0], c: jc('#8A5A34', 0.06) }, { g: new THREE.CylinderGeometry(0.09, 0.16, 1.8, 5), p: [0.6, 3.5, 0], r: [0, 0, -0.75], c: C3('#7A4E2C') }, { g: new THREE.CylinderGeometry(0.08, 0.14, 1.6, 5), p: [-0.5, 3.4, 0.2], r: [0.2, 0, 0.7], c: C3('#7A4E2C') },
      ...[[0, 4.8, 0, 2.3], [-1.6, 4.1, 0.4, 1.6], [1.6, 4.3, -0.3, 1.7], [0.2, 5.8, -0.5, 1.6], [0.3, 4.4, 1.5, 1.5], [-0.4, 4.6, -1.5, 1.5]].map(([x, y, z, r], j) => ({ g: blobGeo(r, 1, 0.09, j * 1.7), p: [x, y, z], s: [1, 0.86, 1], c: jc(j % 2 ? '#4FA055' : '#3E8B49', 0.1) }))]) },
    cork: { cy: 4.3, r: 3, mk: () => mergeParts([ // alcornoque: tronco pelado (naranja) abajo y copa ancha y oscura
      { g: new THREE.CylinderGeometry(0.3, 0.45, 2.2, 7), p: [0, 1.1, 0], c: C3('#B9622F') }, { g: new THREE.CylinderGeometry(0.22, 0.3, 1.6, 6), p: [0.3, 2.8, 0], r: [0, 0, -0.3], c: C3('#6E5440') }, { g: new THREE.CylinderGeometry(0.12, 0.2, 2.2, 5), p: [-0.9, 3.0, 0.2], r: [0.2, 0, 0.9], c: C3('#6E5440') },
      ...[[0.4, 4.4, 0, 2.4], [-1.9, 4.0, 0.5, 1.8], [2.2, 4.1, -0.4, 1.8], [0, 5.3, -0.8, 1.7], [0.1, 4.2, 1.7, 1.6]].map(([x, y, z, r], j) => ({ g: blobGeo(r, 1, 0.1, j * 2.3), p: [x, y, z], s: [1, 0.7, 1], c: jc(j % 2 ? '#3F7F44' : '#356F3B', 0.08) }))]) },
    pine: { cy: 7.4, r: 3.6, mk: () => mergeParts([ // pino piñonero: tronco alto y copa ancha y plana
      { g: new THREE.CylinderGeometry(0.2, 0.36, 7, 7), p: [0.3, 3.5, 0], r: [0, 0, -0.08], c: jc('#A0683C', 0.05) }, { g: new THREE.CylinderGeometry(0.1, 0.15, 2.2, 5), p: [-0.6, 6.4, 0], r: [0, 0, 0.9], c: C3('#8A5A34') }, { g: new THREE.CylinderGeometry(0.1, 0.15, 2.2, 5), p: [1.3, 6.5, 0.2], r: [0.1, 0, -0.9], c: C3('#8A5A34') },
      ...[[0, 7.6, 0, 2.6], [-2.2, 7.2, 0.4, 2], [2.4, 7.3, -0.3, 2.1], [0.4, 7.4, 2.0, 1.9], [-0.4, 7.3, -2.1, 1.9], [0.2, 8.2, 0, 1.8]].map(([x, y, z, r], j) => ({ g: blobGeo(r, 1, 0.1, j * 1.3), p: [x, y, z], s: [1, 0.42, 1], c: jc(j === 5 ? '#5DB26A' : j % 2 ? '#3F9450' : '#357F45', 0.08) }))]) },
    tallpine: { cy: 12, r: 2.2, mk: () => mergeParts([ // pino alto de Georgia: tronco larguísimo y copa arriba
      { g: new THREE.CylinderGeometry(0.16, 0.34, 14, 7), p: [0, 7, 0], c: jc('#8E5E36', 0.05) },
      ...[[0, 13.6, 0, 1.4], [0.9, 12.4, 0.2, 1.3], [-0.9, 11.6, -0.2, 1.3], [0.3, 10.6, 0.8, 1.2], [-0.2, 12.8, -0.9, 1.2], [0.6, 9.8, -0.6, 1.0]].map(([x, y, z, r], j) => ({ g: blobGeo(r, 1, 0.12, j * 2.1), p: [x, y, z], s: [1, 0.7, 1], c: jc(j % 2 ? '#2F7A44' : '#3A8C4F', 0.08) }))]) },
    palm: { cy: 8, r: 2.4, side: true, mk: () => { const parts = []; let x = 0, y = 0; for (let i = 0; i < 6; i++) { const nx = x + 0.12 * i * 0.25, ny = y + 1.45; parts.push({ g: new THREE.CylinderGeometry(0.2 - i * 0.012, 0.26 - i * 0.012, 1.5, 7), p: [(x + nx) / 2, (y + ny) / 2, 0], r: [0, 0, -0.06 * i], c: i % 2 ? C3('#A88454') : C3('#97764A') }); x = nx; y = ny; }
      parts.push({ g: frondGeo(11, 3.6, 2.2, 0.42), p: [x, y + 0.1, 0], c: jc('#3E9A4E', 0.12) }, { g: frondGeo(7, 2.6, 0.9, 0.36), p: [x, y + 0.35, 0], r: [0, 0.4, 0], c: jc('#5DB868', 0.1) }, { g: blobGeo(0.35, 0, 0, 0), p: [x, y, 0], c: C3('#7A5A30') }); return mergeParts(parts); } },
    cypress: { cy: 5.6, r: 3.6, mk: () => mergeParts([ // ciprés de Monterrey: copas planas, torcido por el viento del mar
      { g: new THREE.CylinderGeometry(0.22, 0.42, 4.2, 7), p: [-0.4, 2, 0], r: [0, 0, 0.25], c: C3('#7A5A3A') }, { g: new THREE.CylinderGeometry(0.12, 0.2, 3.2, 5), p: [0.8, 4.2, 0], r: [0, 0, -0.95], c: C3('#6E5034') },
      ...[[-1.4, 5.0, 0, 2.2], [1.3, 5.4, 0.3, 2.4], [3.3, 4.9, -0.2, 1.8], [0, 6.2, -0.4, 1.9], [0.6, 5.0, 1.6, 1.7]].map(([x, y, z, r], j) => ({ g: blobGeo(r, 1, 0.1, j * 1.9), p: [x, y, z], s: [1.15, 0.36, 1], c: jc(j % 2 ? '#2E6E45' : '#3B8456', 0.08) }))]) },
    gorse: { cy: 0.5, r: 1, mk: () => mergeParts([{ g: blobGeo(0.9, 1, 0.14, 1), p: [0, 0.45, 0], s: [1.35, 0.72, 1.1], c: (i) => (fr1(Math.sin(i * 7.31) * 9137.3) < 0.36 ? C3('#F4C534') : jc('#3E8A45', 0.1)(i)) }, { g: blobGeo(0.6, 1, 0.14, 3), p: [0.8, 0.35, 0.3], s: [1.2, 0.7, 1], c: (i) => (fr1(Math.sin(i * 3.7) * 7351.1) < 0.3 ? C3('#FFD84A') : jc('#4A9A50', 0.1)(i)) }]) },
    azalea: { cy: 0.7, r: 1.3, mk: () => mergeParts([{ g: blobGeo(1, 1, 0.12, 2), p: [0, 0.6, 0], s: [1.5, 0.75, 1.2], c: (i) => { const q = fr1(Math.sin(i * 5.17) * 4127.9); return C3(q < 0.42 ? '#F2559A' : q < 0.62 ? '#FF92C2' : q < 0.72 ? '#FFFFFF' : q < 0.82 ? '#E0457B' : '#3F8F4E'); } }, { g: blobGeo(0.7, 1, 0.12, 5), p: [1.1, 0.45, 0.3], s: [1.3, 0.75, 1.1], c: (i) => (fr1(Math.sin(i * 2.9) * 3131.7) < 0.6 ? C3('#FF7AB5') : C3('#44944F')) }]) },
    rock: { cy: 0.6, r: 1, mk: () => mergeParts([{ g: blobGeo(1, 1, 0.22, 4), p: [0, 0.35, 0], s: [1.4, 0.8, 1.1], c: jc('#8E8B84', 0.14) }, { g: blobGeo(0.6, 0, 0.2, 7), p: [1, 0.2, 0.5], c: jc('#7D7A74', 0.12) }]) },
    bush: { cy: 0.8, r: 1.2, mk: () => mergeParts([{ g: blobGeo(1, 1, 0.14, 6), p: [0, 0.7, 0], s: [1.3, 0.85, 1.2], c: jc('#3F8B48', 0.12) }]) },
    gum: { cy: 8.6, r: 3.2, mk: () => mergeParts([ // eucalipto australiano: tronco claro y liso, ramas abiertas y copa suelta verde grisácea
      { g: new THREE.CylinderGeometry(0.2, 0.38, 6.4, 7), p: [0, 3.2, 0], r: [0, 0, 0.05], c: (i) => C3(fr1(Math.sin(i * 3.3) * 917.1) < 0.3 ? '#C9B79C' : '#E6DFD2') },
      { g: new THREE.CylinderGeometry(0.1, 0.17, 3.6, 5), p: [-1.0, 7.0, 0.2], r: [0.15, 0, 0.6], c: C3('#DDD4C4') }, { g: new THREE.CylinderGeometry(0.1, 0.16, 3.4, 5), p: [1.1, 7.2, -0.2], r: [-0.1, 0, -0.55], c: C3('#DDD4C4') }, { g: new THREE.CylinderGeometry(0.08, 0.13, 2.6, 5), p: [0.2, 7.9, 0.6], r: [0.5, 0, 0], c: C3('#D3C9B6') },
      ...[[-2.0, 8.6, 0.4, 1.5], [2.1, 8.9, -0.4, 1.6], [0.3, 10.0, 0.9, 1.4], [-0.6, 9.4, -1.3, 1.3], [1.0, 8.0, 1.6, 1.1], [-1.4, 7.6, -0.6, 1.0]].map(([x, y, z, r], j) => ({ g: blobGeo(r, 1, 0.16, j * 2.7), p: [x, y, z], s: [1.15, 0.6, 1], c: jc(j % 2 ? '#7D9C79' : '#6A8B6C', 0.1) }))]) },
    cedar: { cy: 3.6, r: 1.7, mk: () => mergeParts([ // cedro de las Bermudas (enebro): cono oscuro y denso
      { g: new THREE.CylinderGeometry(0.14, 0.24, 1.6, 6), p: [0, 0.8, 0], c: C3('#6E4A30') },
      ...[[1.4, 1.8, 2.4], [1.15, 3.0, 2.2], [0.85, 4.1, 1.9], [0.5, 5.1, 1.5]].map(([r, y, hh], j) => ({ g: new THREE.ConeGeometry(r * 1.2, hh, 8), p: [0, y, 0], r: [0, j * 0.4, 0], c: jc(j % 2 ? '#2E5E3C' : '#386B44', 0.08) }))]) },
    jpine: { cy: 5.4, r: 3.2, mk: () => mergeParts([ // pino negro japonés (kuromatsu): tronco torcido y copas en «nubes» planas
      { g: new THREE.CylinderGeometry(0.2, 0.32, 3.4, 7), p: [0.4, 1.6, 0], r: [0, 0, -0.25], c: C3('#5A4434') }, { g: new THREE.CylinderGeometry(0.15, 0.2, 2.8, 6), p: [1.3, 4.1, 0.1], r: [0, 0, 0.35], c: C3('#5A4434') },
      { g: new THREE.CylinderGeometry(0.08, 0.12, 2.6, 5), p: [-0.4, 4.6, 0.3], r: [0.2, 0, 1.1], c: C3('#4E3B2E') }, { g: new THREE.CylinderGeometry(0.08, 0.12, 2.2, 5), p: [2.2, 4.9, -0.4], r: [-0.3, 0, -1.0], c: C3('#4E3B2E') },
      ...[[1.0, 5.9, 0, 1.8], [-1.6, 5.1, 0.6, 1.5], [2.9, 5.3, -0.7, 1.4], [0.6, 4.4, 1.6, 1.2], [1.6, 6.8, -0.2, 1.2], [-0.4, 3.9, -1.2, 1.0]].map(([x, y, z, r], j) => ({ g: blobGeo(r, 1, 0.1, j * 1.9), p: [x, y, z], s: [1.35, 0.34, 1.2], c: jc(j % 2 ? '#2D5A3A' : '#376A45', 0.08) }))]) },
    tussock: { cy: 0.4, r: 0.8, mk: () => { const parts = []; for (let k = 0; k < 14; k++) { const a = k * 2.4, t = (k % 5) / 5; parts.push({ g: new THREE.ConeGeometry(0.09, 1.1 + t * 0.5, 4), p: [Math.cos(a) * 0.22, 0.5 + t * 0.2, Math.sin(a) * 0.22], r: [Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45], c: C3(k % 3 ? '#C8A85A' : '#A88C46') }); } parts.push({ g: blobGeo(0.42, 0, 0.1, 2), p: [0, 0.22, 0], s: [1.2, 0.6, 1.2], c: C3('#9C8A4A') }); return mergeParts(parts); } }, // mata de hierba dorada
  };
  // planta todas las copias de cada tipo de una vez (instancias: barato aunque haya cientos) y su sombrita en el suelo
  function plantAll(lists) {
    const sh = []; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    for (const kind in lists) { const L = lists[kind]; if (!L.length) continue; const K = KIT[kind], mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: K.side ? THREE.DoubleSide : THREE.FrontSide }), im = new THREE.InstancedMesh(K.geo || ((K.geo = K.mk()), (K.geo.userData.keep = true), K.geo), mat, L.length);
      L.forEach((t, i) => { e.set(t.lx || 0, t.ry, t.lz || 0); q.setFromEuler(e); im.setMatrixAt(i, m.compose(ps.set(t.x, t.y, t.z), q, sc.set(t.s, t.s * (t.sy || 1), t.s))); const b = 0.88 + fr1(Math.sin(t.x * 3.1 + t.z * 1.7) * 9431.1) * 0.22; im.setColorAt(i, col.setRGB(b, b, b * 0.97)); if (kind !== 'rock') sh.push([t.x, t.z, K.r * t.s * (kind === 'gorse' || kind === 'azalea' || kind === 'bush' ? 1 : 0.85)]); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; S.add(im); }
    if (sh.length) { const im = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1d4a26, transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), sh.length);
      sh.forEach(([x, z, r], i) => { const ox = x + r * 0.35, oz = z - r * 0.25; im.setMatrixAt(i, m.compose(ps.set(ox, h(ox, oz) + 0.04, oz), q.identity(), sc.set(r, 1, r * 0.8))); }); im.instanceMatrix.needsUpdate = true; S.add(im); }
  }
  /* edificios: paredes con ventanas que se repiten por planta, tejados de verdad (a dos aguas, a cuatro aguas o planos), chimeneas, torres y torreones */
  const BAY = 3.4, FLOOR = 3.3;
  let MATC = {};
  function matC(key, mk) { if (!MATC[key]) { MATC[key] = mk(); MATC[key].userData.keep = true; if (MATC[key].map) MATC[key].map.keep = true; } return MATC[key]; }
  const WALLS = { stone: ['#BFB4A2', '#F3EFE6', 1], sand: ['#D8C9AA', '#F6F1E6', 1], grey: ['#ABA79F', '#F1EEE8', 1], red: ['#B3634A', '#F2E6DA', 1], stucco: ['#F5F1E9', '#3E6E4E', 0], cream: ['#EEE2C9', '#FFFFFF', 0], hotel: ['#F1EEE8', '#DDE6EE', 2], pink: ['#F4BFCB', '#FFFFFF', 0], sky: ['#BFE1F3', '#FFFFFF', 0], butter: ['#F7E6A6', '#FFFFFF', 0], mint: ['#C3EBD5', '#FFFFFF', 0] };
  function facadeDraw(kind) { return (g, w, hh) => {
    const P = WALLS[kind]; g.fillStyle = P[0]; g.fillRect(0, 0, w, hh);
    { const gr0 = g.createLinearGradient(0, 0, 0, hh); gr0.addColorStop(0, 'rgba(255,255,255,.06)'); gr0.addColorStop(1, 'rgba(0,0,0,.05)'); g.fillStyle = gr0; g.fillRect(0, 0, w, hh); }
    g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(0, hh - 6, w, 6); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, hh - 9, w, 3); // cornisa entre plantas
    if (P[2] === 2) { const gy = hh * 0.2, gh = hh * 0.62, gr = g.createLinearGradient(0, gy, w, gy + gh); gr.addColorStop(0, '#5D86A8'); gr.addColorStop(0.45, '#A9C9E2'); gr.addColorStop(0.55, '#7FA6C6'); gr.addColorStop(1, '#4E7495'); g.fillStyle = gr; g.fillRect(0, gy, w, gh); g.fillStyle = '#E8ECEF'; for (let x = 0; x <= w; x += w / 3) g.fillRect(x - 3, gy, 6, gh); g.fillRect(0, gy + gh, w, 8); return; }
    const ww = w * 0.36, wh = hh * 0.5, wx = (w - ww) / 2, wy = hh * 0.2;
    if (P[2] === 0) { g.fillStyle = P[1]; g.fillRect(wx - ww * 0.42, wy, ww * 0.38, wh); g.fillRect(wx + ww * 1.04, wy, ww * 0.38, wh); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; for (let i = 1; i < 6; i++) { const yy = wy + (wh * i) / 6; g.beginPath(); g.moveTo(wx - ww * 0.42, yy); g.lineTo(wx - ww * 0.04, yy); g.moveTo(wx + ww * 1.04, yy); g.lineTo(wx + ww * 1.42, yy); g.stroke(); } }
    g.fillStyle = P[2] === 1 ? 'rgba(90,75,60,.35)' : 'rgba(0,0,0,.08)'; g.fillRect(wx - 9, wy - 12, ww + 18, 10); g.fillRect(wx - 7, wy + wh + 2, ww + 14, 8); // dintel y alféizar
    g.fillStyle = P[1] === '#3E6E4E' ? '#FFFFFF' : P[1]; g.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
    const gr = g.createLinearGradient(wx, wy, wx + ww, wy + wh); gr.addColorStop(0, '#3E5D78'); gr.addColorStop(0.42, '#8FB4D2'); gr.addColorStop(0.5, '#C8DDEC'); gr.addColorStop(0.6, '#6F93B2'); gr.addColorStop(1, '#344F68'); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = P[1] === '#3E6E4E' ? '#FFFFFF' : P[1]; g.fillRect(wx, wy + wh / 2 - 2.5, ww, 5); g.fillRect(wx + ww / 2 - 2.5, wy, 5, wh);
    if (P[2] === 1) { g.fillRect(wx, wy + wh / 4 - 1.5, ww, 3); g.fillRect(wx, wy + (3 * wh) / 4 - 1.5, ww, 3); }
  }; }
  function roofTex(kind) { return (g, w, hh) => { // pizarra (gris azulado) o teja árabe (rojiza)
    if (kind === 'white') { g.fillStyle = '#F6F6F2'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 32) { g.fillStyle = 'rgba(70,80,100,.13)'; g.fillRect(0, y, w, 4); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, y + 4, w, 2); } return; } // tejado blanco escalonado de las Bermudas (recoge el agua de lluvia)
    if (kind === 'terra') { g.fillStyle = '#B9643F'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 64) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y, w, 6); } return; }
    g.fillStyle = kind === 'copper' ? '#5E9483' : '#596171'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 64) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, y, w, 6); } }; }
  function texMat(key, w, hh, draw, opts) { return matC(key, () => { const t = canvasTex(w, hh, draw, true); t.anisotropy = 8; return new THREE.MeshLambertMaterial(Object.assign({ map: t }, opts || {})); }); }
  function geoFromTris(P, U) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals(); return g; }
  function polyFaces(faces, us, vs) { // caras planas (triángulos o cuadriláteros) con UV según el tamaño real
    const P = [], U = [], v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
    for (const f of faces) { v0.fromArray(f[0]); v1.fromArray(f[1]); const ax = v1.clone().sub(v0).normalize(); v2.fromArray(f[2]); const nrm = v1.clone().sub(v0).cross(v2.clone().sub(v0)).normalize(), ay = nrm.clone().cross(ax).normalize().negate();
      const uv = (pt) => { const d = new THREE.Vector3().fromArray(pt).sub(v0); return [d.dot(ax) / us, -d.dot(ay) / vs]; };
      const tri = (a, b, c) => { P.push(...f[a], ...f[b], ...f[c]); U.push(...uv(f[a]), ...uv(f[b]), ...uv(f[c])); };
      tri(0, 1, 2); if (f.length === 4) tri(0, 2, 3); }
    return geoFromTris(P, U); }
  function roofGeo(type, w, d, H, r, o) {
    const W = w / 2 + o, D = d / 2 + o;
    if (type === 'gable') return [polyFaces([[[-W, H, D], [W, H, D], [W, H + r, 0], [-W, H + r, 0]], [[W, H, -D], [-W, H, -D], [-W, H + r, 0], [W, H + r, 0]]], 2.2, 1.6), polyFaces([[[w / 2, H, d / 2], [w / 2, H, -d / 2], [w / 2, H + r - 0.05, 0]], [[-w / 2, H, -d / 2], [-w / 2, H, d / 2], [-w / 2, H + r - 0.05, 0]]], BAY, FLOOR)];
    const xr = Math.max(0, w / 2 - d / 2);
    return [polyFaces([[[-W, H, D], [W, H, D], [xr, H + r, 0], [-xr, H + r, 0]], [[W, H, -D], [-W, H, -D], [-xr, H + r, 0], [xr, H + r, 0]], [[W, H, D], [W, H, -D], [xr, H + r, 0]], [[-W, H, -D], [-W, H, D], [-xr, H + r, 0]]], 2.2, 1.6), null];
  }
  function building(o) {
    const g = new THREE.Group(), H = o.fl * FLOOR + 0.5, w = o.w, d = o.d, wall = texMat('w' + o.style, 256, 256, facadeDraw(o.style)), plain = matC('p' + o.style, () => new THREE.MeshLambertMaterial({ color: C3(WALLS[o.style][0]) }));
    const box = new THREE.BoxGeometry(w, H + 2, d); box.translate(0, (H + 2) / 2 - 2, 0); const pos = box.attributes.position, nor = box.attributes.normal, uv = box.attributes.uv;
    const bx = Math.max(1, Math.round(w / BAY)), bz = Math.max(1, Math.round(d / BAY));
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (Math.abs(nor.getX(i)) > 0.5) uv.setXY(i, ((z + d / 2) / d) * bz * Math.sign(nor.getX(i)), y / FLOOR); else if (Math.abs(nor.getZ(i)) > 0.5) uv.setXY(i, ((x + w / 2) / w) * bx * -Math.sign(nor.getZ(i)), y / FLOOR); }
    g.add(new THREE.Mesh(box, wall));
    const rc = o.rc || 'slate', roofM = texMat('r' + rc, 256, 256, roofTex(rc));
    if (o.roof === 'flat') { const p = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.7, d + 0.5), matC('par', () => new THREE.MeshLambertMaterial({ color: C3('#D9D4CA') }))); p.position.y = H + 0.1; g.add(p); const t = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 1.6, d * 0.3), matC('roofbox', () => new THREE.MeshLambertMaterial({ color: C3('#B8B3AA') }))); t.position.set(w * 0.2, H + 1, 0); g.add(t); }
    else { const r = o.pitch != null ? d * o.pitch : d * (o.roof === 'gable' ? 0.42 : 0.3), [rf, gb] = roofGeo(o.roof, w, d, H, r, 0.45); g.add(new THREE.Mesh(rf, roofM)); if (gb) g.add(new THREE.Mesh(gb, wall));
      if (o.chim) for (const cx of [-w * 0.32, w * 0.32]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.9, r + 1.6, 1.6), plain); ch.position.set(cx, H + (r + 1.6) / 2 + 0.2, 0); g.add(ch); const pot = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 1.3), matC('pot', () => new THREE.MeshLambertMaterial({ color: C3('#A65A3A') }))); pot.position.set(cx, H + r + 2.05, 0); g.add(pot); } }
    if (o.door !== false) { const dm = matC('door' + (o.dc || ''), () => new THREE.MeshLambertMaterial({ map: canvasTex(64, 128, (gg, ww, hh2) => { gg.fillStyle = o.dc || '#2F5D45'; gg.fillRect(0, 0, ww, hh2); gg.fillStyle = 'rgba(255,255,255,.18)'; gg.fillRect(6, 30, ww - 12, 40); gg.fillRect(6, 78, ww - 12, 40); gg.fillStyle = '#9FC3DD'; gg.beginPath(); gg.arc(ww / 2, 22, 20, Math.PI, 0); gg.fill(); gg.fillStyle = '#E8C66A'; gg.beginPath(); gg.arc(ww - 12, 76, 3, 0, 7); gg.fill(); }) }));
      dm.polygonOffset = true; dm.polygonOffsetFactor = -4; const dr = new THREE.Mesh(new THREE.PlaneGeometry(o.club ? 2.6 : 1.3, o.club ? 3 : 2.6), dm); dr.position.set(0, o.club ? 1.5 : 1.3, d / 2 + 0.06); g.add(dr);
      if (o.club) { const cn = new THREE.Mesh(new THREE.BoxGeometry(5, 0.35, 2.6), plain); cn.position.set(0, 3.4, d / 2 + 1.2); g.add(cn); for (const sx of [-2.2, 2.2]) { const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.3, 8), matC('colw', () => new THREE.MeshLambertMaterial({ color: 0xffffff }))); col2.position.set(sx, 1.65, d / 2 + 2.3); g.add(col2); } } }
    if (o.tower) { const tw = Math.min(5.5, w * 0.18), th = H + FLOOR * 1.6, t = new THREE.Mesh(new THREE.BoxGeometry(tw, th + 2, tw), wall); t.position.set(o.towerX || 0, (th + 2) / 2 - 2, d / 2 - tw / 2 - 0.4); g.add(t);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(tw * 0.78, tw * 0.9, 4), roofM); cap.rotation.y = Math.PI / 4; cap.position.set(o.towerX || 0, th + tw * 0.45, d / 2 - tw / 2 - 0.4); g.add(cap);
      const clk = new THREE.Mesh(new THREE.CircleGeometry(tw * 0.28, 24), matC('clock', () => new THREE.MeshLambertMaterial({ map: canvasTex(64, 64, (gg, ww) => { gg.fillStyle = '#FFFFFF'; gg.beginPath(); gg.arc(32, 32, 31, 0, 7); gg.fill(); gg.strokeStyle = '#22324F'; gg.lineWidth = 3; gg.beginPath(); gg.arc(32, 32, 29, 0, 7); gg.stroke(); gg.lineWidth = 4; gg.beginPath(); gg.moveTo(32, 32); gg.lineTo(32, 12); gg.moveTo(32, 32); gg.lineTo(46, 36); gg.stroke(); }) })));
      clk.position.set(o.towerX || 0, th - tw * 0.45, d / 2 - 0.38); g.add(clk); }
    if (o.turrets) for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, H + 4, 14), wall); tr.position.set((sx * w) / 2, (H + 4) / 2 - 2, (sz * d) / 2); g.add(tr); const cp = new THREE.Mesh(new THREE.SphereGeometry(2.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), texMat('rcopper', 256, 256, roofTex('copper'))); cp.scale.y = 1.5; cp.position.set((sx * w) / 2, H + 2, (sz * d) / 2); g.add(cp); }
    g.position.set(o.x, o.y, o.z); g.rotation.y = o.rot || 0; S.add(g);
    const rh = o.roof === 'flat' ? 0.8 : (o.pitch != null ? d * o.pitch : d * (o.roof === 'gable' ? 0.42 : 0.3)); (st.blds = st.blds || []).push({ x: o.x, z: o.z, rot: o.rot || 0, hw: w / 2 + (o.turrets ? 2 : 0.2), hd: d / 2 + (o.club ? 1 : 0.2), y0: o.y, wall: o.y + H, top: o.y + H + rh + (o.tower ? FLOOR * 1.6 + 3 : 0), r: Math.hypot(w, d) / 2 + 4 });
    return g;
  }
  function baseY(x, z, w, d) { let m = 1e9; for (const [a, b] of [[0, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) m = Math.min(m, h(x + a * w, z + b * d)); return m - 0.15; }
  // el puente de piedra (Swilcan): arco extruido con pretiles
  function stoneBridge(x, z, len, wid) {
    const s = new THREE.Shape(); s.moveTo(-len / 2, -1.6); s.lineTo(-len / 2, 0.35); s.quadraticCurveTo(0, 1.75, len / 2, 0.35); s.lineTo(len / 2, -1.6); s.lineTo(2.2, -1.6); s.absarc(0, -1.6, 2.2, 0, Math.PI, false); s.lineTo(-len / 2, -1.6);
    const mat = texMat('bridge', 256, 256, facadeDrawStone()), geo = new THREE.ExtrudeGeometry(s, { depth: wid, bevelEnabled: false }); geo.translate(0, 0, -wid / 2);
    const fixUV = (gg) => { const p = gg.attributes.position, uv = gg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 2.4, p.getY(i) / 1.4); };
    fixUV(geo); const grp = new THREE.Group(); grp.add(new THREE.Mesh(geo, mat));
    for (const sz of [-1, 1]) { const ps2 = new THREE.Shape(); ps2.moveTo(-len / 2, 0.3); ps2.quadraticCurveTo(0, 1.7, len / 2, 0.3); ps2.lineTo(len / 2, 0.95); ps2.quadraticCurveTo(0, 2.35, -len / 2, 0.95); const pg = new THREE.ExtrudeGeometry(ps2, { depth: 0.35, bevelEnabled: false }); pg.translate(0, 0, sz > 0 ? wid / 2 - 0.35 : -wid / 2); fixUV(pg); grp.add(new THREE.Mesh(pg, mat)); }
    grp.rotation.y = Math.PI / 2; grp.position.set(x, h(x, z - len / 2) + 0.05, z); S.add(grp);
  }
  function facadeDrawStone() { return (g, w, hh) => { g.fillStyle = '#B9AE98'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 22) for (let x = (y / 22) % 2 ? -18 : 0; x < w; x += 36) { const c = fr1(Math.sin(x * 1.7 + y * 3.1) * 731); g.fillStyle = `rgb(${165 + c * 40},${155 + c * 36},${135 + c * 30})`; g.fillRect(x + 2, y + 2, 32, 18); } }; }
  // muro de piedra seca (fuera de límites del 14 del Old Course) y valla blanca (la carretera del 18)
  function stoneWall(x, z0, z1) { const mat = texMat('bridge', 256, 256, facadeDrawStone()); for (let z = z0; z > z1; z -= 6) { const y0 = Math.min(h(x, z), h(x, z - 6)), m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 6.05), mat); m.position.set(x, y0 + 0.5, z - 3); S.add(m); } }
  function fence(x, z0, z1) { const n = Math.ceil((z0 - z1) / 3), pm = matC('fence', () => new THREE.MeshLambertMaterial({ color: 0xffffff })), im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), pm, n), m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const z = z0 - i * 3; im.setMatrixAt(i, m.makeTranslation(x, h(x, z) + 0.55, z)); } im.instanceMatrix.needsUpdate = true; S.add(im);
    const rl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.08, 3.02), pm, n * 2), o3 = new THREE.Object3D(); let j = 0;
    for (let i = 0; i < n; i++) { const z = z0 - i * 3; for (const yy of [0.5, 0.95]) { o3.position.set(x, (h(x, z) + h(x, z - 3)) / 2 + yy, z - 1.5); o3.lookAt(x, h(x, z - 3) + yy, z - 3); o3.updateMatrix(); rl.setMatrixAt(j++, o3.matrix); } } rl.instanceMatrix.needsUpdate = true; S.add(rl); }
  function stakes(x, z0, z1) { const n = Math.ceil((z0 - z1) / 12), im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), matC('stake', () => new THREE.MeshLambertMaterial({ color: 0xffffff })), n), m = new THREE.Matrix4(); for (let i = 0; i < n; i++) { const z = z0 - i * 12; im.setMatrixAt(i, m.makeTranslation(x, h(x, z) + 0.45, z)); } im.instanceMatrix.needsUpdate = true; S.add(im); }
  // superficies de agua: lagos (rejilla con la profundidad en cada vértice), ríos y arroyos (cintas que siguen el cauce) y mar
  let waterMat;
  function waterMesh(geo, ocean) { const m = new THREE.Mesh(geo, ocean ? waterMat.clone() : waterMat); if (ocean) { m.material.uniforms = Object.assign({}, waterMat.uniforms, { uOcean: { value: 1 } }); } m.renderOrder = 2; S.add(m); return m; }
  function lakeWater(L) {
    let lv = 1e9; for (let a = 0; a < 64; a++) { const an = (a / 64) * Math.PI * 2, r = bunkerR([L[0], L[1]], an), x = L[0] + Math.cos(an) * L[2] * r, z = L[1] + Math.sin(an) * L[3] * r; lv = Math.min(lv, h(x, z)); }
    lv -= 0.04; if (L[4] > 3 && HOLE.ocean && HOLE.ocean.y != null) lv = HOLE.ocean.y; HOLE._lv = lv; const W2 = L[2] * 2.7, D2 = L[3] * 2.7, nx = Math.min(160, Math.ceil(W2 / 0.9)), nz = Math.min(160, Math.ceil(D2 / 0.9)), g = new THREE.PlaneGeometry(W2, D2, nx, nz); g.rotateX(-Math.PI / 2); g.translate(L[0], lv, L[1]);
    const p = g.attributes.position, dep = new Float32Array(p.count); for (let i = 0; i < p.count; i++) dep[i] = lv - h(p.getX(i), p.getZ(i)); g.setAttribute('aDep', new THREE.BufferAttribute(dep, 1)); waterMesh(g, L[4] > 3);
  }
  function ribbonWater(pts, half, lvOf) { // pts: [[x, z], …] a lo largo del cauce
    const P = [], D = [], idx = []; const N = 6; let row = 0;
    for (let i = 0; i < pts.length; i++) { const [x, z] = pts[i], [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], tx = bx - ax, tz = bz - az, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl, lv = lvOf(x, z, i);
      for (let k = 0; k <= N; k++) { const s = (k / N - 0.5) * 2 * half[i], px = x + nx * s, pz = z + nz * s; P.push(px, lv, pz); D.push(lv - h(px, pz)); }
      if (i > 0) for (let k = 0; k < N; k++) { const a = (row - 1) * (N + 1) + k, b = a + 1, c = row * (N + 1) + k, d2 = c + 1; idx.push(a, c, b, b, c, d2); } row++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aDep', new THREE.Float32BufferAttribute(D, 1)); g.setIndex(idx); waterMesh(g, false);
  }
  function buildWater() {
    const sk = S.userData.sky.material.uniforms;
    waterMat = new THREE.ShaderMaterial({ vertexShader: WVS, fragmentShader: WFS, transparent: true, side: THREE.DoubleSide, uniforms: { uTime: groundMat.uniforms.uTime, uSun: groundMat.uniforms.uSun, uFog: groundMat.uniforms.uFog, uFogN: groundMat.uniforms.uFogN, uFogF: groundMat.uniforms.uFogF, uSkyT: sk.uTop, uSkyL: sk.uLow, uRain: { value: 0 }, uOcean: { value: 0 } } });
    for (const L of HOLE.lakes || []) if (!(OCN() && L[4] > 3)) lakeWater(L);
    if (HOLE.river) { const F = HOLE.river, pts = [], half = []; for (let i = 0; i < F.length - 1; i++) { const [ax, az, aw] = F[i], [bx, bz, bw] = F[i + 1], n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5)); for (let k = 0; k < n; k++) { const t = k / n; pts.push([ax + (bx - ax) * t, az + (bz - az) * t]); half.push(aw + (bw - aw) * t + 1.4); } } pts.push([F[F.length - 1][0], F[F.length - 1][1]]); half.push(F[F.length - 1][2] + 1.4);
      ribbonWater(pts, half, (x, z) => h(x, z) + 0.45); }
    if (HOLE.burn) { const [x0, x1] = HOLE.bounds, pts = [], half = []; for (let x = x0; x <= x1; x += 1.5) { pts.push([x, HOLE.burn.z]); half.push(HOLE.burn.w * 0.5 + 1.6); } ribbonWater(pts, half, (x, z) => h(x, z) + 0.62); }
    if (OCN()) { // mar del Pacífico (Pebble): una sola superficie, sin capas que se pisen
      const lv = HOLE.ocean.y, [bx0, bx1, , bz1] = HOLE.bounds, z0 = HOLE.ocean.z, x0 = bx0 - 30, x1 = bx1 + 30, z1 = bz1 - 40, F = 6000, Z = 3200;
      const cell = HOLE.land ? 2.5 : 1.2; // acantilados: el mar es hondo y liso, basta una rejilla más gruesa (mucho más ligero en el móvil)
      const nx = Math.ceil((x1 - x0) / cell), nz = Math.ceil((z0 - z1) / cell), g = new THREE.PlaneGeometry(x1 - x0, z0 - z1, nx, nz); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, lv, (z0 + z1) / 2);
      const p = g.attributes.position, dep = new Float32Array(p.count); for (let i = 0; i < p.count; i++) dep[i] = lv - h(p.getX(i), p.getZ(i)); g.setAttribute('aDep', new THREE.BufferAttribute(dep, 1)); waterMesh(g, true);
      const skirt = (ax, bx, az, bz) => { const q = new THREE.PlaneGeometry(bx - ax, az - bz, 1, 1); q.rotateX(-Math.PI / 2); q.translate((ax + bx) / 2, lv, (az + bz) / 2); q.setAttribute('aDep', new THREE.BufferAttribute(new Float32Array([5, 5, 5, 5]), 1)); waterMesh(q, true); };
      skirt(-F, x0, z0, -Z); skirt(x1, F, z0, -Z); skirt(x0, x1, z1, -Z);
      if (HOLE.land) skirt(-F, F, Z, z0); // v8: en los hoyos de acantilado también hay mar detrás de la salida (sin hueco)
    } else if (HOLE.seaZ != null) { // el mar abierto hasta el horizonte
      const zN = HOLE.seaZ + 30, lv = SEA_Y, g = new THREE.PlaneGeometry(6000, 3000, 1, 1); g.rotateX(-Math.PI / 2); g.translate(0, lv, zN - 1500);
      g.setAttribute('aDep', new THREE.BufferAttribute(new Float32Array([5, 5, 5, 5]), 1)); waterMesh(g, true); }
  }
  /* ------------------------------------------------------------------ 6c. fondo de 360° de cada campo (lo que se ve de verdad desde allí), pintado a mano en un cilindro lejano
     a = 0: hacia el green · a > 0: a la derecha · ±180: detrás del tee. Alturas en píxeles por encima del horizonte. */
  const PANO = { W: 4096, H: 512, HZ: 300, R: 700, M: 0.56 };
  const angD = (a, c) => { let d = (a - c) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
  const bump = (a, c, w) => Math.exp(-((angD(a, c) / w) ** 2));
  const sn = (a, f, s) => Math.sin((a * Math.PI * f) / 180 + s);
  function panoDraw(kind) { return (g, W, Hh) => {
    const HZ = PANO.HZ, X = (a) => ((((a / 360 + 0.5) % 1) + 1) % 1) * W;
    const layer = (col, fn, base) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, HZ + (base || 4)); for (let x = 0; x <= W; x += 3) { const a = (x / W) * 360 - 180; g.lineTo(x, HZ - Math.max(0, fn(a))); } g.lineTo(W, HZ + (base || 4)); g.closePath(); g.fill(); };
    const mtn = (col, fn, snowAt) => { // montañas con barrancos, cara al sol más clara y nieve en las cumbres
      const path = new Path2D(); path.moveTo(0, HZ + 4); for (let x = 0; x <= W; x += 2) path.lineTo(x, HZ - Math.max(0, fn((x / W) * 360 - 180))); path.lineTo(W, HZ + 4); path.closePath();
      g.fillStyle = col; g.fill(path); g.save(); g.clip(path);
      for (let x = 0; x <= W; x += 2) { const a = (x / W) * 360 - 180, y = fn(a), yl = fn(a - 0.18), yr = fn(a + 0.18); if (y < 6) continue; const sl = (yr - yl); g.fillStyle = sl > 0 ? `rgba(255,255,255,${Math.min(0.22, sl * 0.04)})` : `rgba(30,40,60,${Math.min(0.2, -sl * 0.035)})`; g.fillRect(x, HZ - y, 2, y); }
      for (let x = 0; x <= W; x += 7) { const a = (x / W) * 360 - 180, y = fn(a); if (y < 14) continue; const r = fr1(Math.sin(x * 9.7) * 3733); g.strokeStyle = `rgba(40,50,70,${0.05 + r * 0.06})`; g.lineWidth = 1.5 + r * 2; g.beginPath(); g.moveTo(x, HZ - y + 2); g.quadraticCurveTo(x + 3 + r * 5, HZ - y * 0.6, x + 2 + r * 9, HZ - y * 0.15); g.stroke(); }
      if (snowAt) { g.fillStyle = 'rgba(250,252,255,.93)'; g.beginPath(); let started = false; const pts = []; for (let x = 0; x <= W; x += 2) { const a = (x / W) * 360 - 180, y = fn(a); pts.push([x, y]); }
        for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i]; if (y <= snowAt) { if (started) { for (let j = i - 1; j >= 0 && pts[j][1] > snowAt; j--) { const [xj, yj] = pts[j]; g.lineTo(xj, HZ - Math.max(snowAt, yj - 5 - 9 * Math.abs(Math.sin(xj * 0.37)) - 4 * Math.abs(Math.sin(xj * 1.3)))); } g.closePath(); g.fill(); g.beginPath(); started = false; } continue; } if (!started) { g.moveTo(x, HZ - snowAt); started = true; } g.lineTo(x, HZ - y); } }
      g.restore(); };
    const at = (a, f) => { const x = X(a); f(x); if (x < 300) f(x + W); if (x > W - 300) f(x - W); };
    const haze = (c, k) => { const a = new THREE.Color(c), b = new THREE.Color('#D9EEFA'); return '#' + a.lerp(b, k).getHexString(); };
    const lowLand = (c1, c2) => { const lg = g.createLinearGradient(0, HZ - 2, 0, Hh); lg.addColorStop(0, c1); lg.addColorStop(0.25, c2); lg.addColorStop(1, c2); g.fillStyle = lg; g.fillRect(0, HZ - 2, W, Hh - HZ + 2); };
    const sea = (a0, a1, c) => { for (const off of [0, -W, W]) { let x0 = X(a0) + off, x1 = X(a1) + off; if (x1 < x0) x1 += W; const lg = g.createLinearGradient(0, HZ - 1, 0, HZ + 90); lg.addColorStop(0, haze(c, 0.9)); lg.addColorStop(0.4, haze(c, 0.6)); lg.addColorStop(1, haze(c, 0.35)); g.fillStyle = lg; g.fillRect(x0, HZ - 1, x1 - x0, Hh - HZ + 1); g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = HZ + 6; y < HZ + 120; y += 9 + (y - HZ) * 0.12) for (let x = x0; x < x1; x += 40 + (y % 37)) g.fillRect(x + ((y * 13) % 29), y, 10 + (y - HZ) * 0.15, 1.5); } };
    const forest = (a0, a1, base, hgt, cols, kind2) => { // línea de árboles lejana: copas redondas, pinos o palmeras
      const span = (((a1 - a0) % 360) + 360) % 360 || 360, cen = a0 + span / 2;
      for (let pass = 0; pass < 2; pass++) for (let x = 0; x <= W; x += kind2 === 'pine' ? 5 : 7) { const a = (x / W) * 360 - 180; if (Math.abs(angD(a, cen)) > span / 2) continue;
        const r = fr1(Math.sin(x * 12.9 + pass * 77) * 4375.5), y0 = HZ - base - (pass ? 0 : 3), hh2 = hgt * (0.6 + r * 0.6); g.fillStyle = cols[(pass + (r > 0.6 ? 1 : 0)) % cols.length];
        if (kind2 === 'pine') { g.beginPath(); g.moveTo(x - 4, y0 + 2); g.lineTo(x, y0 - hh2 * 1.4); g.lineTo(x + 4, y0 + 2); g.fill(); }
        else if (kind2 === 'palm' && r > 0.82) { g.fillRect(x, y0 - hh2 * 1.6, 1.6, hh2 * 1.6); for (let k = 0; k < 6; k++) { const an = (k / 6) * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(an) * 5, y0 - hh2 * 1.6 + Math.sin(an) * 2 + 2, 6, 1.6, an, 0, 7); g.fill(); } }
        else { g.beginPath(); g.arc(x, y0 - hh2 * 0.5, hh2 * 0.62, 0, 7); g.fill(); } } };
    const town = (a0, a1, base, hmax, cols, roofs) => { // tejados y fachadas de un pueblo a lo lejos
      let x = X(a0), x1 = X(a1); if (x1 < x) x1 += W; while (x < x1) { const r = fr1(Math.sin(x * 7.7) * 9999), w = 14 + r * 26, hh2 = hmax * (0.45 + r * 0.55), y0 = HZ - base;
        for (const off of [0, -W]) { const xx = x + off; g.fillStyle = cols[Math.floor(r * cols.length) % cols.length]; g.fillRect(xx, y0 - hh2, w, hh2 + base + 2); g.fillStyle = roofs[Math.floor(r * 7) % roofs.length]; g.beginPath(); g.moveTo(xx - 1, y0 - hh2); g.lineTo(xx + w / 2, y0 - hh2 - w * 0.32); g.lineTo(xx + w + 1, y0 - hh2); g.fill();
          g.fillStyle = 'rgba(60,80,100,.35)'; for (let wy = y0 - hh2 + 4; wy < y0 - 3; wy += 6) for (let wx = xx + 3; wx < xx + w - 3; wx += 6) g.fillRect(wx, wy, 2.4, 3); }
        x += w + (r > 0.85 ? 6 : 0); } };
    const spire = (a, base, hgt, col, wd) => at(a, (x) => { g.fillStyle = col; g.fillRect(x - wd / 2, HZ - base - hgt * 0.6, wd, hgt * 0.6 + base); g.beginPath(); g.moveTo(x - wd / 2 - 1, HZ - base - hgt * 0.6); g.lineTo(x, HZ - base - hgt); g.lineTo(x + wd / 2 + 1, HZ - base - hgt * 0.6); g.fill(); });
    const sqTower = (a, base, hgt, col, wd) => at(a, (x) => { g.fillStyle = col; g.fillRect(x - wd / 2, HZ - base - hgt, wd, hgt + base); g.fillStyle = 'rgba(0,0,0,.15)'; for (let k = 0; k < 4; k++) g.fillRect(x - wd / 2 + k * (wd / 4) + 1, HZ - base - hgt - 3, wd / 8, 3); });
    // cielo: transparente (se ve el cielo de verdad detrás)
    if (kind === 'madrid') { // Casa de Campo: Sierra de Guadarrama nevada al norte, el skyline de Madrid al este (Cuatro Torres, las torres KIO inclinadas, el Palacio Real y la Almudena)
      lowLand(haze('#7FA77A', 0.5), haze('#6E9A68', 0.3));
      const sierra = (a) => bump(a, -32, 34) * (78 + 34 * Math.abs(sn(a, 7, 1)) + 18 * Math.abs(sn(a, 17, 2)) + 9 * Math.abs(sn(a, 41, 0.4))) + bump(a, -16, 6) * 36 * Math.abs(sn(a, 90, 0)); // con los Siete Picos
      mtn(haze('#8197B4', 0.45), sierra, 92);
      layer(haze('#7E9C8E', 0.45), (a) => bump(a, -40, 70) * (28 + 10 * sn(a, 9, 2)));
      forest(-180, 180, 0, 14, [haze('#4E7F55', 0.25), haze('#5F9064', 0.3)], 'pine');
      const HZ0 = HZ; const city = (x0, x1) => { g.fillStyle = haze('#8FA88A', 0.5); g.beginPath(); g.moveTo(x0 - 40, HZ0 + 2); g.quadraticCurveTo((x0 + x1) / 2, HZ0 - 44, x1 + 40, HZ0 + 2); g.fill(); for (let x = x0; x < x1; x += 9) { const r = fr1(Math.sin(x * 3.3) * 999), top = HZ0 - 22 - Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 10; g.fillStyle = r > 0.5 ? haze('#C9C2B4', 0.35) : haze('#B9B2A4', 0.35); g.fillRect(x, top - r * 16, 9, 40); } };
      city(X(-18), X(26));
      const tw = (a, hgt0, wd, top) => at(a, (x) => { const hgt = hgt0 * 1.35 + 26; const gr = g.createLinearGradient(x - wd / 2, 0, x + wd / 2, 0); gr.addColorStop(0, haze('#8FA9C2', 0.25)); gr.addColorStop(0.6, haze('#C8D8E6', 0.2)); gr.addColorStop(1, haze('#7E97AF', 0.25)); g.fillStyle = gr; g.fillRect(x - wd / 2, HZ - hgt, wd, hgt + 4);
        g.fillStyle = 'rgba(255,255,255,.25)'; for (let y = HZ - hgt + 3; y < HZ; y += 4) g.fillRect(x - wd / 2, y, wd, 1); if (top === 'arch') { g.clearRect(x - wd / 2 + 2, HZ - hgt - 1, wd - 4, 7); g.fillStyle = gr; g.fillRect(x - wd / 2, HZ - hgt - 4, wd, 3); } if (top === 'crown') { g.fillStyle = haze('#A9BBCB', 0.2); g.fillRect(x - wd / 2 + 2, HZ - hgt - 6, wd - 4, 6); } if (top === 'glass') { g.beginPath(); g.moveTo(x - wd / 2, HZ - hgt); g.lineTo(x, HZ - hgt - 8); g.lineTo(x + wd / 2, HZ - hgt); g.fill(); } });
      tw(4, 74, 12, 'arch'); tw(6.6, 72, 11, 'crown'); tw(9.2, 78, 11, 'glass'); tw(11.8, 68, 12); // las Cuatro Torres
      at(16, (x) => { for (const sgn of [-1, 1]) { g.fillStyle = haze('#8A9FB4', 0.25); g.beginPath(); g.moveTo(x + sgn * 14, HZ + 2); g.lineTo(x + sgn * 22, HZ + 2); g.lineTo(x + sgn * 6 + (sgn > 0 ? 8 : 0), HZ - 40); g.lineTo(x + sgn * 6 - (sgn > 0 ? 0 : 8), HZ - 40); g.closePath(); g.fill(); } }); // Puerta de Europa (KIO)
      tw(19.5, 40, 9); // Torre Picasso
      at(-11, (x) => { g.fillStyle = haze('#E6DCC8', 0.3); g.fillRect(x - 30, HZ - 22, 60, 26); g.fillStyle = haze('#C9BEA8', 0.3); for (let k = 0; k < 12; k++) g.fillRect(x - 28 + k * 5, HZ - 18, 2, 12); g.fillStyle = haze('#B7C3C9', 0.3); g.beginPath(); g.arc(x + 44, HZ - 26, 9, Math.PI, 0); g.fill(); g.fillRect(x + 34, HZ - 26, 20, 28); }); // Palacio Real y la Almudena
    } else if (kind === 'troon') { // costa oeste de Escocia: el mar, la isla de Arran con sus montañas, Ailsa Craig y las dunas
      lowLand(haze('#9BB58C', 0.45), haze('#88A678', 0.3)); sea(-150, 70, '#4F8DB0');
      mtn(haze('#7489A6', 0.5), (a) => bump(a, -24, 26) * (34 + 26 * Math.abs(sn(a, 11, 0.7)) + 12 * Math.abs(sn(a, 29, 2.2))) + bump(a, -30, 4) * 22); // Arran (Goatfell)
      layer(haze('#90A3B8', 0.65), (a) => bump(a, -70, 22) * 14); // Kintyre
      at(10, (x) => { g.fillStyle = haze('#7D8FA6', 0.45); g.beginPath(); g.moveTo(x - 26, HZ + 1); g.quadraticCurveTo(x - 20, HZ - 30, x, HZ - 32); g.quadraticCurveTo(x + 20, HZ - 30, x + 26, HZ + 1); g.fill(); }); // Ailsa Craig
      layer(haze('#9AAE7E', 0.3), (a) => (Math.abs(angD(a, 160)) < 95 ? 10 + 6 * Math.abs(sn(a, 23, 1)) : 0));
      town(110, 175, 4, 16, [haze('#D9D2C2', 0.35), haze('#C9C1B0', 0.35), haze('#E9E4D8', 0.35)], [haze('#6B7280', 0.3), haze('#7A6A66', 0.3)]);
      forest(80, 260, 2, 6, [haze('#6E8F55', 0.25), haze('#B8A94A', 0.25)]);
    } else if (kind === 'standrews' || kind === 'standrews14') { // St Andrews: el pueblo de piedra con sus torres (St Salvator, la catedral, St Rule) y la bahía
      const c0 = kind === 'standrews' ? 8 : -8; lowLand(haze('#A5BA8A', 0.45), haze('#8DA877', 0.3)); sea(c0 - 175, c0 - 40, '#5390B2');
      layer(haze('#8EA3B7', 0.65), (a) => bump(a, c0 - 110, 40) * (16 + 6 * sn(a, 13, 1))); // Angus al otro lado de la bahía
      town(c0 - 32, c0 + 42, 3, 22, [haze('#CDBFA6', 0.3), haze('#BFB29C', 0.3), haze('#D8CBB2', 0.3), haze('#E2DACB', 0.3)], [haze('#5D6574', 0.25), haze('#6F6560', 0.25)]);
      sqTower(c0 - 8, 3, 44, haze('#BDAE94', 0.25), 9); spire(c0 - 8, 47, 26, haze('#8E8577', 0.25), 6); // St Salvator
      sqTower(c0 + 22, 3, 50, haze('#C4B79E', 0.3), 8); // St Rule
      for (const k of [26, 31]) spire(c0 + k, 3, 40, haze('#B8A88E', 0.3), 5); // la catedral en ruinas
      spire(c0 + 8, 3, 34, haze('#9E9484', 0.3), 5);
      layer(haze('#A0B583', 0.3), (a) => (Math.abs(angD(a, c0 + 150)) < 100 ? 8 + 5 * Math.abs(sn(a, 19, 2)) : 0));
      forest(c0 + 60, c0 + 250, 2, 6, [haze('#6E8F55', 0.25), haze('#C2A53F', 0.3)]);
    } else if (kind === 'carnoustie') { // Carnoustie: pueblo bajo de piedra gris, la iglesia, el mar a lo lejos y las colinas de Sidlaw
      lowLand(haze('#A2B88A', 0.45), haze('#8DA877', 0.3)); sea(-150, -70, '#5390B2');
      mtn(haze('#8197AB', 0.6), (a) => bump(a, 175, 60) * (22 + 10 * Math.abs(sn(a, 9, 1))));
      town(-40, 50, 3, 18, [haze('#C9C6BE', 0.3), haze('#B9B5AD', 0.3), haze('#D8D3C7', 0.3)], [haze('#5D6574', 0.25), haze('#6F6560', 0.25)]); spire(6, 3, 42, haze('#A8A398', 0.3), 6);
      forest(60, 300, 2, 6, [haze('#6E8F55', 0.25), haze('#6A8A50', 0.3)]);
    } else if (kind === 'sawgrass') { // Florida: llano, bosque de robles y pinos con palmeras y casas entre los árboles
      lowLand(haze('#79A86E', 0.45), haze('#6E9D63', 0.3));
      forest(-180, 180, 0, 20, [haze('#3E7A48', 0.2), haze('#4F8C55', 0.25), haze('#5E9A5E', 0.3)]); forest(-180, 180, 0, 16, [haze('#3E7F4A', 0.2), haze('#2F6E40', 0.2)], 'palm');
      town(130, 165, 2, 14, [haze('#F0E6D2', 0.3), haze('#E8DCC4', 0.3)], [haze('#B9714E', 0.3)]); town(-150, -120, 2, 14, [haze('#F0E6D2', 0.3)], [haze('#B9714E', 0.3)]);
    } else if (kind === 'augusta') { // Georgia: muralla de pinos altísimos, lomas
      lowLand(haze('#6FA36A', 0.45), haze('#5F955C', 0.3));
      layer(haze('#7FA28A', 0.5), (a) => 16 + 8 * sn(a, 3, 1) + 5 * sn(a, 7, 2));
      forest(-180, 180, 4, 30, [haze('#2F6E42', 0.15), haze('#3B7E4C', 0.2), haze('#276038', 0.15)], 'pine'); forest(-180, 180, 0, 14, [haze('#3E7F4A', 0.15), haze('#4E9254', 0.2)]);
    } else if (kind === 'pebble') { // Pebble Beach: el Pacífico, la bahía de Carmel con sus colinas y la punta de Point Lobos, y el bosque de Del Monte detrás
      lowLand(haze('#8DAE78', 0.45), haze('#7FA36C', 0.3)); sea(-120, 150, '#3F86B5');
      mtn(haze('#7F9479', 0.45), (a) => bump(a, 20, 26) * (48 + 18 * Math.abs(sn(a, 13, 0.4)) + 8 * Math.abs(sn(a, 37, 1.1))));
      layer(haze('#A3B39A', 0.6), (a) => bump(a, 44, 10) * 16);
      at(20, (x) => { g.fillStyle = haze('#F2E8D2', 0.35); g.fillRect(x - 180, HZ - 3, 300, 3); });
      layer(haze('#6E9A68', 0.35), (a) => (Math.abs(angD(a, 180)) < 80 ? 14 + 10 * Math.abs(sn(a, 5, 1)) : 0)); forest(110, 250, 10, 12, [haze('#2F6E42', 0.25), haze('#3B7E4C', 0.25)], 'pine');
      town(150, 175, 12, 10, [haze('#E8E0D0', 0.35), haze('#D8CDBA', 0.35)], [haze('#7A6A66', 0.3)]);
    } else if (kind === 'valderrama') { // Sotogrande: alcornocal, la sierra con pueblos blancos y el Peñón de Gibraltar sobre el Mediterráneo
      lowLand(haze('#86A570', 0.45), haze('#76985F', 0.3)); sea(-40, 20, '#4B8FB8');
      at(-2, (x) => { g.fillStyle = haze('#8E938E', 0.35); g.beginPath(); g.moveTo(x - 80, HZ + 1); g.lineTo(x - 66, HZ - 118); g.quadraticCurveTo(x - 40, HZ - 108, x - 14, HZ - 84); g.quadraticCurveTo(x + 26, HZ - 46, x + 70, HZ + 1); g.fill(); }); // el Peñón
      layer(haze('#9CA9B8', 0.7), (a) => bump(a, 10, 10) * 20); // las montañas de África, muy lejos
      mtn(haze('#7D937A', 0.45), (a) => bump(a, 45, 40) * (46 + 16 * Math.abs(sn(a, 9, 2)) + 8 * Math.abs(sn(a, 23, 0.3))));
      at(38, (x) => { for (let k = 0; k < 16; k++) { const r = fr1(Math.sin(k * 9.1) * 777); g.fillStyle = haze('#FFFFFF', 0.15); g.fillRect(x - 30 + k * 4, HZ - 38 + r * 10, 4, 5); } g.fillStyle = haze('#E9E4D8', 0.2); g.fillRect(x - 2, HZ - 50, 5, 12); }); // pueblo blanco en el cerro
      forest(-180, 180, 0, 14, [haze('#3C6F3E', 0.2), haze('#4A7E47', 0.25), haze('#557F45', 0.25)]);
    } else if (kind === 'casadecampo') { // La Romana: el Caribe turquesa a la izquierda y detrás, la isla Catalina a lo lejos, palmerales y villas blancas
      lowLand(haze('#8FBF72', 0.45), haze('#7FB164', 0.3)); sea(-178, 28, '#1FA6C4');
      layer(haze('#7FA48A', 0.6), (a) => bump(a, -38, 9) * 9 + bump(a, -30, 4) * 3); // la isla Catalina, baja
      at(-120, (x) => { g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(x, HZ - 2); g.lineTo(x + 4, HZ - 16); g.lineTo(x + 9, HZ - 2); g.fill(); g.fillStyle = haze('#EDEDED', 0.3); g.fillRect(x - 3, HZ - 2, 16, 2); }); // un velero
      forest(30, 178, 0, 12, [haze('#3E8A4A', 0.2), haze('#4E9A55', 0.25)]); forest(30, 178, 2, 15, [haze('#3B8346', 0.2), haze('#2F7440', 0.2)], 'palm');
      town(70, 120, 3, 12, [haze('#FFFFFF', 0.25), haze('#F4EEE2', 0.25)], [haze('#C46A45', 0.25), haze('#B85E3E', 0.25)]);
    } else if (kind === 'melbourne') { // el «sandbelt» de Melbourne: llano, bosque de eucaliptos gris verdoso, brezales y tejados de teja
      lowLand(haze('#93AE7C', 0.45), haze('#839F6C', 0.3));
      layer(haze('#9AAAA2', 0.6), (a) => 10 + 6 * Math.abs(sn(a, 3, 1)) + 4 * sn(a, 11, 2)); // lomas muy lejanas (Dandenong)
      forest(-180, 180, 2, 24, [haze('#6F8E72', 0.25), haze('#7E9C7C', 0.3), haze('#5F7F64', 0.25)]);
      town(140, 175, 2, 9, [haze('#E9DCC6', 0.3), haze('#D8C6AA', 0.3)], [haze('#B4613F', 0.3), haze('#A85A3C', 0.3)]); town(-175, -140, 2, 9, [haze('#E9DCC6', 0.3)], [haze('#B4613F', 0.3)]);
      forest(-180, 180, 0, 13, [haze('#7A9468', 0.2), haze('#8BA477', 0.25)]);
      for (let k = 0; k < 26; k++) { const a = -180 + k * 13.8 + 5 * sn(k, 40, 1); at(a, (x) => { const hh2 = 46 + 22 * fr1(Math.sin(k * 7.7) * 99); g.fillStyle = haze('#DCD3C4', 0.35); g.fillRect(x - 1.5, HZ - hh2, 3, hh2); g.fillStyle = haze('#6E8E70', 0.3); for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x + (j - 1.5) * 7, HZ - hh2 + (j % 2) * 7, 10, 6, 0, 0, 7); g.fill(); } }); } // eucaliptos altos sueltos
    } else if (kind === 'paris') { // Saint-Quentin-en-Yvelines (París): llano de l'Île-de-France, filas de chopos, bosques bajos y un pueblo con campanario
      lowLand(haze('#9CB27E', 0.45), haze('#8AA36E', 0.3));
      layer(haze('#8EA298', 0.6), (a) => 12 + 5 * sn(a, 4, 1) + 3 * sn(a, 13, 2));
      forest(-180, 180, 0, 12, [haze('#5E8A58', 0.25), haze('#6E9862', 0.3)]);
      for (const [a0, n] of [[-70, 9], [40, 12], [130, 8]]) for (let k = 0; k < n; k++) at(a0 + k * 1.6, (x) => { g.fillStyle = haze(k % 2 ? '#4F7F4E' : '#5C8C55', 0.3); g.beginPath(); g.ellipse(x, HZ - 22, 3.4, 22, 0, 0, 7); g.fill(); }); // chopos
      town(-20, 8, 2, 13, [haze('#E8E0D0', 0.3), haze('#D9CFBD', 0.3)], [haze('#6B6F7A', 0.3), haze('#8A5E4A', 0.3)]); spire(-8, 2, 40, haze('#B9B0A0', 0.3), 6);
    } else if (kind === 'bermuda') { // Bermudas: el Atlántico turquesa alrededor, lomas verdes con casitas de colores y tejados blancos, palmeras y cedros
      lowLand(haze('#83B271', 0.45), haze('#73A563', 0.3)); sea(-180, 180, '#1E9EC0');
      layer(haze('#7FA77D', 0.35), (a) => (Math.abs(angD(a, 60)) < 120 ? 30 + 14 * Math.abs(sn(a, 5, 1)) + 6 * sn(a, 17, 2) : 0));
      forest(-60, 180, 6, 11, [haze('#3E7F4A', 0.2), haze('#2F6E40', 0.2)]); forest(-60, 180, 6, 13, [haze('#3B8346', 0.2)], 'palm');
      for (let k = 0; k < 46; k++) { const a = -50 + k * 4.9 + 3 * sn(k, 50, 2), r = fr1(Math.sin(k * 9.3) * 777); if (Math.abs(angD(a, 60)) > 115) continue; at(a, (x) => { const y0 = HZ - 10 - r * 26, w = 15 + r * 10, hh2 = 9 + r * 5; g.fillStyle = haze(['#F4BFCB', '#BFE1F3', '#F7E6A6', '#C3EBD5', '#FFFFFF'][k % 5], 0.2); g.fillRect(x, y0 - hh2, w, hh2); g.fillStyle = haze('#FAFAF6', 0.15); g.beginPath(); g.moveTo(x - 1.5, y0 - hh2); g.lineTo(x + w / 2, y0 - hh2 - w * 0.42); g.lineTo(x + w + 1.5, y0 - hh2); g.fill(); g.fillStyle = 'rgba(60,90,110,.35)'; g.fillRect(x + 2, y0 - hh2 + 2, 2, 2.5); g.fillRect(x + w - 4, y0 - hh2 + 2, 2, 2.5); }); }
    } else if (kind === 'hawkes') { // Cape Kidnappers: el Pacífico a los dos lados, el cabo de acantilados blancos con estratos delante y las colinas doradas de Hawke's Bay detrás
      lowLand(haze('#B9B278', 0.45), haze('#A9A268', 0.3)); sea(-178, 178, '#2E78A8');
      mtn(haze('#8798AA', 0.65), (a) => bump(a, -75, 22) * (16 + 6 * Math.abs(sn(a, 13, 1)))); // la costa lejana de la bahía
      const cape = (a) => bump(a, 38, 9) * (26 + 6 * sn(a, 23, 1)) + bump(a, 48, 4) * 10; // el cabo: meseta con paredes blancas
      { const P = new Path2D(); P.moveTo(0, HZ + 4); for (let x = 0; x <= W; x += 2) P.lineTo(x, HZ - Math.max(0, cape((x / W) * 360 - 180))); P.lineTo(W, HZ + 4); P.closePath(); g.fillStyle = haze('#D9CBA4', 0.35); g.fill(P); g.save(); g.clip(P);
        for (let y = HZ - 60, k = 0; y < HZ; y += 3.2, k++) { g.fillStyle = k % 3 === 0 ? 'rgba(255,252,240,.5)' : k % 3 === 1 ? 'rgba(150,118,80,.16)' : 'rgba(200,180,140,.12)'; g.fillRect(0, y, W, 1.8); } // estratos horizontales
        for (let x = 0; x <= W; x += 2) { const c = cape((x / W) * 360 - 180); if (c > 3) { g.fillStyle = haze('#8E9A5A', 0.35); g.fillRect(x, HZ - c, 2, 3); } } g.restore(); } // pasto en lo alto
      layer(haze('#9FA864', 0.35), (a) => (Math.abs(angD(a, 180)) < 70 ? 22 + 14 * Math.abs(sn(a, 4, 1)) + 6 * sn(a, 15, 2) : 0)); // colinas de pasto detrás
      forest(140, 220, 18, 6, [haze('#4F7A4A', 0.3)], 'pine');
    } else if (kind === 'izu') { // Kawana (Izu): la bahía de Sagami a la izquierda, la isla volcánica de Oshima en el mar, el monte Fuji nevado detrás y bosques de pinos
      lowLand(haze('#86A872', 0.45), haze('#769A62', 0.3)); sea(-170, 30, '#2F7FB0');
      mtn(haze('#8193A8', 0.6), (a) => bump(a, -32, 7) * 26 + bump(a, -32, 2.2) * 4); // Oshima
      mtn(haze('#7F95B6', 0.5), (a) => { const d = Math.abs(angD(a, 138)); return d < 26 ? Math.min(118, (26 - d) * 6.2) * (1 - 0.04 * Math.abs(sn(a, 60, 1))) : 0; }, 84); // el Fuji
      layer(haze('#6E9466', 0.35), (a) => (Math.abs(angD(a, 105)) < 75 ? 26 + 12 * Math.abs(sn(a, 6, 1)) + 6 * sn(a, 19, 2) : 0)); // montes de Izu
      forest(30, 180, 4, 12, [haze('#2F5E3C', 0.25), haze('#3A6E46', 0.25)], 'pine'); forest(-180, -170, 4, 12, [haze('#2F5E3C', 0.25)], 'pine');
    }
  }; }
  const PANOC = {};
  function buildPano() {
    if (!HOLE.pano) return; const t = PANOC[HOLE.pano] || (PANOC[HOLE.pano] = canvasTex(PANO.W, PANO.H, panoDraw(HOLE.pano))); t.keep = true; t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.anisotropy = 8; t.generateMipmaps = true;
    const hgt = PANO.H * PANO.M, cyl = new THREE.Mesh(new THREE.CylinderGeometry(PANO.R, PANO.R, hgt, 128, 1, true), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false }));
    cyl.userData.dy = (PANO.HZ - PANO.H / 2) * PANO.M; cyl.renderOrder = -1; S.add(cyl); S.userData.pano = cyl;
  }
  function build(canvas) {
    R = new THREE.WebGLRenderer({ canvas, antialias: true }); R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.outputEncoding = THREE.sRGBEncoding; R.setClearColor(0xcfeeff, 1);
    buildScene();
  }
  function buildScene() {
    if (S) S.traverse((o) => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); if (o.material && !o.material.userData.keep) { if (o.material.map && !o.material.map.keep) o.material.map.dispose(); o.material.dispose(); } });
    seed = 11; S = new THREE.Scene(); st.trees = []; st.blds = [];
    const sky = new THREE.Mesh(new THREE.SphereGeometry(940, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uTop: { value: new THREE.Color('#8AD6FF') }, uMid: { value: new THREE.Color('#BEE9FF') }, uLow: { value: new THREE.Color('#E6F7FF') } },
      vertexShader: 'varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; varying vec3 p; void main(){float t=clamp(p.y/380.,0.,1.); vec3 c = t<0.3? mix(uLow,uMid,t/0.3) : mix(uMid,uTop,(t-0.3)/0.7); gl_FragColor=vec4(c,1.);}' }));
    sky.material.depthTest = false; sky.renderOrder = -10; sky.frustumCulled = false; S.add(sky); S.userData.sky = sky;
    const [X0, X1, Z0, Z1] = HOLE.bounds;
    const geo = new THREE.PlaneGeometry(X1 - X0, Z0 - Z1, X1 - X0, Z0 - Z1); geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, h(pos.getX(i), pos.getZ(i))); geo.computeVertexNormals();
    const roughT = canvasTex(256, 256, (g, w) => { g.fillStyle = 'rgb(0,0,0)'; g.fillRect(0, 0, w, w);
      for (let k = 0; k < 40; k++) { const x = rnd() * w, y = rnd() * w, r = 20 + rnd() * 50, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,255,.6)'); gr.addColorStop(1, 'rgba(0,0,255,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.globalCompositeOperation = 'source-over';
      for (let k = 0; k < 260; k++) { const x = rnd() * w, y = rnd() * w, l = 7 + rnd() * 10, dark = rnd() < 0.6; g.strokeStyle = dark ? 'rgb(255,0,0)' : 'rgb(0,255,0)'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2, y - l * 0.5, x + (rnd() - 0.5) * 6, y - l); g.stroke(); } }, true);
    const sandT = canvasTex(128, 128, (g, w) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, w); for (let k = 0; k < 500; k++) { g.fillStyle = `rgb(${Math.floor(rnd() * 255)},0,0)`; g.fillRect(rnd() * w, rnd() * w, 2, 2); } }, true);
    roughT.encoding = sandT.encoding = THREE.LinearEncoding; roughT.anisotropy = sandT.anisotropy = 8;
    // 7.3: normales finas del green (cada 15 cm) para que la luz no marque los cuadros de la malla de 1 m
    const GNp = 3.5, GNx0 = G0.x - G0.rx - GNp, GNx1 = G0.x + G0.rx + GNp, GNz0 = G0.z - G0.rz - GNp, GNz1 = G0.z + G0.rz + GNp, GNW = Math.min(256, Math.ceil((GNx1 - GNx0) / 0.15)), GNH = Math.min(256, Math.ceil((GNz1 - GNz0) / 0.15)), GNd = new Uint8Array(GNW * GNH * 4);
    const GNsx = (GNx1 - GNx0) / GNW, GNsz = (GNz1 - GNz0) / GNH, GHt = new Float32Array(GNW * GNH); for (let j = 0; j < GNH; j++) for (let i = 0; i < GNW; i++) GHt[j * GNW + i] = h(GNx0 + (i + 0.5) * GNsx, GNz0 + (j + 0.5) * GNsz);
    for (let j = 0; j < GNH; j++) for (let i = 0; i < GNW; i++) { const i0 = Math.max(0, i - 1), i1 = Math.min(GNW - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(GNH - 1, j + 1), dx = (GHt[j * GNW + i1] - GHt[j * GNW + i0]) / ((i1 - i0) * GNsx), dz = (GHt[j1 * GNW + i] - GHt[j0 * GNW + i]) / ((j1 - j0) * GNsz), L = Math.hypot(dx, 1, dz), o = (j * GNW + i) * 4;
      GNd[o] = Math.max(0, Math.min(255, Math.round(((-dx / L) * 4 * 0.5 + 0.5) * 255))); GNd[o + 1] = Math.max(0, Math.min(255, Math.round(((-dz / L) * 4 * 0.5 + 0.5) * 255))); GNd[o + 2] = 0; GNd[o + 3] = 255; }
    const gnT = new THREE.DataTexture(GNd, GNW, GNH, THREE.RGBAFormat); gnT.magFilter = THREE.LinearFilter; gnT.minFilter = THREE.LinearFilter; gnT.generateMipmaps = false; gnT.needsUpdate = true;
    st.slopeHeat = null; const SH = slopeHeat(), slopeT = new THREE.CanvasTexture(SH.c); slopeT.minFilter = THREE.LinearFilter;
    groundMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, extensions: { derivatives: true }, uniforms: {
      uGN: { value: gnT }, uGNBox: { value: new THREE.Vector4(GNx0, GNz0, GNx1, GNz1) }, uSlopeTex: { value: slopeT }, uSlopeBox: { value: new THREE.Vector4(SH.x0, SH.ze, SH.x1, SH.zs) }, uSlopeOn: { value: 0 }, uCliff: { value: new THREE.Vector4(HOLE.land ? 1 : 0, HOLE.ocean ? HOLE.ocean.y : -99, 0, 0) }, uRock: { value: new THREE.Color(HOLE.land ? HOLE.land.rock : '#8E8B84') }, uDry: { value: HOLE.dry || 0 },
      uGreen: { value: new THREE.Vector4(G0.x, G0.z, G0.rx, G0.rz) }, uTilt: { value: new THREE.Vector2(G0.tilt[0], G0.tilt[1]) }, uBk: { value: [0, 1, 2, 3, 4, 5].map((i) => { const b = HOLE.bunkers[i]; return b ? new THREE.Vector4(b[0], b[1], b[2], b[3]) : new THREE.Vector4(9999, 9999, 1, 1); }) }, uTee: { value: new THREE.Vector2(HOLE.tee.x, HOLE.tee.z - 0.5) },
      uSeaZ: { value: HOLE.seaZ == null ? -1e5 : HOLE.seaZ }, uCup: { value: new THREE.Vector2(HOLE.cup.x, HOLE.cup.z) }, uTime: { value: 0 }, uGB: { value: [0, 1, 2].map((i) => (GB[i] ? new THREE.Vector4(GB[i][0], GB[i][1], GB[i][2], GB[i][3]) : new THREE.Vector4(0, 0, 0, 1))) }, uFw: { value: [0, 1, 2, 3, 4, 5].map((i) => (HOLE.fair[i] ? new THREE.Vector3(HOLE.fair[i][0], HOLE.fair[i][1], HOLE.fair[i][2]) : new THREE.Vector3())) }, uFwN: { value: HOLE.fair.length }, uBurn: { value: new THREE.Vector2(HOLE.burn ? HOLE.burn.z : 0, HOLE.burn ? HOLE.burn.w : 0) }, uOB: { value: HOLE.ob != null ? HOLE.ob : -1e5 }, uOBL: { value: HOLE.obL != null ? HOLE.obL : -1e5 },
      uLk: { value: [0, 1, 2].map((i) => { const L = (HOLE.lakes || [])[i]; return L ? new THREE.Vector4(L[0], L[1], L[2], L[3]) : new THREE.Vector4(0, 0, 0, 0); }) }, uIs: { value: HOLE.island ? new THREE.Vector4(...HOLE.island) : new THREE.Vector4(0, 0, 0, 0) },
      uRv: { value: [0, 1, 2, 3, 4, 5, 6].map((i) => { const R2 = (HOLE.river || [])[i]; return R2 ? new THREE.Vector3(R2[0], R2[1], R2[2]) : new THREE.Vector3(); }) }, uRvN: { value: (HOLE.river || []).length }, uRough: { value: roughT }, uSand: { value: sandT },
      uFog: { value: new THREE.Color('#DDF2FF') }, uFogN: { value: 140 }, uFogF: { value: 420 }, uSun: { value: new THREE.Vector3(-0.5, 0.75, 0.4).normalize() }, uWet: { value: 0 }, uHail: { value: 0 } } });
    S.add(new THREE.Mesh(geo, groundMat));
    { // suelo de fuera (más allá del terreno), para que desde arriba no se vea el borde
      const [bx0, bx1, bz0, bz1] = HOLE.bounds, ring = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), groundMat);
      const ry = HOLE.land ? -HOLE.land.drop - 12 : HOLE.ocean || HOLE.seaZ != null ? -40 : HOLE.seaZ == null ? Math.min(h(bx0 + 1, bz1 + 1), h(bx1 - 1, bz1 + 1), h(bx0 + 1, bz0 - 1), h(bx1 - 1, bz0 - 1)) - 1.5 : Math.min(h(bx0 + 1, bz0 - 1), h(bx1 - 1, bz0 - 1), 0.5) - 1.5;
      ring.rotation.x = -Math.PI / 2; ring.position.set((bx0 + bx1) / 2, ry, (bz0 + bz1) / 2); S.add(ring); }
    seaMat = null; buildWater(); buildPano();
    // árboles, arbustos y rocas en 3D (los que pueden tocar la bola cuentan para el choque)
    const T = {}; Object.keys(KIT).forEach((k) => (T[k] = []));
    const addT = (kind, x, z, s, coll) => { const K = KIT[kind]; s = s || 1; T[kind].push({ x, y: h(x, z) - 0.12, z, s, ry: rnd() * 6.28, lx: (rnd() - 0.5) * 0.08, lz: (rnd() - 0.5) * 0.08 }); if (coll !== false && K.cy > 2) st.trees.push({ x, z, cy: h(x, z) + K.cy * s, r: K.r * s, trunk: 0.3 * s }); };
    const fz = (z) => { const F = HOLE.fair; for (let i = 0; i < F.length - 1; i++) if (z <= F[i][1] && z >= F[i + 1][1]) { const t = (z - F[i][1]) / (F[i + 1][1] - F[i][1]); return [F[i][0] + (F[i + 1][0] - F[i][0]) * t, F[i][2] + (F[i + 1][2] - F[i][2]) * t]; } if (F.length && z > F[0][1]) return [F[0][0], F[0][2]]; return null; };
    const okSpot = (x, z, gap) => { const [bx0, bx1, bz0, bz1] = HOLE.bounds; return x > bx0 + 3 && x < bx1 - 3 && z < bz0 - 3 && z > bz1 + 3 && surf(x, z) === 'rough' && (!HOLE.land || landD(x, z) < -3) && Math.hypot(x - G0.x, z - G0.z) > G0.rz + (gap || 7) && Math.hypot(x - HOLE.tee.x, z - HOLE.tee.z) > 9; };
    const zEnd = Math.min(HOLE.cup.z, G0.z - G0.rz);
    if (HOLE.style === 'links' || HOLE.style === 'town') {
      for (let k = 0; k < (HOLE.oaks != null ? HOLE.oaks : 40); k++) { const z = -10 + rnd() * (zEnd - 40), f = fz(z) || [HOLE.cup.x, 12], x = f[0] + (k % 2 ? 1 : -1) * (f[1] + 34 + rnd() * 50); if (okSpot(x, z)) addT('oak', x, z, 0.7 + rnd() * 0.4); }
      const nG = HOLE.gorse != null ? HOLE.gorse : HOLE.style === 'links' ? 170 : 60; // aulagas (tojo) en flor: lo típico de los links escoceses
      for (let k = 0; k < nG * 3 && T.gorse.length < nG; k++) { const z = -8 + rnd() * (zEnd - 2), f = fz(z) || [HOLE.cup.x * (z / zEnd), 7], x = f[0] + (rnd() < 0.5 ? 1 : -1) * (f[1] + 4 + rnd() * 34); if (okSpot(x, z, 4)) addT('gorse', x, z, 0.7 + rnd() * 0.9); }
    } else {
      // parque: árboles a los lados de la calle (chocan: la bola pega en la copa y cae) y un bosque detrás que da profundidad
      const kinds = HOLE.trees || ['pine', 'oak'], pick = () => kinds[Math.floor(rnd() * kinds.length) % kinds.length];
      for (let z = -22; z > G0.z - 30; z -= 11 + rnd() * 6) { const f = fz(z) || [G0.x, 12]; for (const side of [-1, 1]) { const off = f[1] + 8 + rnd() * 10, x1 = f[0] + side * off, z1 = z + (rnd() - 0.5) * 5; if (okSpot(x1, z1)) addT(pick(), x1, z1, 0.85 + rnd() * 0.35); if (rnd() < 0.5) { const x2 = f[0] + side * (off + 9 + rnd() * 8), z2 = z + (rnd() - 0.5) * 6; if (okSpot(x2, z2)) addT(pick(), x2, z2, 0.8 + rnd() * 0.4); }
        for (let j = 0; j < 3; j++) { const x3 = f[0] + side * (off + 22 + j * 11 + rnd() * 8), z3 = z + (rnd() - 0.5) * 10; if (okSpot(x3, z3)) addT(pick(), x3, z3, 0.8 + rnd() * 0.5, false); }
        if (rnd() < 0.35) { const xb = f[0] + side * (off - 3 - rnd() * 3), zb = z + (rnd() - 0.5) * 8; if (okSpot(xb, zb)) addT('bush', xb, zb, 0.7 + rnd() * 0.6); } } }
      for (let k = 0; k < 26; k++) { const a = rnd() * Math.PI * 2, r = G0.rz + 12 + rnd() * 30, x = G0.x + Math.cos(a) * r * 0.9, z = G0.z - Math.abs(Math.sin(a)) * r; if (okSpot(x, z)) addT(pick(), x, z, 0.9 + rnd() * 0.4, r < G0.rz + 30); }
    }
    if (HOLE.wild) { const [wk, wn] = HOLE.wild, [bx0, bx1] = HOLE.bounds; // matas sueltas por la hierba alta (tussock de Nueva Zelanda…)
      for (let k = 0; k < wn * 5 && T[wk].length < wn; k++) { const x = bx0 + rnd() * (bx1 - bx0), z = -6 + rnd() * (zEnd - 20); if (okSpot(x, z, 4) && (HOLE.fair.length < 2 || fairD(x, z) > 2.5)) addT(wk, x, z, 0.7 + rnd() * 0.7); } }
    for (const sc of HOLE.scenery || []) { // [tipo, x, z, ancho]
      const [k, x, z, wd] = sc;
      if (k === 'azalea') addT('azalea', x, z, wd / 3.2); else if (k === 'rock') addT('rock', x, z, wd / 2.6); else if (k === 'palm') addT('palm', x, z, wd / 6); else if (k === 'cypress') addT('cypress', x, z, wd / 9);
      else if (k === 'bridge') stoneBridge(x, z, 9.5, 2.8);
      else if (k === 'club' || k === 'red') { const o = Object.assign({ fl: 2, d: 14, roof: 'hip', style: 'stone' }, k === 'red' ? HOLE.red : HOLE.club, { x, z, w: wd, club: k === 'club' }); o.y = baseY(x, z, wd, o.d); o.rot = Math.atan2(HOLE.cup.x - x, HOLE.cup.z - z); building(o); }
      else if (k === 'house') { const i = Math.abs(Math.round(x * 7 + z)), d = 9, rot = HOLE.houseFace === 'x' ? (x > 0 ? -Math.PI / 2 : Math.PI / 2) : Math.atan2(HOLE.cup.x - x, HOLE.cup.z - z), o = HOLE.houseStyle === 'pastel' ? { x, z, w: wd, d, fl: 1 + (i % 2), style: ['pink', 'sky', 'butter', 'mint'][i % 4], roof: 'hip', rc: 'white', pitch: 0.34, rot, dc: ['#3E7FA6', '#2F6E5E', '#C8566A', '#5E5BA6'][i % 4] } : { x, z, w: wd, d, fl: 2 + (i % 2), style: ['stone', 'sand', 'grey'][i % 3], roof: 'gable', rc: 'slate', chim: true, rot, dc: ['#2F5D45', '#8A3B32', '#2F4F7A', '#22324F'][i % 4] }; o.y = HOLE.houseFace === 'x' ? Math.min(h(x - 4, z - wd / 2), h(x - 4, z + wd / 2), h(x + 4, z)) - 0.15 : baseY(x, z, wd, d); building(o); }
      else if (KIT[k]) addT(k, x, z, wd / (2 * KIT[k].r), k !== 'tussock');
    }
    if (HOLE.wall) stoneWall(HOLE.wall, -12, zEnd - 40);
    if (HOLE.fence) fence(HOLE.fence, -30, zEnd - 30);
    if (HOLE.obL != null) stakes(HOLE.obL - 0.4, -10, zEnd - 40);
    if (HOLE.ob != null && !HOLE.wall && !HOLE.fence) stakes(HOLE.ob + 0.4, -10, zEnd - 40);
    plantAll(T);
    { const tm = new THREE.MeshLambertMaterial({ color: C3(HOLE.par === 3 ? '#FFFFFF' : HOLE.par === 4 ? '#3C7BE0' : '#E8C33A') }); for (const sx of [-2.6, 2.6]) { const mk = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), tm); mk.position.set(HOLE.tee.x + sx, h(HOLE.tee.x + sx, HOLE.tee.z - 1.5) + 0.1, HOLE.tee.z - 1.5); S.add(mk); } } // marcas de salida
    const tuftM = new THREE.SpriteMaterial({ map: canvasTex(96, 80, tuftDraw), transparent: true, depthWrite: false });
    const flM = ['#FF8FC0', '#FFFFFF', '#FFC247', '#9B82FF'].map((c) => new THREE.SpriteMaterial({ map: canvasTex(48, 64, flowerDraw(c)), transparent: true, depthWrite: false }));
    S.userData.tufts = [];
    for (let k = 0; k < 560; k++) {
      const near = k < 320, x = near ? (rnd() - 0.5) * 34 : G0.x + (rnd() - 0.5) * 40, z = near ? 8 - rnd() * 42 : G0.z + (rnd() - 0.5) * 50; if (S.userData.tufts.length > 420) break;
      if (surf(x, z) !== 'rough' || (Math.abs(x) < 4.5 && z > -6)) continue;
      const fl = rnd() < 0.18, s = new THREE.Sprite(fl ? flM[k % 4] : tuftM); S.userData.tufts.push(s); const sc = fl ? 0.18 + rnd() * 0.1 : 0.22 + rnd() * 0.22; s.scale.set(sc, sc * (fl ? 1.33 : 0.83), 1); s.center.set(0.5, 0); s.position.set(x, h(x, z) - 0.02, z); S.add(s);
    }
    S.userData.clouds = [];
    for (let k = 0; k < 10; k++) { const s = sprite(cloudDraw, 300, 190, 34 + rnd() * 30); s.position.set(-300 + k * 64 + rnd() * 20, 58 + rnd() * 50, -430 - rnd() * 80); S.add(s); S.userData.clouds.push(s); }
    const gy = h(HOLE.cup.x, HOLE.cup.z);
    flagPin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.2, 8), new THREE.MeshLambertMaterial({ color: C3('#F2D35C') })); flagPin.position.set(HOLE.cup.x, gy + 1.1, HOLE.cup.z); S.add(flagPin);
    flagMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.48, 14, 4), new THREE.MeshLambertMaterial({ map: canvasTex(128, 84, flagDraw(HOLE.flag)), side: THREE.DoubleSide })); flagMesh.geometry.translate(0.375, 0, 0); flagMesh.position.set(HOLE.cup.x, gy + 1.95, HOLE.cup.z); S.add(flagMesh);
    S.add(new THREE.HemisphereLight(0xffffff, 0x8fb88f, 0.72)); sunLight = new THREE.DirectionalLight(0xfff4dc, 0.78); sunLight.position.set(-60, 90, 50); S.add(sunLight);
    const dimp = canvasTex(512, 256, (g, w, hh) => { g.fillStyle = '#FBFBFA'; g.fillRect(0, 0, w, hh); // 7.3: hoyuelos de verdad (muchos, pequeños, con sombra y brillo)
      for (let j = 0; j < 30; j++) { const lat = ((j + 0.5) / 30 - 0.5) * Math.PI, nI = Math.max(6, Math.round(64 * Math.cos(lat))), y = (j + 0.5) * (hh / 30), r = 2.9;
        for (let i = 0; i < nI; i++) { const x = ((i + (j % 2) * 0.5) / nI) * w, sx = Math.min(3, 1 / Math.max(0.2, Math.cos(lat)));
          g.save(); g.translate(x, y); g.scale(sx, 1); const gr = g.createRadialGradient(-0.7, -0.7, 0.2, 0, 0, r); gr.addColorStop(0, 'rgba(150,158,170,.55)'); gr.addColorStop(0.7, 'rgba(196,202,210,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(0.9, 0.9, 0.9, 0, 7); g.fill(); g.restore(); } } }, true); // hoyuelos
    ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 20), new THREE.MeshPhongMaterial({ map: dimp, bumpMap: dimp, bumpScale: 0.0006, color: 0xffffff, emissive: 0x2e2e2e, shininess: 60, specular: 0x8a8a8a })); S.add(ball);
    ballShadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 1.15, 18), new THREE.MeshBasicMaterial({ color: 0x1e5a2a, transparent: true, opacity: 0.35, depthWrite: false })); ballShadow.rotation.x = -Math.PI / 2; S.add(ballShadow);
    if (!cam) cam = new THREE.PerspectiveCamera(42, 1, 0.15, 2600);
    S.fog = new THREE.Fog(0xddf2ff, 140, 420);
  }
  function applyWeather() {
    const k = W.kind, sky = S.userData.sky.material.uniforms, u = groundMat.uniforms;
    const grey = k === 'lluvia' || k === 'granizo' ? 1 : k === 'nublado' ? 0.55 : 0;
    sky.uTop.value.set('#8AD6FF').lerp(new THREE.Color('#9AA9BC'), grey); sky.uMid.value.set('#BEE9FF').lerp(new THREE.Color('#C3CDD8'), grey); sky.uLow.value.set('#E6F7FF').lerp(new THREE.Color('#DDE3EA'), grey);
    u.uFog.value.set('#DDF2FF').lerp(new THREE.Color('#D3DAE2'), grey); st.fogN = u.uFogN.value = 140 * WEATHERS[k].fog; st.fogF = u.uFogF.value = 420 * WEATHERS[k].fog; u.uWet.value = k === 'lluvia' ? 1 : 0;
    S.userData.clouds.forEach((c, i) => { c.material.color.set(grey ? '#E4E9EF' : '#FFFFFF'); c.visible = k !== 'sol' || i % 2 === 0; });
    sunLight.intensity = grey ? 0.32 : 0.78; u.uHail.value = k === 'granizo' ? 1 : 0;
    if (S.fog) S.fog.color.copy(u.uFog.value);
    if (waterMat) waterMat.uniforms.uRain.value = k === 'lluvia' || k === 'granizo' ? 1 : 0;
    if (S.userData.pano) S.userData.pano.material.color.set(grey ? '#C3CAD3' : '#FFFFFF');
  }
  /* ------------------------------------------------------------------ 7. cámara */
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function introCam() {
    const midZ = (HOLE.tee.z + HOLE.cup.z) / 2, len = Math.abs(HOLE.cup.z - HOLE.tee.z);
    return [new THREE.Vector3(0, len * 1.3 + 30, midZ + len * 0.42), new THREE.Vector3(0, 0, midZ - len * 0.05)];
  }
  function los(a, bx, by, bz, n) { for (let i = 1; i < n; i++) { const t = i / n, x = a.x + (bx - a.x) * t, z = a.z + (bz - a.z) * t, y = a.y + (by - a.y) * t; if (h(x, z) > y - 0.06) return false; } return true; }
  function aimCam() {
    // detrás de la bola mirando al objetivo. Si una duna, un talud o el borde de un búnker tapa la bola o el hoyo,
    // prueba más cerca y más alto hasta ver las dos cosas (si se puede); encuadra la bola abajo y la bandera arriba.
    const b = st.b, putt = CLUBS[st.club].id === 'putt', base = putt ? 2.2 : 4.6, up = putt ? 0.8 : 0.95, dx = Math.sin(st.yaw), dz = Math.cos(st.yaw), gy = meshH(b.x, b.z), by = gy + BALL_R * 2;
    const key = [b.x.toFixed(2), b.z.toFixed(2), st.yaw.toFixed(3), st.club].join(); if (st.acK === key) return [st.acP.clone(), st.acL.clone()];
    const cx = HOLE.cup.x, cz = HOLE.cup.z, fy = h(cx, cz) + 1.3, wantFlag = cupD() > 4;
    let best = null; const rx = -dz, rz = dx; // derecha de la línea de tiro
    for (const k of [1, 1.35, 0.75, 1.8, 0.55, 2.4]) for (const lat of [0, -1.5, 1.5, -3, 3]) {
      if (best && best.flag && best.cost <= Math.abs(lat) * 0.6 + (k === 1 ? 0 : 1)) continue;
      const pos = new THREE.Vector3(b.x + dx * base * k + rx * lat, gy + up, b.z + dz * base * k + rz * lat);
      for (let r = 0; r <= 7; r += 0.25) {
        pos.y = gy + up + r; if (h(pos.x, pos.z) + 0.5 > pos.y || !los(pos, b.x, by, b.z, 12)) continue;
        const hb = Math.hypot(pos.x - b.x, pos.z - b.z), span = Math.atan2(pos.y - by, hb) - Math.atan2(pos.y - fy, Math.hypot(pos.x - cx, pos.z - cz)); // ¿caben bola y bandera en la pantalla?
        const flag = !wantFlag || (span < 0.5 && los(pos, cx, fy, cz, 24)), cost = r + Math.abs(lat) * 0.6 + (k === 1 ? 0 : k > 1 ? (k - 1) * 2 : (1 - k) * 1.5) + (flag ? 0 : 6);
        if (!best || cost < best.cost) best = { pos: pos.clone(), cost, r, flag, lat };
        if (flag) break;
      }
    }
    if (!best) best = { pos: new THREE.Vector3(b.x + dx * base, gy + up + 7, b.z + dz * base), r: 7, flag: false };
    const pos = best.pos, hd = Math.hypot(pos.x - b.x, pos.z - b.z), dep = Math.atan2(pos.y - by, hd);
    let pitch = dep - (putt ? 0.2 : 0.17); // bola a ~70 % de la altura
    if (wantFlag) { const fd = Math.atan2(pos.y - fy, Math.hypot(pos.x - cx, pos.z - cz)); if (fd - pitch < -0.25) pitch = Math.max(fd + 0.25, dep - 0.25); } // que la bandera quepa arriba
    const tx = b.x - dx * 30, tz = b.z - dz * 30, hx = tx - pos.x, hz = tz - pos.z, hl = Math.hypot(hx, hz) || 1;
    const look = new THREE.Vector3(pos.x + (hx / hl) * 10 * Math.cos(pitch), pos.y - 10 * Math.sin(pitch), pos.z + (hz / hl) * 10 * Math.cos(pitch));
    st.flagHidden = wantFlag && !best.flag; st.acK = key; st.acP = pos.clone(); st.acL = look.clone(); return [pos, look];
  }
  function fitIntro() {
    // encaja el hoyo entero (bola y bandera) en la parte de arriba, por encima de la tarjeta
    const t = introCam(), dir = t[0].clone().sub(t[1]).normalize(), tee = new THREE.Vector3(st.b.x, h(st.b.x, st.b.z), st.b.z + 6), cup = new THREE.Vector3(HOLE.cup.x, h(HOLE.cup.x, HOLE.cup.z), HOLE.cup.z - 8);
    if (cam.view && cam.view.enabled) cam.clearViewOffset();
    const at = (d) => { cam.position.copy(t[1]).addScaledVector(dir, d); cam.lookAt(t[1]); cam.updateMatrixWorld(); return [tee.clone().project(cam).y, cup.clone().project(cam).y]; };
    let lo = 40, hi = 900; for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2, [a, b] = at(m); if ((b - a) / 2 > 0.47) lo = m; else hi = m; }
    const [a, b] = at(hi); camPos.copy(cam.position); camLook.copy(t[1]); st.introShift = (1 - (a + b) / 2) / 2 - 0.44;
  }
  function toAim() { st.phase = 'aimfly'; st.camT = 0; st.camFrom = [camPos.clone(), camLook.clone()]; st.swing = null; refreshClubs(); }
  function updateCam(dt) {
    if (st.phase === 'splash' || st.phase === 'choice') { cam.position.copy(camPos); cam.lookAt(camLook); return; }
    const b = st.b;
    if (st.phase === 'intro') fitIntro();
    else if (st.phase === 'aim' || st.phase === 'swing') { const t = aimCam(); camPos.lerp(t[0], 1 - Math.exp(-dt * 12)); camLook.lerp(t[1], 1 - Math.exp(-dt * 12)); }
    else if (st.phase === 'aimfly' || st.phase === 'introfly') {
      st.camT += dt / (st.phase === 'introfly' ? 2.2 : 1.0); const u = Math.min(1, st.camT), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, to = aimCam();
      camPos.copy(st.camFrom[0]).lerp(to[0], e); camLook.copy(st.camFrom[1]).lerp(to[1], e);
      if (u >= 1) { st.phase = 'aim'; let seen = false; try { seen = localStorage.getItem('tq.golf3d.tut') === '1'; } catch (er) { /* nada */ } if (!seen && st.mode === 'lanzar') showTut(); }
    } else {
      const c = HOLE.cup, cy = h(c.x, c.z);
      if (!st.landed && b.mode === 'air') {
        st.flyT = (st.flyT || 0) + dt;
        const sp = Math.hypot(b.vx, b.vy, b.vz), hv = Math.hypot(b.vx, b.vz) || 1, back = 3 + Math.min(10, sp * 0.22), up = 0.8 + Math.min(3, sp * 0.06);
        const LP = st.landP;
        if (LP && st.flyT > 0.6 + ({ driver: 0.35, wood: 0.3, i5: 0.25, i7: 0.2, i9: 0.15, wedge: 0.1 }[CLUBS[st.club].id] || 0.2) && LP.d > 35) { // 7.3: corta un poco más tarde (más con los palos largos)
          // 7.3 (F4): cámara de TV: a un lado de donde va a caer, mirando la bola que llega (se ve avanzar y caer)
          const ux = LP.ux, uz = LP.uz, tx = LP.x + ux * 16 - uz * 9, tz = LP.z + uz * 16 + ux * 9, ty = Math.max(h(tx, tz) + 4.5, LP.y + 3.5);
          if (!st.tvCut) { st.tvCut = true; camPos.set(tx, ty, tz); camLook.set(b.x, b.y, b.z); } // corte limpio de cámara, como en la tele
          else { camPos.lerp(new THREE.Vector3(tx, ty, tz), 1 - Math.exp(-dt * 2.4)); camLook.lerp(new THREE.Vector3(b.x, b.y, b.z), 1 - Math.exp(-dt * 8)); }
        } else { camPos.lerp(new THREE.Vector3(b.x - (b.vx / hv) * back, b.y + up, b.z - (b.vz / hv) * back), 1 - Math.exp(-dt * 7)); camLook.set(b.x, b.y, b.z); }
      } else {
        // bola y hoyo en la misma línea vertical de la pantalla (el móvil es vertical): la cámara se pone detrás
        // de lo que tenga más cerca (la bola o el hoyo), así nunca pasa por encima de la bola de golpe
        const bx = b.sunk ? c.x : b.x, bz = b.sunk ? c.z : b.z, dx = c.x - bx, dz = c.z - bz, D = Math.max(1.5, Math.hypot(dx, dz)), up = 1.6 + D * 0.42, back = 2.5 + D * 0.55;
        if (!st.ru) { st.ru = { x: dx / D, z: dz / D }; const pb = Math.hypot(camPos.x - bx, camPos.z - bz), pc = Math.hypot(camPos.x - c.x, camPos.z - c.z); st.rside = pb <= pc ? 'ball' : 'cup'; }
        else if (D > 2.5) { const k = Math.min(1, dt * 1.2); st.ru.x += (dx / D - st.ru.x) * k; st.ru.z += (dz / D - st.ru.z) * k; const n = Math.hypot(st.ru.x, st.ru.z) || 1; st.ru.x /= n; st.ru.z /= n; }
        const ux = st.ru.x, uz = st.ru.z, ax = st.rside === 'ball' ? bx - ux * back : c.x + ux * back, az = st.rside === 'ball' ? bz - uz * back : c.z + uz * back;
        let p = new THREE.Vector3(ax, Math.max(h(bx, bz), cy, h(ax, az)) + up, az), l = new THREE.Vector3(bx + dx * 0.5, (h(bx, bz) + cy) / 2, bz + dz * 0.5);
        if (!b.sunk && b.mode === 'air') { const gb = h(b.x, b.z); l.lerp(new THREE.Vector3(b.x, b.y, b.z), Math.min(0.7, (b.y - gb) * 0.6)); p.y = Math.max(p.y, b.y + 1.2); } // mientras bota, la bola no se sale de la pantalla
        if (b.sunk) { p = new THREE.Vector3(c.x - 1.6, cy + 0.9, c.z + 1.4); l = new THREE.Vector3(c.x, cy, c.z); }
        camPos.lerp(p, 1 - Math.exp(-dt * 2.2)); camLook.lerp(l, 1 - Math.exp(-dt * 3)); if (!b.sunk) camPos.y = Math.max(camPos.y, h(camPos.x, camPos.z) + Math.min(up, 3.5));
      }
      const gy = h(camPos.x, camPos.z) + 0.4; if (camPos.y < gy) camPos.y = gy;
    }
    cam.position.copy(camPos); cam.lookAt(camLook);
  }
  /* ------------------------------------------------------------------ 8. sonidos (suaves, como en el minigolf) */
  let AC = null, OUT = null;
  // la app avisa al irse a segundo plano / volver (antes el sonido de fondo seguía sonando fuera de la app)
  window.TQ_PAUSE = () => { try { if (AC && AC.state === 'running') AC.suspend(); } catch (e) {} };
  window.TQ_RESUME = () => { try { if (AC && AC.state === 'suspended') AC.resume(); } catch (e) {} };
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.TQ_PAUSE(); else window.TQ_RESUME(); });
  const post = (o) => { try { if (window.TQBridge) window.TQBridge.postMessage(JSON.stringify(o)); } catch (e) { /* sin app */ } };
  function ac() { if (window.TQ_SFX === false) return null; try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); if (!OUT) { const g = AC.createGain(), f = AC.createBiquadFilter(); g.gain.value = 0.32; f.type = 'lowpass'; f.frequency.value = 2600; g.connect(f).connect(AC.destination); OUT = g; } return AC; } catch (e) { return null; } }
  function tone(f0, f1, dur, vol, delay) { const c = ac(); if (!c) return; const t0 = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g).connect(OUT); o.start(t0); o.stop(t0 + dur + 0.02); }
  function noise(dur, vol, fc) { const c = ac(); if (!c) return; const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = 0.7; g.gain.value = vol; s.connect(f).connect(g).connect(OUT); s.start(); }
  let HIB = null; // salida «brillante» para golpes y agua (sin el filtro suave del resto)
  function hib() { const c = ac(); if (!c) return null; if (!HIB) { const g = c.createGain(), f = c.createBiquadFilter(); g.gain.value = 0.36; f.type = 'lowpass'; f.frequency.value = 9000; g.connect(f).connect(c.destination); HIB = g; } return HIB; }
  function ping(freqs, decay, vol, delay) { const c = ac(), bus = hib(); if (!c || !bus) return; const t0 = c.currentTime + (delay || 0);
    freqs.forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(), v = vol / (1 + i * 0.6); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay / (1 + i * 0.35)); o.connect(g).connect(bus); o.start(t0); o.stop(t0 + decay + 0.05); }); }
  function burst(dur, vol, type, fc, q, delay) { const c = ac(), bus = hib(); if (!c || !bus) return; const t0 = c.currentTime + (delay || 0), n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-5 * i) / n); const sN = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); sN.buffer = buf; f.type = type; f.frequency.value = fc; f.Q.value = q || 0.8; g.gain.value = vol; sN.connect(f).connect(g).connect(bus); sN.start(t0); }
  function bubble(f0, dur, vol, delay, rise) { const c = ac(), bus = hib(); if (!c || !bus) return; const t0 = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (rise || 1.7), t0 + dur); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g).connect(bus); o.start(t0); o.stop(t0 + dur + 0.02); }
  function sweep(dur, vol, f0, f1, q, delay) { const c = ac(), bus = hib(); if (!c || !bus) return; const t0 = c.currentTime + (delay || 0), n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s2 = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s2.buffer = buf; f.type = 'bandpass'; f.Q.value = q || 1.2; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s2.connect(f).connect(g).connect(bus); s2.start(t0); }
  // ambiente de cada campo: viento suave, mar en los hoyos de costa, lluvia o granizo y pájaros con sol
  const AMB = { on: false };
  function ambStart() { const c = ac(), bus = hib(); if (!c || !bus || AMB.on) return; AMB.on = true; const mk = (type, fc, q) => { const n = c.sampleRate * 3, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); let b = 0; for (let i = 0; i < n; i++) { b = b * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = type === 'brown' ? b * 6 : Math.random() * 2 - 1; } const s2 = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s2.buffer = buf; s2.loop = true; f.type = type === 'brown' ? 'lowpass' : 'bandpass'; f.frequency.value = fc; f.Q.value = q || 0.5; g.gain.value = 0; s2.connect(f).connect(g).connect(bus); s2.start(); return g; };
    AMB.wind = mk('brown', 500); AMB.sea = mk('brown', 700); AMB.rain = mk('white', 5200, 0.4); AMB.nextBird = 2; }
  function ambUpdate(t) { if (!AMB.on || !AC) return; const c = AC, k = W.kind, coast = HOLE.seaZ != null || HOLE.ocean || HOLE.pano === 'standrews' || HOLE.pano === 'carnoustie', set = (g, v) => g.gain.setTargetAtTime(v, c.currentTime, 0.4);
    set(AMB.wind, (0.05 + W.kmh * 0.006) * (0.75 + 0.25 * Math.sin(t * 0.6) * Math.sin(t * 0.23)));
    set(AMB.sea, coast ? 0.05 + 0.07 * Math.max(0, Math.sin(t * 0.75)) ** 2 : 0);
    set(AMB.rain, k === 'lluvia' ? 0.07 : k === 'granizo' ? 0.05 : 0);
    if (k === 'granizo' && Math.random() < 0.25) ping([2500 + Math.random() * 3000], 0.02, 0.012 + Math.random() * 0.02);
    if ((k === 'sol' || k === 'nublado' || k === 'viento') && t > AMB.nextBird) { AMB.nextBird = t + 4 + Math.random() * 7; const f = 2600 + Math.random() * 2000, n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) { const d = i * (0.09 + Math.random() * 0.05); bubble(f * (0.9 + Math.random() * 0.25), 0.07, 0.03, d, 1.25 + Math.random() * 0.3); bubble(f * 1.3, 0.04, 0.015, d + 0.04, 0.8); } } }
  const SND = {
    // chapuzón: golpe contra el agua, la «burbuja» grande que sube y muchas burbujitas y gotas que caen
    splash: () => { burst(0.06, 0.6, 'lowpass', 1800, 0.7); burst(0.22, 0.35, 'bandpass', 700, 0.6, 0.01); bubble(170, 0.09, 0.3, 0.02, 2.6); bubble(240, 0.07, 0.18, 0.05, 2.2);
      for (let i = 0; i < 34; i++) bubble(500 + Math.random() * 2200, 0.02 + Math.random() * 0.04, 0.03 + Math.random() * 0.06, 0.06 + Math.random() * Math.random() * 0.9, 1.4 + Math.random() * 0.8);
      burst(0.6, 0.12, 'lowpass', 420, 0.6, 0.12); },
    tick: () => tone(660, 640, 0.04, 0.12),
    perfect: () => { tone(784, 784, 0.1, 0.16); tone(1046, 1046, 0.16, 0.14, 0.07); },
    hit: (k) => { tone(420 + k * 120, 260, 0.09, 0.5); noise(0.025, 0.12, 1200); },
    // el silbido del palo y el impacto de cada uno, como suenan de verdad
    club: (id, lie, k, q) => {
      q = q == null ? 0.8 : q; let r = () => 0.94 + Math.random() * 0.12, v = (0.55 + Math.min(1, k) * 0.45) * (0.85 + 0.3 * Math.random()), sw = id === 'putt' ? 0 : 0.05 + 0.1 * v;
      if (id !== 'putt' && lie !== 'sand') { if (q > 0.85) { burst(0.003, 0.5 * v, 'highpass', 5200 * r(), 0.7, 0.011); ping([3300 * r(), 5100 * r()], 0.06, 0.1 * v, 0.012); } else if (q < 0.5) { tone(150 * r(), 90, 0.09, 0.22 * v, 0.012); burst(0.06, 0.3 * v, 'lowpass', 600 * r(), 0.8, 0.012); v *= 0.75; } } // de lleno: chasquido limpio; mal golpe: sordo
      if (sw) sweep(0.16, sw, 350, 1600 + v * 900, 1.1);
      if (lie === 'sand') { burst(0.32, 0.55 * v, 'bandpass', 850, 0.7, 0.01); burst(0.16, 0.3 * v, 'lowpass', 260, 0.7, 0.01); burst(0.5, 0.08 * v, 'highpass', 3500, 0.7, 0.05); return; }
      if (id === 'driver' || id === 'wood') { const s2 = id === 'driver' ? 1 : 0.88; const rr = r(); burst(0.005, 0.75 * v, 'highpass', 3200 * rr, 0.7, 0.012); ping([1180 * s2 * rr, 2650 * s2 * rr, 4150 * s2 * r(), 5550 * s2 * rr, 7300 * s2 * r()], 0.1 + 0.08 * q, 0.24 * v, 0.012); burst(0.03, 0.22 * v, 'bandpass', 1900, 1.5, 0.012); tone(190, 120, 0.06, 0.14 * v, 0.012); return; }
      if (id === 'putt') { burst(0.003, 0.25 * v, 'highpass', 3000); ping([1350, 2950], 0.05, 0.2 * v); tone(420, 380, 0.04, 0.12 * v); return; }
      const tf = lie === 'rough' ? 0.5 : 0.28; // los hierros: «clic» seco, el golpe comprimido y el chasquido del césped (la chuleta)
      burst(0.004, 0.7 * v, 'highpass', 3600 * r(), 0.7, 0.012); burst(0.025, 0.3 * v, 'bandpass', 1500 * r(), 2, 0.012); ping([(id === 'wedge' ? 2300 : id === 'i9' ? 2600 : id === 'i7' ? 2900 : 3200) * r(), (id === 'wedge' ? 3900 : 4700) * r()], 0.025 + 0.025 * q, 0.12 * v, 0.012); burst(0.14, tf * v, 'lowpass', 900, 0.8, 0.02); burst(0.09, 0.12 * v, 'highpass', 2500, 0.6, 0.03);
    },
    // botes: en el green un «tup» blando, en la calle más seco, en la arena «pff»
    land: (s, v) => { const k = Math.min(1, v / 18); if (s === 'sand') { burst(0.18, 0.25 + k * 0.2, 'bandpass', 700, 0.7); return; } if (s === 'rough') { burst(0.1, 0.12 + k * 0.15, 'lowpass', 500, 0.7); tone(160, 110, 0.06, 0.08 + k * 0.1); return; } tone(s === 'green' ? 210 : 260, s === 'green' ? 150 : 170, 0.06, 0.1 + k * 0.2); burst(0.02, 0.06 + k * 0.1, 'bandpass', 1200, 1); },
    lip: () => tone(700, 620, 0.06, 0.15),
    leaf: () => { burst(0.25, 0.22, 'bandpass', 2400, 0.6); burst(0.18, 0.12, 'bandpass', 1200, 0.8, 0.05); tone(420, 300, 0.05, 0.08, 0.03); },
    water: () => { noise(0.4, 0.25, 600); tone(380, 180, 0.3, 0.15); },
    sink: () => { tone(520, 420, 0.07, 0.4); tone(470, 380, 0.07, 0.3, 0.08); tone(430, 350, 0.09, 0.22, 0.15); [523, 659, 784].forEach((f, i) => tone(f, f, 0.32, 0.22, 0.32 + i * 0.1)); },
    // aplausos del público (birdie o mejor más fuertes)
    clap: (k) => { const n = Math.round(40 + k * 60); for (let i = 0; i < n; i++) { const d = 0.35 + Math.random() * (1.6 + k) * (Math.random() < 0.7 ? 0.6 : 1); burst(0.012, (0.05 + Math.random() * 0.05) * (0.6 + k * 0.6) * Math.max(0.2, 1 - (d - 0.35) / (2 + k)), 'bandpass', 1300 + Math.random() * 1400, 1.2, d); } },
  };  const vib3 = (p) => { try { if (window.TQBridge) post({ ev: 'vib', p }); else if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin vibración */ } };
  { const VB = { club: 35, land: 15, lip: 25, water: [60, 40, 60], sink: [30, 40, 90], perfect: [20, 30, 40], splash: 40, leaf: 10 }; Object.keys(SND).forEach((k) => { const f = SND[k]; SND[k] = (...a) => { if (VB[k]) vib3(VB[k]); return f(...a); }; }); }

  /* ------------------------------------------------------------------ 9. interfaz */
  let ui, el = {}, fx, fxg;
  const ICON = {
    driver: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M23 3 L13 20" stroke="#45516D" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="9.5" cy="22.5" rx="7.5" ry="5" fill="#22324F" transform="rotate(-20 9.5 22.5)"/><ellipse cx="7.5" cy="21" rx="2.6" ry="1.5" fill="#5B6478" transform="rotate(-20 7.5 21)"/></svg>',
    wood: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M23 3 L13 20" stroke="#45516D" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="10" cy="22.5" rx="6" ry="4" fill="#7A4A2A" transform="rotate(-20 10 22.5)"/><ellipse cx="8.5" cy="21.4" rx="2" ry="1.1" fill="#C98B55" transform="rotate(-20 8.5 21.4)"/></svg>',
    iron: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M22 3 L13 20" stroke="#45516D" stroke-width="2.5" stroke-linecap="round"/><path d="M13 19 L5 25 Q4 27 6 27 L15 25 Z" fill="#B9C6D8" stroke="#8A97AB" stroke-width="1.2"/></svg>',
    wedge: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M22 3 L14 19" stroke="#45516D" stroke-width="2.5" stroke-linecap="round"/><path d="M14 18 L6 22 Q4 26 8 27 L16 24 Z" fill="#D9E2EC" stroke="#8A97AB" stroke-width="1.2"/><path d="M8 24 l6 -2 M9 26 l6 -2" stroke="#8A97AB" stroke-width=".8"/></svg>',
    putter: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M21 3 L15 21" stroke="#45516D" stroke-width="2.5" stroke-linecap="round"/><rect x="6" y="21" width="14" height="5" rx="2" fill="#22324F"/><rect x="8" y="22" width="4" height="1.5" rx=".7" fill="#FFC247"/></svg>',
  };
  const WICON = {
    sol: '<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#FFC247"/><g stroke="#FFC247" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></g></svg>',
    viento: '<svg width="22" height="22" viewBox="0 0 24 24"><g stroke="#5BB8F5" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 14h15a3 3 0 1 1-3 3"/></g></svg>',
    nublado: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11 2 3 3 0 0 0 1 6z" fill="#B9C6D8"/></svg>',
    lluvia: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11 2 3 3 0 0 0 1 6z" fill="#9AA9BC"/><g stroke="#5BB8F5" stroke-width="2" stroke-linecap="round"><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/></g></svg>',
    granizo: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11 2 3 3 0 0 0 1 6z" fill="#9AA9BC"/><g fill="#FFFFFF" stroke="#9AA9BC"><circle cx="8" cy="19" r="1.6"/><circle cx="12" cy="20.5" r="1.6"/><circle cx="16" cy="19" r="1.6"/></g></svg>',
  };
  function buildUI(root) {
    ui = document.createElement('div'); ui.className = 'g3'; root.appendChild(ui);
    fx = document.createElement('canvas'); fx.className = 'g3-fx'; ui.appendChild(fx); fxg = fx.getContext('2d');
    ui.insertAdjacentHTML('beforeend', `
    <div class="g3-top" id="g3top"><div class="g3-card"><div class="g3-hole" id="g3info"></div><div class="g3-dist2"><b id="g3d">0 m</b><span>al hoyo</span></div></div>
      <div class="g3-row"><button class="g3-pill g3-small2 g3-strb" id="g3str">Golpes 0</button><div class="g3-pill g3-small2 g3-weather" id="g3w"></div></div></div>
    <canvas class="g3-mini" id="g3mini" width="180" height="270" aria-label="Mapa del hoyo"></canvas>
    <button class="g3-mode g3-pill" id="g3mode"></button><button class="g3-slb g3-pill" id="g3slope"></button><button class="g3-help g3-pill" id="g3help" aria-label="Cómo se juega">?</button>
    <div class="g3-tut" id="g3tut"><div class="g3-tutbox"><canvas id="g3tutc" width="520" height="400"></canvas><div class="g3-tuttxt" id="g3tuttxt"></div><div class="g3-tutdots" id="g3tutdots"></div><button class="g3-btn g3-small" id="g3tutok">¡Entendido!</button></div></div>
    <div class="g3-msg" id="g3msg"></div><div class="g3-toast" id="g3toast"></div>
    <div class="g3-drop" id="g3drop"><div class="g3-dbox"><div class="g3-title">¡Al agua!</div><div class="g3-sub">Llevas un golpe de castigo. ¿Desde dónde sigues?</div><button class="g3-btn" id="g3dropb">Dropar junto al agua</button><button class="g3-btn g3-btn2" id="g3repb">Repetir desde donde tiraste</button></div></div>
    <div class="g3-load" id="g3load"><svg class="g3-lbg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g3ls" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FCBFF"/><stop offset=".6" stop-color="#D2F0FF"/></linearGradient></defs><rect width="400" height="800" fill="url(#g3ls)"/><circle cx="320" cy="140" r="38" fill="#FFE27A"/><g fill="#fff" opacity=".9"><ellipse cx="80" cy="170" rx="46" ry="16"/><ellipse cx="110" cy="158" rx="30" ry="18"/><ellipse cx="270" cy="250" rx="40" ry="13"/><ellipse cx="292" cy="241" rx="24" ry="14"/></g><path d="M 0 350 Q 70 300 150 325 T 300 310 T 400 300 V 800 H 0 Z" fill="#A9E6B2"/><g fill="#3E8B4A"><circle cx="40" cy="330" r="16"/><circle cx="62" cy="322" r="20"/><circle cx="352" cy="308" r="18"/><circle cx="374" cy="300" r="14"/></g><path d="M 0 390 Q 100 345 200 370 T 400 360 V 800 H 0 Z" fill="#7BD88A"/><path d="M 0 470 Q 120 430 240 455 T 400 445 V 800 H 0 Z" fill="#5CCB6A"/><ellipse cx="300" cy="390" rx="48" ry="11" fill="#9BEAA6"/><path d="M 300 390 V 320" stroke="#F2D35C" stroke-width="3" stroke-linecap="round"/><path d="M 300 320 l 24 8 -24 8 z" fill="#FF5A6E"/><ellipse cx="300" cy="391" rx="5" ry="2" fill="#1B3A25"/></svg><div class="g3-lbox"><div class="g3-lhead"><span class="g3-tag" id="g3ltag"></span><div class="g3-lname" id="g3ltit"></div><div class="g3-lwhere" id="g3lwhere"></div></div><svg class="g3-ltiny" viewBox="0 0 250 210" aria-hidden="true"><g class="g3-lclub"><path d="M186 130 L214 190" stroke="#45516D" stroke-width="5" stroke-linecap="round"/><path d="M207 188 Q217 198 232 192 Q229 185 216 183Z" fill="#22324F"/></g><rect x="22" y="112" width="196" height="78" rx="32" fill="#D5E3F1"/><g fill="#FFFFFF"><rect x="22" y="102" width="196" height="78" rx="32"/><circle cx="70" cy="104" r="38"/><circle cx="124" cy="80" r="52"/><circle cx="176" cy="106" r="36"/></g><path d="M80 60 C86 12 162 12 168 60 Q124 48 80 60Z" fill="#4CD964"/><path d="M154 54 Q186 46 204 58 Q180 66 158 61Z" fill="#2E8B4A"/><circle cx="124" cy="20" r="5" fill="#2E8B4A"/><ellipse cx="100" cy="132" rx="7.5" ry="10" fill="#22324F"/><ellipse cx="144" cy="132" rx="7.5" ry="10" fill="#22324F"/><circle cx="102.5" cy="128" r="2.8" fill="#fff"/><circle cx="146.5" cy="128" r="2.8" fill="#fff"/><ellipse cx="82" cy="150" rx="11" ry="6" fill="#FFB3C7"/><ellipse cx="162" cy="150" rx="11" ry="6" fill="#FFB3C7"/><path d="M107 148 Q122 161 137 148" stroke="#22324F" stroke-width="5" fill="none" stroke-linecap="round"/></svg><div class="g3-lsh"></div><div class="g3-lbar"><i id="g3lbar"></i></div><div class="g3-lfoot"><div class="g3-linfo" id="g3linfo"></div><div class="g3-sc g3-lcard" id="g3lcard"></div></div></div></div>
    <div class="g3-bottom" id="g3bottom">
      <div class="g3-clubsel"><button class="g3-arrow" id="g3prev" aria-label="Palo anterior">‹</button><div class="g3-club" id="g3club"></div><button class="g3-arrow" id="g3next" aria-label="Palo siguiente">›</button></div>
      <div class="g3-hint" id="g3hint">↔ apunta · ↓ tira para cargar y suelta</div>
    </div>
    <div class="g3-swing" id="g3swing"><div class="g3-pwr" id="g3pwr"><div class="g3-pfill" id="g3pfill"></div><div class="g3-pline" id="g3pline"></div><div class="g3-pneedle" id="g3pneedle"></div><span class="g3-plbl" id="g3plbl"></span><div class="g3-tempo" id="g3tempo"><i class="g3-tzone"></i><b id="g3tdot"></b><span>lento</span><span>rápido</span></div></div><div class="g3-swing-lbl" id="g3swlbl"></div></div>
    <div class="g3-intro" id="g3intro"><span class="g3-tag" id="g3tag"></span><span class="g3-where" id="g3where"></span><div class="g3-title" id="g3title"></div>
      <div class="g3-sub" id="g3sub"></div><div class="g3-sc" id="g3icard"></div><button class="g3-btn" id="g3play">Jugar el hoyo</button><button class="g3-other" id="g3other">‹ Menú</button></div>
    <div class="g3-big" id="g3big"><div class="g3-bigbox"><canvas id="g3bigc" width="720" height="1080"></canvas><button class="g3-slb g3-slb2 g3-pill" id="g3slope2"></button>
      <div class="g3-bigbar"><button class="g3-arrow" id="g3zout" aria-label="Alejar">−</button><span>1 dedo: apunta · 2 dedos o doble toque: acerca donde quieras</span><button class="g3-arrow" id="g3zin" aria-label="Acercar">+</button></div><div class="g3-sc g3-scw" id="g3bcard"></div><button class="g3-btn g3-small" id="g3close">Listo</button></div></div>
    <div class="g3-end" id="g3end"><div class="g3-title" id="g3endt"></div><div class="g3-sub" id="g3ends"></div><div class="g3-sc" id="g3ecard"></div><button class="g3-btn" id="g3nexth">Siguiente hoyo</button><div class="g3-endrow"><button class="g3-other" id="g3again">Repetir este hoyo</button><button class="g3-other" id="g3tomenu">Menú</button></div></div>
    <div class="g3-pop" id="g3pop"><div class="g3-popbox"><div class="g3-sc g3-scw" id="g3pcard"></div><button class="g3-btn g3-small" id="g3popok">Seguir</button></div></div>
    <div class="g3-menu" id="g3menu"><div class="g3-mbox">
      <div class="g3-mhead"><svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="22" fill="#E3F9E6"/><path d="M17 36V10" stroke="#22324F" stroke-width="2.6" stroke-linecap="round"/><path d="M17 11l14 5-14 5z" fill="#FF5A6E"/><ellipse cx="23" cy="36.5" rx="11" ry="3.2" fill="#7BE88A"/><circle cx="29" cy="34" r="2.6" fill="#fff" stroke="#C9D3DF"/></svg><div><div class="g3-mtitle">Golf de Tiny</div><div class="g3-msub">Hoyos de leyenda de todo el mundo</div></div></div>
      <div class="g3-steps" id="g3msteps"></div>
      <div class="g3-mstep" data-s="1"><div class="g3-mq">¿Cuántos hoyos?</div><div class="g3-mcards" id="g3mn"></div><div class="g3-mnote" id="g3mnote"></div><div class="g3-mart"><svg class="g3-mhill" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 Q90 20 200 48 T400 40 V120 H0Z" fill="#A9E6B2"/><path d="M0 84 Q120 52 240 74 T400 66 V120 H0Z" fill="#7BD88A"/><ellipse cx="318" cy="64" rx="40" ry="9" fill="#9BEAA6"/><path d="M318 64 V14" stroke="#F2D35C" stroke-width="3" stroke-linecap="round"/><path d="M318 14 l22 7 -22 7z" fill="#FF5A6E"/></svg><svg class="g3-mtiny" viewBox="0 0 250 210" aria-hidden="true"><g class="g3-lclub"><path d="M186 130 L214 190" stroke="#45516D" stroke-width="5" stroke-linecap="round"/><path d="M207 188 Q217 198 232 192 Q229 185 216 183Z" fill="#22324F"/></g><rect x="22" y="112" width="196" height="78" rx="32" fill="#D5E3F1"/><g fill="#FFFFFF"><rect x="22" y="102" width="196" height="78" rx="32"/><circle cx="70" cy="104" r="38"/><circle cx="124" cy="80" r="52"/><circle cx="176" cy="106" r="36"/></g><path d="M80 60 C86 12 162 12 168 60 Q124 48 80 60Z" fill="#4CD964"/><path d="M154 54 Q186 46 204 58 Q180 66 158 61Z" fill="#2E8B4A"/><circle cx="124" cy="20" r="5" fill="#2E8B4A"/><ellipse cx="100" cy="132" rx="7.5" ry="10" fill="#22324F"/><ellipse cx="144" cy="132" rx="7.5" ry="10" fill="#22324F"/><circle cx="102.5" cy="128" r="2.8" fill="#fff"/><circle cx="146.5" cy="128" r="2.8" fill="#fff"/><ellipse cx="82" cy="150" rx="11" ry="6" fill="#FFB3C7"/><ellipse cx="162" cy="150" rx="11" ry="6" fill="#FFB3C7"/><path d="M107 148 Q122 161 137 148" stroke="#22324F" stroke-width="5" fill="none" stroke-linecap="round"/></svg></div></div>
      <div class="g3-mstep" data-s="2"><div class="g3-mq">¿Cómo quieres jugar?</div><div class="g3-mlbl">Tiempo</div><div class="g3-chips" id="g3mw"></div>
        <div class="g3-mlbl" style="display:none">Golpe</div><div class="g3-seg" id="g3mm" style="display:none"><button data-m="lanzar">Lanzar ↑</button><button data-m="soltar">Soltar</button></div><div class="g3-mnote" id="g3mmnote" style="display:none"></div></div>
      <div class="g3-mstep" data-s="3"><div class="g3-mq">Elige el hoyo</div><div class="g3-seg g3-ptabs" id="g3mp"><button data-p="3">Par 3</button><button data-p="4">Par 4</button><button data-p="5">Par 5</button></div><div class="g3-holes" id="g3mholes"></div></div>
      <div class="g3-mnav"><button class="g3-mback" id="g3mback">‹ Atrás</button><button class="g3-btn" id="g3go">Siguiente</button></div></div></div>`);
    trDom(ui);
    ['g3slope', 'g3slope2', 'g3msteps', 'g3mback', 'g3mp', 'g3mmnote', 'g3str', 'g3toast', 'g3drop', 'g3dropb', 'g3repb', 'g3load', 'g3ltag', 'g3lwhere', 'g3linfo', 'g3ltit', 'g3lbar', 'g3lcard', 'g3top', 'g3icard', 'g3bcard', 'g3ecard', 'g3pop', 'g3pcard', 'g3popok', 'g3menu', 'g3mn', 'g3mnote', 'g3mholes', 'g3mw', 'g3mm', 'g3go', 'g3tomenu', 'g3info', 'g3mode', 'g3help', 'g3tut', 'g3tutc', 'g3tuttxt', 'g3tutdots', 'g3tutok', 'g3w', 'g3mini', 'g3msg', 'g3bottom', 'g3prev', 'g3next', 'g3club', 'g3hint', 'g3swing', 'g3swlbl', 'g3pwr', 'g3pfill', 'g3pline', 'g3pneedle', 'g3plbl', 'g3tdot', 'g3tempo', 'g3intro', 'g3d', 'g3tag', 'g3where', 'g3title', 'g3sub', 'g3other', 'g3nexth', 'g3play', 'g3big', 'g3bigc', 'g3zin', 'g3zout', 'g3close', 'g3end', 'g3endt', 'g3ends', 'g3again'].forEach((id) => (el[id] = ui.querySelector('#' + id)));
    el.g3play.onclick = () => { ac(); ambStart(); post({ ev: 'play' }); el.g3intro.style.display = 'none'; st.phase = 'introfly'; st.camT = 0; st.camFrom = [camPos.clone(), camLook.clone()]; };
    el.g3prev.onclick = () => { if (st.phase === 'aim') { st.club = Math.max(0, st.club - 1); refreshClubs(); SND.tick(); } };
    el.g3next.onclick = () => { if (st.phase === 'aim') { st.club = Math.min(CLUBS.length - 1, st.club + 1); refreshClubs(); SND.tick(); } };

    el.g3again.onclick = () => { if (st.round) { st.round = null; loadHole(HI, true); } else restart(); };
    el.g3nexth.onclick = () => { const R = st.round; if (R && R.i < R.list.length - 1) { R.i++; goHole(R.list[R.i]); } else if (R) { startRound(R.list.length); } else goHole((HI + 1) % HOLES.length); };
    el.g3other.onclick = (e) => { e.stopPropagation(); showMenu(); };
    el.g3dropb.onclick = (e) => { e.stopPropagation(); afterWater(true); }; el.g3repb.onclick = (e) => { e.stopPropagation(); afterWater(false); };
    el.g3end.addEventListener('pointerdown', () => { st.endHold = true; });
    el.g3big.onclick = (e) => { if (e.target === el.g3big) el.g3big.style.display = 'none'; };
    el.g3tomenu.onclick = (e) => { e.stopPropagation(); showMenu(); };
    el.g3str.onclick = (e) => { e.stopPropagation(); if (st.phase === 'intro' || st.phase === 'end') return; el.g3pcard.innerHTML = cardHTML(); el.g3pop.style.display = 'flex'; };
    el.g3popok.onclick = (e) => { e.stopPropagation(); el.g3pop.style.display = 'none'; };
    menuInit();
    introText();
    el.g3mini.onclick = (e) => { e.stopPropagation(); if (st.phase === 'aim' || st.phase === 'flight') { el.g3big.style.display = 'flex';
      if (cupD() < 45) { // v8: cerca del green, el mapa grande se abre ya acercado al green (para leer las caídas)
        if (!el.mapImg) el.mapImg = paintMap(720, 1080); const M = el.mapImg, c = el.g3bigc, k = c.width / M.c.width, gw = (M.px(G0.x + G0.rx + 3) - M.px(G0.x - G0.rx - 3)) * k, gh = Math.abs(M.pz(G0.z + G0.rz + 3) - M.pz(G0.z - G0.rz - 3)) * k;
        st.map.zoom = Math.max(1, Math.min(5, Math.min((c.width * 0.86) / gw, (c.height * 0.7) / gh))); st.map.cx = M.px((G0.x + st.b.x) / 2 * 0 + G0.x) * k; st.map.cz = M.pz(G0.z) * k; }
      drawMap(el.g3bigc, true); el.g3bcard.innerHTML = cardHTML(); } };
    el.g3close.onclick = () => (el.g3big.style.display = 'none');
    el.g3zin.onclick = () => { const c = el.g3bigc; st.map.zoomAt(c.width / 2, c.height / 2, st.map.zoom * 1.4); };
    el.g3zout.onclick = () => { const c = el.g3bigc; st.map.zoomAt(c.width / 2, c.height / 2, st.map.zoom / 1.4); };
    bigMapInput();
    st.mode = 'lanzar'; // 7.3 (F4): «Soltar» desactivado (Jose); el botón de «Caídas» ocupa su sitio
    const setMode = () => { el.g3mode.innerHTML = `${T('Golpe:')} <b>${T(st.mode === 'lanzar' ? 'lanzar ↑' : 'soltar')}</b>`; el.g3hint.textContent = T(st.mode === 'lanzar' ? '↔ apunta · ↓ prepara despacio · ↑ lanza' : '↔ apunta · ↓ tira para cargar y suelta'); };
    el.g3mode.onclick = (e) => { e.stopPropagation(); st.mode = st.mode === 'lanzar' ? 'soltar' : 'lanzar'; try { localStorage.setItem('tq.golf3d.mode', st.mode); } catch (er) { /* nada */ } setMode(); SND.tick(); };
    setMode(); el.setMode = setMode;
    // v8: mapa de caídas por colores (se enciende y se apaga; se recuerda)
    try { st.slopeOn = localStorage.getItem('tq.golf3d.slopes') !== '0'; } catch (er) { st.slopeOn = true; }
    const setSl = () => { const h2 = `<i class="g3-sldot"></i>${T('Caídas')} <b>${T(st.slopeOn ? 'sí' : 'no')}</b>`; el.g3slope.innerHTML = h2; el.g3slope2.innerHTML = h2; el.g3slope.classList.toggle('off', !st.slopeOn); el.g3slope2.classList.toggle('off', !st.slopeOn); };
    const togSl = (e) => { e.stopPropagation(); st.slopeOn = !st.slopeOn; try { localStorage.setItem('tq.golf3d.slopes', st.slopeOn ? '1' : '0'); } catch (er) { /* nada */ } setSl(); SND.tick(); drawMap(el.g3mini, false); if (el.g3big.style.display === 'flex') drawMap(el.g3bigc, true); };
    el.g3slope.onclick = togSl; el.g3slope2.onclick = togSl; setSl();
    el.g3help.onclick = (e) => { e.stopPropagation(); showTut(); };
    el.g3tutok.onclick = (e) => { e.stopPropagation(); el.g3tut.style.display = 'none'; st.tutOn = false; try { localStorage.setItem('tq.golf3d.tut', '1'); } catch (er) { /* nada */ } };
    el.mapImg = null;
  }
  function refreshClubs() { if (!el.g3club) return; const c = CLUBS[st.club]; el.g3club.innerHTML = `${ICON[c.icon]}<div><b>${T(c.name)}</b><span>${c.carry ? c.carry + ' m' : TF('hasta {d} m', { d: Math.round(puttMax()) })}</span></div>`; }
  function weatherHTML() {
    // flecha del viento vista desde la cámara (hacia dónde empuja en pantalla)
    const cf = new THREE.Vector3(); cam.getWorldDirection(cf); const right = new THREE.Vector3(-cf.z, 0, cf.x).normalize(), fwd = new THREE.Vector3(cf.x, 0, cf.z).normalize();
    const sx = W.x * right.x + W.z * right.z, sy = W.x * fwd.x + W.z * fwd.z, ang = (Math.atan2(-sy, sx) * 180) / Math.PI;
    return `${WICON[W.kind]}<span>${T(WEATHERS[W.kind].name)}</span>${W.kmh ? `<svg width="18" height="18" viewBox="0 0 20 20" style="transform:rotate(${ang.toFixed(0)}deg)"><path d="M3 10h11M10 5l5 5-5 5" stroke="#22324F" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><b>${W.kmh} km/h</b>` : ''}`;
  }
  // v8: miniatura del mapa de cada hoyo para el selector (se pinta una vez y se guarda)
  const THUMB = {};
  function holeThumb(i) {
    const H = HOLES[i]; if (THUMB[H.id]) return THUMB[H.id];
    const H0 = HOLE; HOLE = H; derive();
    const w = 56, hh = 84, c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'), im = g.createImageData(w, hh);
    try {
      for (let j = 0; j < hh; j++) for (let i2 = 0; i2 < w; i2++) {
        const x = MAPB.x0 + ((i2 + 0.5) / w) * (MAPB.x1 - MAPB.x0), z = MAPB.z1 + ((j + 0.5) / hh) * (MAPB.z0 - MAPB.z1), s = surf(x, z);
        let col = s === 'green' ? [160, 238, 156] : s === 'ante' || s === 'tee' || s === 'fair' ? [136, 226, 140] : s === 'sand' ? [247, 229, 184] : s === 'beach' ? [242, 226, 184] : s === 'sea' ? [91, 184, 245] : s === 'ob' ? [120, 170, 110] : [92, 203, 106];
        if (s === 'rough' && HOLE.land && landD(x, z) > 0.5) col = MAPROCK(); else if (s === 'rough' && HOLE.dry) col = [150, 196, 100];
        const o = (j * w + i2) * 4; im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      const px = (x) => ((x - MAPB.x0) / (MAPB.x1 - MAPB.x0)) * w, pz = (z) => ((z - MAPB.z1) / (MAPB.z0 - MAPB.z1)) * hh;
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(px(H.tee.x), pz(H.tee.z), 2.2, 0, 7); g.fill(); // salida
      const fx = px(H.cup.x), fz = pz(H.cup.z); g.strokeStyle = '#22324F'; g.lineWidth = 1; g.beginPath(); g.moveTo(fx, fz); g.lineTo(fx, fz - 8); g.stroke(); g.fillStyle = '#FF5A6E'; g.beginPath(); g.moveTo(fx, fz - 8); g.lineTo(fx + 5, fz - 6.5); g.lineTo(fx, fz - 5); g.fill(); // bandera
      THUMB[H.id] = c.toDataURL();
    } catch (e) { THUMB[H.id] = ''; }
    HOLE = H0; derive();
    return THUMB[H.id];
  }
  const MAPROCK = () => { const c = new THREE.Color(HOLE.land.rock); return [c.r * 255, c.g * 255, c.b * 255]; };
  // 7.3: lo pesado del mapa se hace poco a poco entre fotogramas (≤ 5 ms cada uno): primero un mapa rápido y luego el bueno
  let BG = null;
  function bgStart() { const H0 = HI; BG = { H0, list: [['map', paintMapGen(720, 1080, 2)], ['tile', greenTileGen()]] }; }
  function bgRun() { if (!BG) return; if (BG.H0 !== HI) { BG = null; return; } const t0 = performance.now(); while (BG && performance.now() - t0 < 5) { const [k, g] = BG.list[0], r = g.next(); if (r.done) { if (k === 'map') el.mapImg = r.value; else st.gTile = r.value; BG.list.shift(); if (!BG.list.length) BG = null; } } }
  function paintMap(W2, H2, q) { const g = paintMapGen(W2, H2, q || 2); let r = g.next(); while (!r.done) r = g.next(); return r.value; }
  function* paintMapGen(W2, H2, q) {
    const w = Math.round(W2 / q), hh = Math.round(H2 / q), c0 = document.createElement('canvas'); c0.width = w; c0.height = hh; const g = c0.getContext('2d');
    const im = g.createImageData(w, hh);
    for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
      const x = MAPB.x0 + (i / w) * (MAPB.x1 - MAPB.x0), z = MAPB.z1 + (j / hh) * (MAPB.z0 - MAPB.z1), s = surf(x, z);
      let col = s === 'green' ? [160, 238, 156] : s === 'ante' || s === 'tee' || s === 'fair' ? [136, 226, 140] : s === 'sand' ? [247, 229, 184] : s === 'beach' ? [242, 226, 184] : s === 'sea' ? [91, 184, 245] : [92, 203, 106];
      if (s === 'rough') { const t = Math.sin(x * 2.1) * Math.cos(z * 1.7); col = HOLE.land && landD(x, z) > 0.5 ? MAPROCK() : HOLE.dry ? [150, 196, 100] : col; col = [col[0] + t * 8, col[1] + t * 8, col[2] + t * 6]; }
      const e = 0.4, l = s === 'sea' ? 1 : Math.max(0.6, Math.min(1.4, 1 + (h(x - e, z) - h(x + e, z)) * 0.5 + (h(x, z - e) - h(x, z + e)) * 0.35)), o = (j * w + i) * 4;
      im.data[o] = col[0] * l; im.data[o + 1] = col[1] * l; im.data[o + 2] = col[2] * l; im.data[o + 3] = 255;
      if (i === w - 1 && j % 6 === 5) yield 0;
    }
    g.putImageData(im, 0, 0);
    const c = document.createElement('canvas'); c.width = W2; c.height = H2; const g2 = c.getContext('2d'); g2.imageSmoothingEnabled = true; g2.drawImage(c0, 0, 0, W2, H2);
    return { c, px: (x) => ((x - MAPB.x0) / (MAPB.x1 - MAPB.x0)) * W2, pz: (z) => ((z - MAPB.z1) / (MAPB.z0 - MAPB.z1)) * H2 };
  }
  function bigMapInput() {
    // 1 dedo: apuntar · 2 dedos: acercar y mover el mapa donde quieras · rueda: acerca donde está el ratón · doble toque: acerca ahí
    st.map = { zoom: 1, cx: null, cz: null }; const cv = el.g3bigc, pts = new Map(); let pinch = null, drag = null, lastTap = 0;
    const toCanvas = (x, y) => { const r = cv.getBoundingClientRect(); return [((x - r.left) / r.width) * cv.width, ((y - r.top) / r.height) * cv.height]; };
    const zoomAt = (px, py, nz) => { const M = st.map, z0 = M.zoom, c0 = mapCenter(cv); const wx = c0[0] + (px - cv.width / 2) / z0, wy = c0[1] + (py - cv.height / 2) / z0; M.zoom = Math.max(1, Math.min(5, nz)); M.cx = wx - (px - cv.width / 2) / M.zoom; M.cz = wy - (py - cv.height / 2) / M.zoom; drawMap(cv, true); };
    cv.addEventListener('pointerdown', (e) => { e.stopPropagation(); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* nada */ } pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()], m = toCanvas((a.x + b.x) / 2, (a.y + b.y) / 2); pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: st.map.zoom, m, c: mapCenter(cv) }; drag = null; }
      else { const now = performance.now(); if (now - lastTap < 300) { const q = toCanvas(e.clientX, e.clientY); zoomAt(q[0], q[1], st.map.zoom * 2 > 5 ? 1 : st.map.zoom * 2); } lastTap = now; drag = { x: e.clientX, yaw: st.yaw }; } });
    cv.addEventListener('pointermove', (e) => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], m = toCanvas((a.x + b.x) / 2, (a.y + b.y) / 2), M = st.map; M.zoom = Math.max(1, Math.min(5, (pinch.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d));
        // el punto del mapa que estaba bajo los dedos se queda bajo los dedos
        const wx = pinch.c[0] + (pinch.m[0] - cv.width / 2) / pinch.z, wy = pinch.c[1] + (pinch.m[1] - cv.height / 2) / pinch.z; M.cx = wx - (m[0] - cv.width / 2) / M.zoom; M.cz = wy - (m[1] - cv.height / 2) / M.zoom; }
      else if (drag && st.phase === 'aim') st.yaw = drag.yaw - (e.clientX - drag.x) * 0.004; drawMap(cv, true); });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const q = toCanvas(e.clientX, e.clientY); zoomAt(q[0], q[1], st.map.zoom * (e.deltaY < 0 ? 1.15 : 0.87)); }, { passive: false });
    st.map.zoomAt = zoomAt;
  }
  function mapCenter(c) { const M = st.map, w = c.width, hh = c.height, z = M.zoom, cl = (v, m) => Math.max(m / 2 / z, Math.min(m - m / 2 / z, v)); return [cl(M.cx == null ? w / 2 : M.cx, w), cl(M.cz == null ? hh / 2 : M.cz, hh)]; }
  // v8: el green y sus alrededores pintados con mucho detalle (el mapa general se ve borroso al acercar tanto)
  function greenTile() { if (st.gTile) return st.gTile; const g = greenTileGen(); let r = g.next(); while (!r.done) r = g.next(); return (st.gTile = r.value); }
  function* greenTileGen() {
    const pad = 9, step = 0.11, x0 = G0.x - G0.rx - pad, x1 = G0.x + G0.rx + pad, za = G0.z - G0.rz - pad, zb = G0.z + G0.rz + pad;
    const W2 = Math.ceil((x1 - x0) / step), H2 = Math.ceil((zb - za) / step), c = document.createElement('canvas'); c.width = W2; c.height = H2; const g = c.getContext('2d'), im = g.createImageData(W2, H2);
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
      const x = x0 + (i + 0.5) * step, z = za + (j + 0.5) * step, s2 = surf(x, z);
      let col = s2 === 'green' ? [160, 238, 156] : s2 === 'ante' || s2 === 'tee' || s2 === 'fair' ? [136, 226, 140] : s2 === 'sand' ? [247, 229, 184] : s2 === 'beach' ? [242, 226, 184] : s2 === 'sea' ? [91, 184, 245] : [92, 203, 106];
      const e = 0.4, l = 1 + (h(x - e, z) - h(x + e, z)) * 0.5 + (h(x, z - e) - h(x, z + e)) * 0.35, o = (j * W2 + i) * 4;
      const fe = Math.min(1, Math.min(i, j, W2 - 1 - i, H2 - 1 - j) / 40); // se funde con el mapa en los bordes
      im.data[o] = col[0] * l; im.data[o + 1] = col[1] * l; im.data[o + 2] = col[2] * l; im.data[o + 3] = 255 * fe;
      if (i === W2 - 1 && j % 8 === 7) yield 0;
    }
    g.putImageData(im, 0, 0); return { c, x0, x1, za, zb };
  }
  // v8: imagen de colores con la caída de cada punto del green (se calcula una vez por hoyo)
  function slopeHeat() {
    if (st.slopeHeat) return st.slopeHeat;
    const pad = 1.2, step = 0.14, x0 = G0.x - G0.rx - pad, x1 = G0.x + G0.rx + pad, z0 = G0.z - G0.rz - pad, z1 = G0.z + G0.rz + pad;
    const up = MAPB.z1 > MAPB.z0 ? -1 : 1; // en el mapa, la fila 0 es el z de arriba
    const zs = up < 0 ? z1 : z0, ze = up < 0 ? z0 : z1, W2 = Math.ceil((x1 - x0) / step), H2 = Math.ceil(Math.abs(z1 - z0) / step);
    const c = document.createElement('canvas'); c.width = W2; c.height = H2; const g = c.getContext('2d'), im = g.createImageData(W2, H2), e = 0.22;
    const R = [[0, [110, 224, 140]], [0.012, [190, 238, 92]], [0.022, [255, 214, 64]], [0.035, [255, 150, 56]], [0.055, [255, 84, 104]]];
    const col = (m) => { for (let k = 1; k < R.length; k++) if (m <= R[k][0]) { const t = (m - R[k - 1][0]) / (R[k][0] - R[k - 1][0]), A = R[k - 1][1], B = R[k][1]; return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; } return R[R.length - 1][1]; };
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
      const x = x0 + (i + 0.5) * step, z = zs + (ze - zs) * (j + 0.5) / H2, q = ((x - G0.x) / G0.rx) ** 2 + ((z - G0.z) / G0.rz) ** 2;
      const o = (j * W2 + i) * 4; if (q > 1.06) { im.data[o + 3] = 0; continue; }
      const dx = (h(x + e, z) - h(x - e, z)) / (2 * e), dz = (h(x, z + e) - h(x, z - e)) / (2 * e), cc = col(Math.hypot(dx, dz));
      im.data[o] = cc[0]; im.data[o + 1] = cc[1]; im.data[o + 2] = cc[2]; im.data[o + 3] = Math.round(255 * Math.min(1, (1.06 - q) / 0.08));
    }
    g.putImageData(im, 0, 0); return (st.slopeHeat = { c, x0, x1, zs, ze });
  }
  function drawMap(c, big) {
    if (!el.mapImg) el.mapImg = paintMap(720, 1080); const g = c.getContext('2d'), w = c.width, hh = c.height, M = el.mapImg, b = st.b, sx = w / M.c.width; let zoom = big ? st.map.zoom : 1;
    const P = (x, z) => [M.px(x) * sx, M.pz(z) * sx], bq = P(b.x, b.z), onG = CLUBS[st.club].id === 'putt' && (st.phase === 'aim' || st.phase === 'swing');
    let mc = big ? mapCenter(c) : [w / 2, hh / 2]; if (big) { st.map.cx = mc[0]; st.map.cz = mc[1]; }
    if (!big) { // se acerca según te acercas al hoyo: siempre encuadra la bola y el hoyo con margen
      const cq = P(HOLE.cup.x, HOLE.cup.z), m = 14 * (w / (MAPB.x1 - MAPB.x0)), zt = Math.max(1, Math.min(7, Math.min((hh * 0.72) / (Math.abs(cq[1] - bq[1]) + m * 2), (w * 0.8) / (Math.abs(cq[0] - bq[0]) + m * 2))));
      st.mmZ = st.mmZ ? st.mmZ + (zt - st.mmZ) * 0.25 : zt; zoom = st.mmZ; mc = [(bq[0] + cq[0]) / 2, (bq[1] + cq[1]) / 2];
    }
    const cx = mc[0], cz = mc[1];
    g.clearRect(0, 0, w, hh); g.save(); rrect(g, 0, 0, w, hh, big ? 34 : 16); g.clip(); g.fillStyle = '#5CCB6A'; g.fillRect(0, 0, w, hh);
    g.translate(w / 2, hh / 2); g.scale(zoom, zoom); g.translate(-cx, -cz); g.drawImage(M.c, 0, 0, w, hh);
    if (zoom > 1.6 && st.gTile) { const T2 = st.gTile, a = P(T2.x0, T2.za), b2 = P(T2.x1, T2.zb); g.save(); g.imageSmoothingEnabled = true; g.drawImage(T2.c, Math.min(a[0], b2[0]), Math.min(a[1], b2[1]), Math.abs(b2[0] - a[0]), Math.abs(b2[1] - a[1])); g.restore(); }
    const u = (big ? 2.4 : 1) / zoom;
    if (onG) { // tu línea de putt: recta hasta el punto al que apuntas
      if (st.swing && st.pp) { g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2 * u; g.setLineDash([3 * u, 3 * u]); g.beginPath(); st.pp.forEach((p, i) => { const q = P(p.x, p.z); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke(); g.setLineDash([]);
        const L = st.pp[st.pp.length - 1], q = P(L.x, L.z); g.fillStyle = '#FF5A6E'; g.beginPath(); g.arc(q[0], q[1], 2.5 * u, 0, 7); g.fill(); }
      else { const E = P(b.x - Math.sin(st.yaw) * Math.min(3, cupD()), b.z - Math.cos(st.yaw) * Math.min(3, cupD())); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2 * u; g.setLineDash([3 * u, 3 * u]); g.beginPath(); g.moveTo(bq[0], bq[1]); g.lineTo(E[0], E[1]); g.stroke(); g.setLineDash([]); }
    } else if (st.phase === 'aim' || st.phase === 'swing') {
      const pts = predict(st.swing ? Math.max(0.03, st.swing.charge) : 1, st.swing && st.swing.flick && !st.swing.done ? flickResult(st.swing).ex : 0), L = pts[pts.length - 1];
      g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2.5 * u; g.setLineDash([5 * u, 5 * u]); g.beginPath(); pts.forEach((p, i) => { const q = P(p.x, p.z); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke(); g.setLineDash([]);
      const q = P(L.x, L.z); g.strokeStyle = '#FFFFFF'; g.lineWidth = 2.5 * u; g.beginPath(); g.arc(q[0], q[1], 9 * u, 0, 7); g.stroke(); g.fillStyle = '#FF5A6E'; g.beginPath(); g.arc(q[0], q[1], 3 * u, 0, 7); g.fill();
    }
    if (st.slopeOn && (cupD() < 45 || onG || big)) { // v8: mapa de caídas por colores (verde = llano … rojo = cae mucho)
      const Hm = slopeHeat(), a = P(Hm.x0, Hm.zs), b2 = P(Hm.x1, Hm.ze); g.save(); g.globalAlpha = 0.78; g.imageSmoothingEnabled = true; g.drawImage(Hm.c, a[0], a[1], b2[0] - a[0], b2[1] - a[1]); g.restore(); }
    if (cupD() < 45 || onG) { // caídas del green: flechitas cuesta abajo (más largas y opacas cuanto más cae)
      if (!st.slopeArr) { st.slopeArr = []; const e = 0.3; for (let x = G0.x - G0.rx - 1.5; x <= G0.x + G0.rx + 1.5; x += 1.9) for (let z = G0.z - G0.rz - 1.5; z <= G0.z + G0.rz + 1.5; z += 1.9) { if (!inEll(x, z, G0.x, G0.z, G0.rx + 0.3, G0.rz + 0.3)) continue; const dx = (h(x + e, z) - h(x - e, z)) / (2 * e), dz = (h(x, z + e) - h(x, z - e)) / (2 * e), m = Math.hypot(dx, dz); if (m > 0.004) st.slopeArr.push([x, z, -dx / m, -dz / m, m]); } }
      g.lineCap = 'round'; g.lineJoin = 'round'; for (const [x, z, ux, uz, m] of st.slopeArr) { const L = 0.35 + Math.min(0.55, m * 9), a = P(x - ux * L, z - uz * L), t2 = P(x + ux * L, z + uz * L), px = -uz, pz = ux, l = P(x + ux * L * 0.35 + px * L * 0.4, z + uz * L * 0.35 + pz * L * 0.4), r = P(x + ux * L * 0.35 - px * L * 0.4, z + uz * L * 0.35 - pz * L * 0.4);
        g.strokeStyle = `rgba(255,255,255,${Math.min(0.32, 0.12 + m * 4)})`; g.lineWidth = 1 * u; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(t2[0], t2[1]); g.moveTo(l[0], l[1]); g.lineTo(t2[0], t2[1]); g.lineTo(r[0], r[1]); g.stroke(); } }
    const f = P(HOLE.cup.x, HOLE.cup.z); g.strokeStyle = '#22324F'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(f[0], f[1]); g.lineTo(f[0], f[1] - 16 * u); g.stroke(); g.fillStyle = '#FF5A6E'; g.beginPath(); g.moveTo(f[0], f[1] - 16 * u); g.lineTo(f[0] + 11 * u, f[1] - 12.5 * u); g.lineTo(f[0], f[1] - 9 * u); g.fill();
    g.fillStyle = '#22324F'; g.beginPath(); g.arc(bq[0], bq[1], 5.5 * u, 0, 7); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(bq[0], bq[1], 4 * u, 0, 7); g.fill();
    g.restore();
    if (big && st.slopeOn) { // leyenda de colores
      const items = [['#7FE38A', T('Llano')], ['#FFD84D', T('Cae poco')], ['#FF9A3D', T('Cae')], ['#FF5A6E', T('Cae mucho')]]; g.font = '600 24px Fredoka, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
      let tw = 24; for (const [, t] of items) tw += 30 + g.measureText(t).width + 16; g.fillStyle = 'rgba(255,255,255,.94)'; rrect(g, w / 2 - tw / 2, hh - 146, tw, 50, 25); g.fill();
      let xx = w / 2 - tw / 2 + 18; for (const [c2, t] of items) { g.fillStyle = c2; g.beginPath(); g.arc(xx + 11, hh - 121, 11, 0, 7); g.fill(); g.fillStyle = '#22324F'; g.fillText(t, xx + 28, hh - 120); xx += 30 + g.measureText(t).width + 16; } }
    if (big) { const t = TF('A {d} del hoyo · {c}', { d: fmtM(cupD()), c: T(CLUBS[st.club].name) }); g.font = '600 30px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(t).width + 36; g.fillStyle = 'rgba(255,255,255,.94)'; rrect(g, w / 2 - tw / 2, hh - 78, tw, 54, 27); g.fill(); g.fillStyle = '#22324F'; g.fillText(t, w / 2, hh - 50); }
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = big ? 6 : 3; rrect(g, 1.5, 1.5, w - 3, hh - 3, big ? 34 : 16); g.stroke();
  }
  function say(t) { st.msg = t; st.msgT = 2.2; }
  function toast(t) { st.toast = t; st.toastT = 1.8; }
  /* ------------------------------------------------------------------ 10. golpe: fuerza y dirección con la barra */
  // GOLPE (como el arco): con el dedo a los lados apuntas; en cuanto tiras hacia abajo, cargas.
  // Lo que tiras es la fuerza que quieres (tu línea, % del palo: Hierro 9 al 60 % ≈ 69 m de vuelo). Pero el pulso no es perfecto:
  // la aguja de la barra oscila alrededor de tu línea, más cuanto más cargas y cuanto más tiempo aguantas.
  // Al soltar, sale la fuerza de la aguja: si sueltas cuando pasa por tu línea, la clavas. Y si al tirar mueves el dedo de lado, la bola se va.
  function startCharge(y) { st.phase = 'swing'; st.swing = { y0: y, charge: 0, wob: 0, t: 0, ph: Math.random() * 6.28, hist: [[0, 0]], tempo: 0, frozen: false }; SND.tick(); }
  // ritmo ideal de la tirada: llegar a la carga c en 0,2 + 0,55·c s (todo al 100 % en ~0,75 s). tempo > 0: rápido; < 0: lento
  const idealT = (c) => 0.2 + 0.55 * c, tempoOf = (c, t) => Math.max(-1.6, Math.min(1.6, Math.log2(idealT(c) / Math.max(0.05, t))));
  function finalTempo(sw) { const c = sw.charge, hit = sw.hist.find((q) => q[1] >= c * 0.9); return tempoOf(c, hit ? hit[0] : sw.t); }
  function needle(sw) { return Math.max(0, Math.min(1.08, sw.charge + sw.wob)); }
  function release() {
    const sw = st.swing; if (!sw || st.phase !== 'swing' || sw.done) return;
    if (sw.charge < 0.04) { st.swing = null; st.phase = 'aim'; return; } // apenas cargado: no cuenta
    sw.done = true; const p = needle(sw), d = p - sw.charge, pc = Math.round(sw.charge * 100), tz = finalTempo(sw), putt = CLUBS[st.club].id === 'putt';
    const tTxt = '';
    toast((Math.abs(d) < 0.015 ? TF('¡Clavada al {n} %!', { n: pc }) : `${Math.round(p * 100)} % · ${T(d > 0 ? 'fuerte' : 'floja')}`) + tTxt); st.hitQ = Math.max(0, 1 - Math.abs(d) * 6); if (Math.abs(d) < 0.015 && !tTxt) SND.perfect();
    swingDown(() => launch(p, 0, 0));
  }
  // el palo baja (unas décimas) y en el impacto sale la bola con su sonido
  function swingDown(hit) { const sw = st.swing; st.ca = { a0: clubAngle(sw), t: 0, hit, done: false }; }
  function clubAngle(sw) { const putt = CLUBS[st.club].id === 'putt'; return (putt ? 0.55 : 2.3) * (sw ? Math.min(1, sw.charge) : 0); }
  function updateClubAnim(dt) {
    const ca = st.ca; if (!ca) return; ca.t += dt; const down = 0.11;
    if (!ca.done && ca.t >= down) { ca.done = true; st.swing = null; ca.hit(); }
    if (ca.t > down + 0.45) st.ca = null;
  }
  function drawClub(g, k) {
    // el palo en 3D, en el plano del golpe: sube hacia atrás (hacia ti), baja de golpe y acompaña hacia el hoyo
    const sw = st.swing, ca = st.ca; if (!sw && !ca) return; const c = CLUBS[st.club], putt = c.id === 'putt';
    let a, al = 0.36; if (ca) { const down = 0.11; if (ca.t < down) { const u = ca.t / down; a = ca.a0 * (1 - u * u); } else { const u = Math.min(1, (ca.t - down) / 0.45); a = -(putt ? 0.45 : 2.0) * Math.sin((u * Math.PI) / 2); al = 0.36 * (1 - u); } } else a = clubAngle(sw);
    const b = st.b, gy = meshH(b.x, b.z), fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw), L = putt ? 0.82 : 1.0, hx = b.x + fx * 0.04, hy = gy + BALL_R + L, hz = b.z + fz * 0.04;
    const tl = 0.6, sx = -fz, sz = fx, P = (t, ang) => { const r = L * t, bk = Math.sin(ang) * r, dn = Math.cos(ang) * r; return project(hx - fx * bk * Math.cos(tl) + sx * bk * Math.sin(tl), hy - dn, hz - fz * bk * Math.cos(tl) + sz * bk * Math.sin(tl)); }; // plano inclinado: el arco se ve
    const hand = P(0, a), head = P(1, a), grip = P(0.22, a); if (hand.z > 1 || head.z > 1) return;
    const sc = Math.hypot(head.x - P(0.95, a).x, head.y - P(0.95, a).y) / (0.05 * L); // px por metro cerca de la cabeza
    g.save(); g.globalAlpha = al; g.lineCap = 'round'; g.strokeStyle = '#22324F';
    g.lineWidth = Math.max(2 * k, 0.018 * sc); g.beginPath(); g.moveTo(hand.x, hand.y); g.lineTo(head.x, head.y); g.stroke();
    g.lineWidth = Math.max(4 * k, 0.035 * sc); g.beginPath(); g.moveTo(hand.x, hand.y); g.lineTo(grip.x, grip.y); g.stroke();
    g.fillStyle = '#22324F'; const hr = Math.max(4 * k, (c.id === 'driver' ? 0.06 : c.id === 'wood' ? 0.05 : putt ? 0.05 : 0.04) * sc);
    g.beginPath(); g.ellipse(head.x, head.y, hr * (putt ? 1.6 : 1.3), hr * (putt ? 0.55 : 0.8), 0, 0, 7); g.fill();
    g.restore();
  }
  function updateSwing(dt) {
    const sw = st.swing; if (!sw || st.phase !== 'swing' || sw.done || st.mode === 'lanzar') return; const c = CLUBS[st.club], k = c.id === 'putt' ? 0.55 : c.id === 'wedge' ? 0.8 : c.id === 'driver' || c.id === 'wood' ? 1.15 : 1;
    // pulso: temblor aleatorio y lento alrededor de tu línea; más amplio cuanto más fuerte cargas (y si aguantas más de 3 s)
    if (!sw.fr) { sw.fr = [0.33 + Math.random() * 0.14, 0.62 + Math.random() * 0.25, 1.15 + Math.random() * 0.4]; sw.phs = sw.fr.map(() => Math.random() * 6.28); }
    sw.t += dt; const ch = sw.charge, amp = k * (0.03 + 0.15 * Math.pow(ch, 1.4)) * (1 + Math.max(0, sw.t - 3) * 0.3), sp = 0.7 + 0.6 * ch;
    for (let i = 0; i < 3; i++) sw.phs[i] += dt * sw.fr[i] * sp * Math.PI * 2;
    sw.wob = amp * (0.55 * Math.sin(sw.phs[0]) + 0.3 * Math.sin(sw.phs[1]) + 0.15 * Math.sin(sw.phs[2]));
  }
  // MODO «LANZAR»: tiras hacia abajo despacio para preparar el golpe (los puntitos enseñan dirección y dónde bota),
  // puedes corregir subiendo o bajando despacio; el golpe sale al lanzar el pulgar hacia arriba RÁPIDO:
  // a ritmo normal sale lo preparado; más rápido, te pasas (hasta el máximo del palo); más flojo, te quedas corto.
  // Si el lanzamiento se tuerce a la derecha, slice; a la izquierda, se cierra. Sin barra.
  // el lanzamiento «normal» se adapta a tu mano: es la media de tus últimos lanzamientos (cada uno lanza a su ritmo)
  const FREF = (() => { try { const o = JSON.parse(localStorage.getItem('tq.golf3d.flick') || 'null'); if (o && o.f > 0 && o.p > 0) return o; } catch (e) { /* nada */ } return { f: 820, p: 520 }; })();
  const FLICK_V = () => (CLUBS[st.club].id === 'putt' ? FREF.p : FREF.f);
  function learnFlick(v, putt) { const k = putt ? 'p' : 'f', r = v / FREF[k]; if (r < 0.45 || r > 2.2) return; FREF[k] = Math.max(putt ? 280 : 420, Math.min(putt ? 950 : 1500, FREF[k] * 0.8 + v * 0.2)); try { localStorage.setItem('tq.golf3d.flick', JSON.stringify(FREF)); } catch (e) { /* nada */ } }
  function flickResult(sw) {
    const f = sw.flick, up = Math.max(1, f.y0 - f.y), dt = Math.max(16, f.t - f.t0), ratio = (up / dt) * 1000 / FLICK_V();
    const putt = CLUBS[st.club].id === 'putt'; // el putt es más fino: menos castigo por el ritmo
    const mult = Math.abs(ratio - 1) < (putt ? 0.18 : 0.15) ? 1 : putt ? Math.pow(Math.max(0.4, Math.min(2.2, ratio)), 0.75) : Math.pow(Math.max(0.5, Math.min(1.6, ratio)), 0.5);
    const deg = (Math.atan2(f.x - f.x0, up) * 180) / Math.PI, exA = Math.sign(deg) * Math.min(1.3, Math.max(0, Math.abs(deg) - 5) / 14);
    // curva del dedo: si el trazo se dobla (el pulgar «engancha» hacia un lado al final), más efecto hacia ese lado
    let dev = 0; const L = Math.hypot(f.x - f.x0, f.y - f.y0) || 1; for (const [px, py] of f.path || []) { const d = ((f.x - f.x0) * (py - f.y0) - (f.y - f.y0) * (px - f.x0)) / L; if (Math.abs(d) > Math.abs(dev)) dev = d; }
    const c = dev / L, exC = Math.abs(c) < 0.06 ? 0 : -Math.sign(c) * Math.min(0.8, (Math.abs(c) - 0.06) * 6), ex = Math.max(-1.3, Math.min(1.3, exA + exC));
    if (putt) { // 7.3: putt mucho más sensible: casi recto (±1,5°) y a tu ritmo (±7 %) = perfecto; si no, se nota poco a poco
      const dA = Math.abs(deg) <= 1.5 ? 0 : Math.sign(deg) * (Math.abs(deg) - 1.5), yawErr = Math.max(-0.3, Math.min(0.3, (dA * Math.PI / 180) * 0.45));
      const r1 = ratio - 1, pe = Math.abs(r1) < 0.07 ? 0 : Math.sign(r1) * (Math.abs(r1) - 0.07), mP = Math.max(0.55, Math.min(1.6, 1 + pe * 0.6));
      return { power: sw.charge, mult: mP, ratio, ex: yawErr ? Math.sign(yawErr) : 0, yawErr, v: (up / dt) * 1000 }; }
    return { power: Math.min(1.05, sw.charge * mult), mult, ratio, ex, v: (up / dt) * 1000 };
  }
  function flickShot() {
    const sw = st.swing; if (!sw || !sw.flick || sw.done) return; sw.done = true;
    const r = flickResult(sw), putt = CLUBS[st.club].id === 'putt'; learnFlick(r.v, putt); const bp = project(st.b.x, st.b.y + BALL_R, st.b.z), f = sw.flick;
    if (putt) st.puttShot = { L: puttMax() * r.power * r.mult, yaw: st.yaw - r.yawErr };
    st.flickFx = { pts: putt ? puttLine(st.puttShot.L, st.puttShot.yaw).map((q) => ({ x: q.x, y: h(q.x, q.z) + 0.02, z: q.z })) : predict(r.power, r.ex), col: r.mult > 1 ? '255,90,110' : r.mult < 1 ? '91,184,245' : '76,217,100', t: performance.now() };
    const pTxt = r.mult === 1 ? T('¡Lanzamiento perfecto!') : r.mult > 1 ? TF('Muy rápido: +{n} %', { n: Math.round((r.mult - 1) * 100) }) : TF('Flojo: −{n} %', { n: Math.round((1 - r.mult) * 100) });
    const dTxt = r.ex > 0 ? ' · ' + T(putt ? 'se abre' : 'se va a la derecha') : r.ex < 0 ? ' · ' + T(putt ? 'se cierra' : 'se cierra a la izquierda') : '';
    toast(pTxt + dTxt); st.hitQ = Math.max(0, 1 - Math.abs(r.mult - 1) * 3 - Math.abs(r.ex) * 0.45); if (r.mult === 1 && !r.ex) SND.perfect();
    swingDown(() => launch(r.power, 0, r.ex ? Math.sign(r.ex) * (Math.abs(r.ex) + 0.3) : 0));
  }
  /* ------------------------------------------------------------------ 11. dedo en la pantalla: apuntar */
  function onDown(e) { if (st.phase !== 'aim') return; st.drag = { x: e.clientX, y: e.clientY, yaw: st.yaw }; ac(); }
  function onMove(e) {
    const d = st.drag; if (!d) return;
    if (st.phase === 'aim') {
      // ¿apuntas o tiras? cuenta el último tramo del movimiento: si va hacia abajo más de 16 px seguidos, empieza a cargar desde ahí
      const mx = e.clientX - (d.px ?? d.x), my = e.clientY - (d.py ?? d.y); d.px = e.clientX; d.py = e.clientY;
      d.run = my > Math.abs(mx) ? (d.run || 0) + my : Math.max(0, (d.run || 0) - Math.abs(mx) - Math.max(0, -my));
      if (d.run > 16) { startCharge(e.clientY - d.run); d.x = e.clientX; d.yaw = st.yaw; } else st.yaw -= mx * 0.0028;
    }
    if (st.phase === 'swing' && st.swing && !st.swing.done && st.mode === 'lanzar') {
      const sw = st.swing, now = e.timeStamp || performance.now();
      if (sw.flick) { const f = sw.flick; f.x = e.clientX; f.y = e.clientY; f.t = now; (f.path = f.path || []).push([e.clientX, e.clientY]); if (f.y0 - f.y >= 90) flickShot(); return; }
      if (sw.maxPull == null) sw.maxPull = Math.max(host.clientHeight * 0.16, Math.min(host.clientHeight * 0.3, host.clientHeight - sw.y0 - 24));
      sw.samples = sw.samples || []; sw.samples.push([now, e.clientX, e.clientY, sw.charge, st.yaw]); while (sw.samples.length > 2 && now - sw.samples[0][0] > 180) sw.samples.shift();
      // ¿lanzamiento? subida rápida (más de 350 px/s y 18 px) → empieza el golpe desde el punto más bajo reciente
      const old = sw.samples.find((q, i) => now - q[0] <= 80 && i < sw.samples.length - 1) || sw.samples[sw.samples.length - 2], vUp = old ? ((old[2] - e.clientY) / Math.max(8, now - old[0])) * 1000 : 0;
      if (vUp > 350 && old[2] - e.clientY > 18) { const low = sw.samples.reduce((a, q) => (q[2] > a[2] ? q : a)); if (low[3] > 0.04) { sw.charge = low[3]; st.yaw = low[4]; sw.flick = { x0: low[1], y0: low[2], t0: low[0], x: e.clientX, y: e.clientY, t: now }; SND.tick(); return; } }
      // despacio: la carga sigue al dedo (abajo más, arriba menos) y a los lados corriges la dirección
      sw.charge = Math.max(0, Math.min(1, (e.clientY - sw.y0) / sw.maxPull)); st.yaw = d.yaw - (e.clientX - d.x) * 0.0028;
      return;
    }
    if (st.phase === 'swing' && st.swing && !st.swing.done) { const sw = st.swing, c0 = sw.charge; sw.charge = Math.max(0, Math.min(1, (e.clientY - sw.y0) / (host.clientHeight * 0.3))); sw.hist.push([sw.t, sw.charge]); if (sw.charge > c0 + 0.004) { sw.lastUp = sw.t; sw.tempo = tempoOf(sw.charge, sw.t); } st.yaw = d.yaw - (e.clientX - d.x) * 0.0028; }
  }
  function onUp() {
    if (st.drag && st.phase === 'swing') {
      if (st.mode !== 'lanzar') release();
      else { const sw = st.swing; if (sw && sw.flick && !sw.done) flickShot(); else if (sw && !sw.done) { st.swing = null; st.phase = 'aim'; if (sw.charge > 0.04) say(T('Lanza el pulgar hacia arriba para golpear')); } }
    }
    st.drag = null;
  }
  /* ------------------------------------------------------------------ 12. bucle y dibujo */
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; if (st.paused) { cam.position.copy(camPos); cam.lookAt(camLook); render(0); requestAnimationFrame(frame); return; } st.t += dt;
    const steps = Math.max(1, Math.ceil(dt * 240)); for (let i = 0; i < steps; i++) physics(dt / steps);
    if (st.phase === 'sunk') { st.sinkT += dt; if (st.sinkT > 2.6) endCard(); }
    if (st.phase === 'end' && st.round && st.round.i < st.round.list.length - 1 && !st.endHold) { st.endT += dt; const left = Math.max(0, Math.ceil(8 - st.endT)); el.g3nexth.textContent = `${st.endLbl} · ${left}`; if (st.endT >= 8) { st.endHold = true; el.g3nexth.textContent = st.endLbl; el.g3nexth.onclick(); } } else if (st.phase === 'end' && st.endHold && st.endLbl) el.g3nexth.textContent = st.endLbl;
    if (st.phase === 'splash') { st.splashT += dt; if (st.splashT > 1.2) { if (st.dropAt) { st.phase = 'choice'; el.g3drop.style.display = 'flex'; } else toAim(); } }
    updateSwing(dt); updateClubAnim(dt); updateCam(dt); drawTut(dt); render(dt); bgRun(); requestAnimationFrame(frame);
  }
  function project(x, y, z) { const v = new THREE.Vector3(x, y, z).project(cam); return { x: (v.x * 0.5 + 0.5) * fx.width, y: (-v.y * 0.5 + 0.5) * fx.height, z: v.z }; }
  function render(dt) {
    const b = st.b, Wd = host.clientWidth, Hd = host.clientHeight, pr = R.getPixelRatio();
    if (R.domElement.width !== Math.round(Wd * pr) || R.domElement.height !== Math.round(Hd * pr) || fx.width !== Math.round(Wd * pr)) { R.setSize(Wd, Hd, false); cam.aspect = Wd / Hd; cam.updateProjectionMatrix(); fx.width = Math.round(Wd * pr); fx.height = Math.round(Hd * pr); }
    groundMat.uniforms.uTime.value = st.t; groundMat.uniforms.uSlopeOn.value = st.slopeOn && CLUBS[st.club].id !== 'putt' ? 1 : 0; if (seaMat) seaMat.uniforms.uTime.value = st.t;
    let bx = b.x, by = (b.mode === 'air' ? Math.max(b.y, meshH(b.x, b.z)) : meshH(b.x, b.z)) + BALL_R, bz = b.z; // a ras del suelo dibujado
    if (b.over) by -= b.zc;
    if (b.sunk) { const u = Math.min(1, st.sinkT / 0.3); bx = b.sinkFrom.x + (HOLE.cup.x - b.sinkFrom.x) * u; bz = b.sinkFrom.z + (HOLE.cup.z - b.sinkFrom.z) * u; by = h(HOLE.cup.x, HOLE.cup.z) + BALL_R - u * 0.08; ball.visible = u < 1; } else ball.visible = true;
    ball.position.set(bx, by, bz);
    { const sp = Math.hypot(b.vx || 0, b.vz || 0); if (dt > 0 && sp > 0.01 && !b.sunk && b.mode !== 'air') { const ax = new THREE.Vector3(b.vz / sp, 0, -b.vx / sp); ball.rotateOnWorldAxis(ax, Math.min(0.6, (sp * dt) / BALL_R)); } } // la bola gira al rodar if (st.phase === 'splash' || st.phase === 'choice') ball.visible = false;
    const bd = cam.position.distanceTo(ball.position), pxR = (BALL_R / (bd * Math.tan((cam.fov * Math.PI) / 360))) * (Hd / 2), bs = Math.max(1, 3 / Math.max(pxR, 1e-4)); ball.scale.setScalar(bs); st.ballPx = pxR * bs;
    const fk = Math.max(0, camPos.y - h(camPos.x, camPos.z) - 8) * 1.4; groundMat.uniforms.uFogN.value = st.fogN + fk; groundMat.uniforms.uFogF.value = st.fogF + fk;
    if (S.fog) { S.fog.near = st.fogN + fk; S.fog.far = st.fogF + fk + 60; } S.userData.sky.position.copy(cam.position); const pn = S.userData.pano; if (pn) pn.position.set(cam.position.x, cam.position.y + pn.userData.dy, cam.position.z);
    const farT = st.phase === 'intro' || st.phase === 'introfly' ? 2600 : 1000; if (cam.far !== farT) { cam.far = farT; cam.updateProjectionMatrix(); }
    const off = st.phase === 'intro' ? 1 : st.phase === 'introfly' ? 1 - Math.min(1, st.camT * 1.6) : 0; if (off > 0) cam.setViewOffset(Wd, Hd, 0, (st.introShift || 0) * Hd * off, Wd, Hd); else if (cam.view && cam.view.enabled) cam.clearViewOffset();
    const gy = meshH(b.x, b.z); ballShadow.position.set(b.x, gy + 0.004, b.z); ballShadow.visible = !b.sunk; ballShadow.material.opacity = Math.max(0.06, 0.35 - (b.y - gy) * 0.02); ballShadow.scale.setScalar(Math.min(bs, 3) * (1 + Math.min(2, (b.y - gy) * 0.05)));
    const fp = flagMesh.geometry.attributes.position, wk = 0.4 + Math.min(1.2, W.kmh / 20); for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), y2 = fp.getY(i); fp.setZ(i, (Math.sin(x * 7 - st.t * (4 + wk * 3)) * 0.07 + Math.sin(x * 13 + y2 * 4 - st.t * (6 + wk * 4)) * 0.02) * wk * x); } flagMesh.geometry.computeVertexNormals(); fp.needsUpdate = true;
    const cy = h(HOLE.cup.x, HOLE.cup.z); flagPin.position.y = cy + 1.1; flagMesh.position.y = cy + 1.95; flagMesh.rotation.y = -Math.atan2(W.z, W.x || 1);
    if (Math.floor(st.t * 8) !== st.tufF) { st.tufF = Math.floor(st.t * 8); S.userData.tufts.forEach((s) => (s.visible = Math.abs(s.position.x - camPos.x) + Math.abs(s.position.z - camPos.z) > 3.2)); }
    R.render(S, cam);
    const g = fxg, k = pr; g.clearRect(0, 0, fx.width, fx.height);
    if (st.phase === 'aim' || st.phase === 'swing') drawAim(g, k);
    if (st.phase === 'intro' && el.g3menu.style.display !== 'flex') drawIntroMarks(g, k);
    drawFlickFx(g, k); drawSplash(g, k);
    if ((st.phase === 'aim' || st.phase === 'swing') && st.flagHidden) drawCupMarker(g, k);
    if (false) { const bp = project(ball.position.x, ball.position.y, ball.position.z); if (bp.z < 1) { g.strokeStyle = 'rgba(34,50,79,.55)'; g.lineWidth = 1.6 * k; g.beginPath(); g.arc(bp.x, bp.y, Math.max(4.5 * k, st.ballPx * pr + 1.5 * k), 0, 7); g.stroke(); } }
    drawTrail(g, k); drawWeather(g, k, dt); drawBurst(g, k);
    el.g3str.textContent = `${T('Golpes')} ${st.strokes}`;
    if (Math.floor(st.t * 6) !== st.wF) { st.wF = Math.floor(st.t * 6); el.g3w.innerHTML = weatherHTML(); }
    const aiming = st.phase === 'aim';
    el.g3bottom.style.display = aiming ? '' : 'none'; el.g3hint.style.display = 'none'; el.g3swing.style.display = st.phase === 'swing' ? '' : 'none';
    if (!st.infoTxt) { st.infoTxt = 1; el.g3info.innerHTML = `${T('Hoyo')} ${HOLE.num} <span>· ${T('Par')} ${HOLE.par}</span>`; }
    const dtx = fmtM(cupD()); if (dtx !== st.dTxt) { st.dTxt = dtx; el.g3d.textContent = dtx; }
    if (st.swing) { const sw = st.swing, lz = st.mode === 'lanzar'; el.g3tempo.style.display = 'none'; el.g3pwr.style.display = lz ? 'none' : ''; el.g3swlbl.textContent = lz ? (sw.flick ? '↑' : T('Prepara el golpe y lanza el pulgar hacia arriba')) : T('Suelta cuando la aguja pase por tu línea'); el.g3pfill.style.height = sw.charge * 100 + '%'; el.g3pline.style.top = sw.charge * 100 + '%'; el.g3pneedle.style.top = Math.min(1, needle(sw)) * 100 + '%'; el.g3plbl.textContent = Math.round(sw.charge * 100) + ' %';
      const live = sw.lastUp != null && sw.t - sw.lastUp < 0.15 ? tempoOf(sw.charge, sw.t) : sw.tempo, tp = Math.max(-1.6, Math.min(1.6, live || 0)); el.g3tdot.style.left = 50 + (tp / 1.6) * 46 + '%'; el.g3tdot.style.background = Math.abs(tp) < 0.3 ? '#4CD964' : '#FF8A5A'; }
    if (st.toastT > 0) { st.toastT -= dt; el.g3toast.textContent = st.toast; el.g3toast.style.opacity = Math.min(1, st.toastT * 2); } else el.g3toast.style.opacity = 0;
    if (st.msgT > 0) { st.msgT -= dt; el.g3msg.textContent = st.msg; el.g3msg.style.opacity = Math.min(1, st.msgT * 2); } else el.g3msg.style.opacity = 0;
    el.g3mini.style.display = st.phase === 'intro' || st.phase === 'end' ? 'none' : ''; el.g3top.style.display = el.g3menu.style.display === 'flex' ? 'none' : ''; el.g3mode.style.display = 'none'; el.g3slope.style.display = st.phase === 'aim' && cupD() < 45 && CLUBS[st.club].id !== 'putt' ? '' : 'none'; el.g3help.style.display = st.phase === 'aim' ? '' : 'none';
    if (Math.floor(st.t * 5) !== st.ambF) { st.ambF = Math.floor(st.t * 5); ambUpdate(st.t); }
    if (Math.floor(st.t * 10) !== st.mapF) { st.mapF = Math.floor(st.t * 10); drawMap(el.g3mini, false); }
  }
  function label(g, k, x, y, t) { g.font = `600 ${14 * k}px Fredoka, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; const w = g.measureText(t).width + 20 * k; g.fillStyle = 'rgba(255,255,255,.95)'; rrect(g, x - w / 2, y - 13 * k, w, 26 * k, 13 * k); g.fill(); g.fillStyle = '#22324F'; g.fillText(t, x, y + k); }
  function drawIntroMarks(g, k) {
    const p = project(st.b.x, h(st.b.x, st.b.z), st.b.z), f = project(HOLE.cup.x, h(HOLE.cup.x, HOLE.cup.z), HOLE.cup.z), pulse = 1 + Math.sin(st.t * 4) * 0.12;
    g.setLineDash([6 * k, 7 * k]); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5 * k; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(f.x, f.y); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 3 * k; g.beginPath(); g.arc(p.x, p.y, 14 * k * pulse, 0, 7); g.stroke(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(p.x, p.y, 5 * k, 0, 7); g.fill();
    label(g, k, p.x + 58 * k, p.y, T('Tu bola')); label(g, k, f.x, f.y - 30 * k, T('Hoyo'));
  }
  function simPutt(p) { return puttLine(puttMax() * p, st.yaw); } // 7.3 (F4): lo que marca = lo que hace
  function drawPutt(g, k) {
    const sw = st.swing; if (!sw || sw.charge < 0.03) { st.pp = null; aimMark(g, k); return; }
    const p = Math.max(0.02, sw.charge), D = puttMax() * p, b = st.b, fx2 = -Math.sin(st.yaw), fz2 = -Math.cos(st.yaw), key = [b.x, b.z, st.yaw.toFixed(4), p.toFixed(3)].join();
    if (st.pk !== key) { st.pk = key; st.pp = simPutt(p, 0); }
    // lo que hará la bola con un gesto normal: el camino de verdad (con la caída) y dónde se para
    const pts = st.pp, n = pts.length; for (let i = 1; i < n; i++) { const q = pts[i], pr = project(q.x, h(q.x, q.z) + 0.02, q.z); if (pr.z > 1) continue; const t = i / n; g.fillStyle = `rgba(255,255,255,${0.92 - t * 0.4})`; g.beginPath(); g.arc(pr.x, pr.y, (2.3 - t * 0.8) * k, 0, 7); g.fill(); }
    const E = pts[n - 1]; ring(g, k, E, 0.11, 0.95); const tp = project(E.x, h(E.x, E.z) + 0.02, E.z); if (tp.z <= 1) label(g, k * 0.85, tp.x, tp.y - 22 * k, fmtM(D));
  }
  function drawCupMarker(g, k) {
    // la bandera está tapada (duna, talud, borde del búnker): una marquita suave dice dónde está el hoyo
    const cy = h(HOLE.cup.x, HOLE.cup.z), p = project(HOLE.cup.x, cy + 1.6, HOLE.cup.z); let x = p.x, y = p.y; const W = fx.width, Hh = fx.height, m = 26 * k; if (p.z > 1) { x = W - x; y = m * 2; }
    x = Math.max(m, Math.min(W - m, x)); y = Math.max(m * 3.2, Math.min(Hh * 0.6, y));
    g.save(); g.globalAlpha = 0.85; g.strokeStyle = '#22324F'; g.lineWidth = 2.5 * k; g.beginPath(); g.moveTo(x, y + 12 * k); g.lineTo(x, y - 14 * k); g.stroke();
    g.fillStyle = '#FF5A6E'; g.beginPath(); g.moveTo(x, y - 14 * k); g.lineTo(x + 13 * k, y - 9 * k); g.lineTo(x, y - 4 * k); g.closePath(); g.fill(); g.restore();
    label(g, k, x, y + 26 * k, fmtM(cupD()));
  }
  function drawSplash(g, k) {
    const S2 = st.splash; if (!S2) return; const t = (performance.now() - S2.t) / 1000; if (t > 1.4) { st.splash = null; return; }
    for (let r = 0; r < 3; r++) { const tt = t - r * 0.18; if (tt <= 0) continue; const rad = 0.25 + tt * 2.2, a = Math.max(0, 1 - tt / 1.1); g.strokeStyle = `rgba(255,255,255,${0.8 * a})`; g.lineWidth = 2 * k; g.beginPath(); for (let i = 0; i <= 28; i++) { const an = (i / 28) * Math.PI * 2, p = project(S2.x + Math.cos(an) * rad, S2.y + 0.02, S2.z + Math.sin(an) * rad); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.stroke(); }
    for (const q of S2.parts) { const y = S2.y + q.vy * t - 4.9 * t * t; if (y < S2.y) continue; const p = project(S2.x + q.vx * t, y, S2.z + q.vz * t); if (p.z > 1) continue; g.fillStyle = `rgba(220,240,255,${Math.max(0, 1 - t / 1.2)})`; g.beginPath(); g.arc(p.x, p.y, 2.6 * k, 0, 7); g.fill(); }
  }
  function drawFlickFx(g, k) {
    // un momento después de lanzar: los puntitos de TU golpe (sin viento), en rojo si fue muy rápido, azul si flojo, verde si clavado
    const F = st.flickFx; if (!F) return; const age = (performance.now() - F.t) / 1000; if (age > 1.5) { st.flickFx = null; return; }
    const a = Math.min(1, (1.5 - age) / 0.5), n = F.pts.length;
    for (let i = 1; i < n - 1; i += 2) { const q = F.pts[i], p = project(q.x, q.y + BALL_R, q.z); if (p.z > 1) continue; const t = i / n; g.fillStyle = `rgba(${F.col},${(0.95 - t * 0.4) * a})`; g.beginPath(); g.arc(p.x, p.y, Math.max(1.8, 4 - t * 2) * k, 0, 7); g.fill(); }
  }
  // mini tutorial: 4 escenas animadas (cómo se prepara y se lanza)
  const TUT = ['Arrastra hacia abajo despacio: preparas el golpe. Los puntitos te enseñan por dónde va y dónde cae.', 'Lanza el pulgar hacia arriba: a ritmo normal sale justo lo que preparaste.', 'Más rápido, más lejos (rojo). Más flojo, más corto (azul).', 'Si el lanzamiento se tuerce a la derecha, la bola se va a la derecha (slice); a la izquierda, se cierra.'];
  function showTut() { st.tutOn = true; st.tutT = 0; el.g3tut.style.display = 'flex'; }
  function drawTut(dt) {
    if (!st.tutOn) return; st.tutT += dt; const sc = Math.floor(st.tutT / 3) % 4, u = (st.tutT % 3) / 3, c = el.g3tutc, g = c.getContext('2d'), W = c.width, H = c.height;
    if (el.g3tuttxt.dataset.s !== String(sc)) { el.g3tuttxt.dataset.s = sc; el.g3tuttxt.textContent = T(TUT[sc]); el.g3tutdots.innerHTML = [0, 1, 2, 3].map((i) => `<i class="${i === sc ? 'on' : ''}"></i>`).join(''); }
    g.clearRect(0, 0, W, H); const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#BFE6FF'); grd.addColorStop(0.45, '#BFE6FF'); grd.addColorStop(0.46, '#7BD88A'); grd.addColorStop(1, '#5CCB6A'); g.fillStyle = grd; rrect(g, 0, 0, W, H, 28); g.fill();
    const bx = W / 2, by = H * 0.8; g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 9, 0, 7); g.fill();
    const fing = (x, y, a) => { g.globalAlpha = a; g.fillStyle = 'rgba(34,50,79,.18)'; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); g.strokeStyle = '#22324F'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 22, 0, 7); g.stroke(); g.globalAlpha = 1; };
    const dots = (len, curve, col) => { for (let i = 1; i < 14; i++) { const t = i / 14, x = bx + curve * t * t * 90, y = by - t * len; g.fillStyle = col || `rgba(255,255,255,${0.95 - t * 0.5})`; g.beginPath(); g.arc(x, y, 5 - t * 2.5, 0, 7); g.fill(); } };
    const fx = W * 0.72, fy0 = H * 0.3;
    if (sc === 0) { const p = Math.min(1, u * 1.4); dots(60 + 170 * p, 0); fing(fx, fy0 + 140 * p, 1); g.fillStyle = '#22324F'; g.font = '600 26px Fredoka, sans-serif'; g.fillText('↓ ' + T('despacio'), fx - 60, fy0 - 18); }
    else if (sc === 1) { dots(230, 0); const p = u < 0.35 ? 0 : Math.min(1, (u - 0.35) / 0.12); fing(fx, fy0 + 140 - 160 * p, 1 - Math.max(0, u - 0.6)); if (p > 0) { g.strokeStyle = '#4CD964'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(fx, fy0 + 140); g.lineTo(fx, fy0 + 140 - 160 * p); g.stroke(); } }
    else if (sc === 2) { const red = u < 0.5, p = Math.min(1, ((u % 0.5) - 0.1) / 0.1); dots(red ? 290 : 150, 0, red ? 'rgba(255,90,110,.85)' : 'rgba(91,184,245,.9)'); if (p > 0) { g.strokeStyle = red ? '#FF5A6E' : '#5BB8F5'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(fx, fy0 + 140); g.lineTo(fx, fy0 + 140 - 160 * p); g.stroke(); } g.fillStyle = '#22324F'; g.font = '600 26px Fredoka, sans-serif'; g.fillText(T(red ? 'rápido' : 'flojo'), fx - 40, fy0 - 18); }
    else { const right = u < 0.5, p = Math.min(1, ((u % 0.5) - 0.1) / 0.1); dots(220, right ? 1 : -1); if (p > 0) { g.strokeStyle = '#FF8A5A'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(fx, fy0 + 140); g.lineTo(fx + (right ? 50 : -50) * p, fy0 + 140 - 150 * p); g.stroke(); } }
  }
  function drawSlopes(g, k) {
    // flechitas que corren cuesta abajo por todo el green: cada zona enseña su caída (sutiles)
    if (!st.slopePts) { st.slopePts = []; const e = 0.25; for (let gx = G0.x - G0.rx - 1; gx <= G0.x + G0.rx + 1; gx += 0.6) for (let gz = G0.z - G0.rz - 1; gz <= G0.z + G0.rz + 1; gz += 0.6) {
        const x = gx + (Math.round(gz / 0.6) % 2) * 0.3, z = gz; if (surf(x, z) !== 'green' || Math.hypot(x - HOLE.cup.x, z - HOLE.cup.z) < 0.35) continue;
        const dx = (h(x + e, z) - h(x - e, z)) / (2 * e), dz = (h(x, z + e) - h(x, z - e)) / (2 * e), m = Math.hypot(dx, dz); if (m < 0.003) continue; st.slopePts.push({ x, z, ux: -dx / m, uz: -dz / m, m, hs: Math.random() }); } }
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 1.3 * k;
    for (const q of st.slopePts) {
      if (Math.abs(q.x - camPos.x) + Math.abs(q.z - camPos.z) > 40) continue;
      const ph = (st.t * (0.25 + q.m * 6) + q.hs) % 1, a = 0.3 * Math.sin(ph * Math.PI) * Math.min(1, q.m * 50); if (a < 0.02) continue;
      const L = 0.1 + Math.min(0.14, q.m * 3.5), off = (ph - 0.5) * 0.35, cx = q.x + q.ux * off, cz = q.z + q.uz * off, px = -q.uz, pz = q.ux;
      const P = (x, z) => project(x, h(x, z) + 0.015, z), t = P(cx + q.ux * L * 0.5, cz + q.uz * L * 0.5), l = P(cx - q.ux * L * 0.5 + px * L * 0.45, cz - q.uz * L * 0.5 + pz * L * 0.45), r = P(cx - q.ux * L * 0.5 - px * L * 0.45, cz - q.uz * L * 0.5 - pz * L * 0.45);
      if (t.z > 1 || l.z > 1 || r.z > 1) continue; g.strokeStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(t.x, t.y); g.lineTo(r.x, r.y); g.stroke();
    }
  }
  function aimMark(g, k) {
    const b = st.b, dx = -Math.sin(st.yaw), dz = -Math.cos(st.yaw), mark = (t) => project(b.x + dx * t, h(b.x + dx * t, b.z + dz * t) + 0.02, b.z + dz * t);
    g.lineCap = 'round'; for (let t = 0.35; t < 1.6; t += 0.25) { const p = mark(t), q = mark(t + 0.12); if (p.z > 1 || q.z > 1) continue; g.strokeStyle = `rgba(255,255,255,${0.7 - t * 0.35})`; g.lineWidth = 2.4 * k; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); }
  }
  function ring(g, k, L, r, a) { g.beginPath(); for (let i = 0; i <= 32; i++) { const an = (i / 32) * Math.PI * 2, x = L.x + Math.cos(an) * r, z = L.z + Math.sin(an) * r, p = project(x, h(x, z) + 0.03, z); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 1.6 * k; g.stroke(); }
  function drawAim(g, k) {
    if (CLUBS[st.club].id === 'putt') { drawPutt(g, k); return; }
    const sw = st.swing, lz = st.mode === 'lanzar';
    if (lz && sw && sw.charge >= 0.03) {
      // lanzar: puntitos del vuelo (sin viento) y dónde bota; al lanzar torcido, la línea se curva
      const fr = sw.flick && !sw.done ? flickResult(sw) : null, q = predict(Math.max(0.03, sw.charge), fr ? fr.ex : 0), n = q.length;
      for (let i = 2; i < n - 1; i += 2) { const p = project(q[i].x, q[i].y + BALL_R, q[i].z); if (p.z > 1) continue; const t = i / n; g.fillStyle = `rgba(255,255,255,${0.9 - t * 0.45})`; g.beginPath(); g.arc(p.x, p.y, Math.max(1.6, 3.6 - t * 2) * k, 0, 7); g.fill(); }
      ring(g, k, q[n - 1], 1.1, 0.75); return;
    }
    aimMark(g, k);
    const d = cupD(), fade = Math.max(0, Math.min(1, (d - 25) / 35)); if (fade <= 0) return;
    const q = predict(sw ? Math.max(0.03, sw.charge) : 1); ring(g, k, q[q.length - 1], 1.1, 0.7 * fade);
  }
  function drawTrail(g, k) {
    if (st.phase !== 'flight' || st.b.mode !== 'air' || st.landed || st.path.length < 2) return;
    const pts = []; let len = 0;
    for (let i = st.path.length - 1; i > 0 && len < 3; i--) { const p = st.path[i], q = st.path[i - 1]; len += Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z); pts.push(p); }
    g.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) { const a = project(pts[i - 1].x, pts[i - 1].y + BALL_R, pts[i - 1].z), c = project(pts[i].x, pts[i].y + BALL_R, pts[i].z); if (a.z > 1 || c.z > 1) continue; const t = i / pts.length; g.strokeStyle = `rgba(255,255,255,${0.75 * (1 - t)})`; g.lineWidth = (3.5 * (1 - t) + 0.8) * k; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke(); }
  }
  function drawWeather(g, k, dt) {
    if (W.kind !== 'lluvia' && W.kind !== 'granizo') return; const hail = W.kind === 'granizo';
    if (!st.drops) { st.drops = []; for (let i = 0; i < (hail ? 70 : 140); i++) st.drops.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8 }); }
    const w = fx.width, hh = fx.height, slant = W.x * 0.02;
    st.drops.forEach((d) => { d.y += dt * (hail ? 1.3 : 1.7) * d.s; d.x += dt * slant; if (d.y > 1) { d.y = -0.05; d.x = Math.random(); } const x = d.x * w, y = d.y * hh;
      if (hail) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(x, y, 2.6 * d.s * k, 0, 7); g.fill(); g.strokeStyle = 'rgba(160,180,200,.6)'; g.lineWidth = k; g.stroke(); }
      else { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x + slant * 40 * k, y + 16 * d.s * k); g.stroke(); } });
  }
  function makeBurst() { st.burst = []; for (let i = 0; i < 30; i++) st.burst.push({ a: (i / 30) * Math.PI * 2, v: 0.7 + Math.random() * 1.1, c: ['#FFC247', '#FF8FC0', '#4CD964', '#5BB8F5', '#9B82FF'][i % 5] }); }
  function drawBurst(g, k) {
    if (st.phase !== 'sunk' || st.sinkT < 0.3) return;
    const c = project(HOLE.cup.x, h(HOLE.cup.x, HOLE.cup.z), HOLE.cup.z), u = Math.min(1, (st.sinkT - 0.3) / 0.8), tt = st.sinkT - 0.3;
    g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - u)})`; g.lineWidth = (6 * (1 - u) + 1) * k; g.beginPath(); g.ellipse(c.x, c.y, (20 + u * 120) * k, (20 + u * 120) * 0.4 * k, 0, 0, 7); g.stroke();
    st.burst.forEach((q) => { const x = c.x + Math.cos(q.a) * q.v * tt * 160 * k, y = c.y - 120 * q.v * tt * k + 260 * tt * tt * k + Math.sin(q.a) * q.v * tt * 50 * k; g.globalAlpha = Math.max(0, 1 - tt / 1.6); g.fillStyle = q.c; g.save(); g.translate(x, y); g.rotate(q.a + tt * 6); g.fillRect(-5 * k, -3 * k, 10 * k, 6 * k); g.restore(); });
    g.globalAlpha = 1;
  }
  function endCard() {
    if (st.phase === 'end') return; st.phase = 'end'; const d = st.strokes - HOLE.par, rec = saveBest('h:' + HOLE.id, st.strokes);
    el.g3endt.textContent = resName(st.strokes, d);
    el.g3ends.textContent = `${st.strokes} ${T(st.strokes === 1 ? 'golpe' : 'golpes')} · ${T('Par')} ${HOLE.par} · ${T(WEATHERS[W.kind].name)}${W.kmh ? ' · ' + TF('viento de {n} km/h', { n: W.kmh }) : ''}${rec ? ' · ' + T('¡Tu mejor marca en este hoyo!') : ''}`;
    const R = st.round;
    if (R) { R.cards[R.i] = { s: st.strokes, p: HOLE.par }; const last = R.i === R.list.length - 1;
      if (last) { const tot = R.cards.reduce((a, c) => a + c.s, 0), rel = tot - R.cards.reduce((a, c) => a + c.p, 0), recR = saveBest('r' + R.list.length, rel); el.g3endt.textContent = `${T('¡Recorrido terminado!')} ${relS(rel)}`; el.g3ends.textContent = TF('{a} golpes en {b} hoyos', { a: tot, b: R.list.length }) + (recR ? ' · ' + T('¡Tu mejor recorrido!') : ''); }
      el.g3nexth.textContent = last ? T('Otro recorrido') : TF('Siguiente hoyo ({a} de {b})', { a: R.i + 2, b: R.list.length }); el.g3again.style.display = 'none';
    } else { el.g3nexth.textContent = T('Siguiente hoyo'); el.g3again.style.display = ''; el.g3again.textContent = T('Repetir este hoyo'); }
    if (!R || R.i === R.list.length - 1) { const cs = R ? R.cards : [{ s: st.strokes, p: HOLE.par }], tot = cs.reduce((a, c) => a + c.s, 0), tp = cs.reduce((a, c) => a + c.p, 0);
      post({ ev: 'end', game: 'golf3d', holes: cs.length, strokes: tot, par: tp, rel: tot - tp, hole: R ? '' : HOLE.id, aces: cs.filter((c) => c.s === 1).length, b3: cs.filter((c) => c.p === 3 && c.s <= 2).length }); }
    el.g3ecard.innerHTML = cardHTML(); el.g3end.style.display = 'block'; st.endT = 0; st.endHold = false; st.endLbl = el.g3nexth.textContent;
  }
  /* ------------------------------------------------------------------ 12b. menú de inicio, tarjeta de juego y récords */
  const BEST_K = 'tq.golf3d.best', PREF_K = 'tq.golf3d.prefs';
  function loadBest() { try { return JSON.parse(localStorage.getItem(BEST_K) || '{}') || {}; } catch (e) { return {}; } }
  function saveBest(key, v) { const b = loadBest(); if (b[key] == null || v < b[key]) { b[key] = v; try { localStorage.setItem(BEST_K, JSON.stringify(b)); } catch (e) { /* sin guardar */ } return true; } return false; }
  const relS = (r) => (r === 0 ? T('al par') : (r > 0 ? '+' : '') + r);
  function cardHTML() {
    const R = st.round, list = R ? R.list : [HI], cards = R ? R.cards : st.phase === 'end' ? [{ s: st.strokes, p: HOLE.par }] : [], cur = R ? R.i : 0, playing = st.phase !== 'intro' && st.phase !== 'end';
    if (!R && !cards.length && !playing) return '';
    const n = list.length, cols = `grid-template-columns:46px repeat(${n},minmax(0,1fr)) 38px`;
    let h1 = `<b>${T('Hoyo')}</b>`, h2 = `<b>${T('Par')}</b>`, h3 = `<b>${T('Golpes')}</b>`, ts = 0, tp = 0, played = 0;
    list.forEach((hi, i) => { const H = HOLES[hi], c = cards[i], live = !c && i === cur && playing, sc = c ? c.s : live ? st.strokes : null, d = c ? c.s - c.p : 0, on = i === cur ? ' class="on"' : '';
      const cls = c ? (d <= -2 ? 'eg' : d === -1 ? 'bi' : d === 0 ? 'pa' : d === 1 ? 'bo' : 'db') : live ? 'lv' : '';
      h1 += `<span${on}>${R ? i + 1 : H.num}</span>`; h2 += `<span${on}>${H.par}</span>`; h3 += `<span${on}><i class="${cls}">${sc == null ? '·' : sc}</i></span>`; if (c) { ts += c.s; tp += c.p; played++; } });
    const rel = ts - tp;
    h1 += `<b class="t">${T('Total')}</b>`; h2 += `<b class="t">${list.reduce((a, hi) => a + HOLES[hi].par, 0)}</b>`; h3 += `<b class="t">${played ? ts : '–'}</b>`;
    const tag = played ? `<em class="${rel < 0 ? 'neg' : rel > 0 ? 'pos' : ''}">${relS(rel)}</em>` : '';
    return `<div class="g3-sch"><span>${R ? TF('Tarjeta · recorrido de {n} hoyos', { n }) : `${T('Tarjeta')} · ${T(HOLE.name)}`}</span>${tag}</div><div class="g3-scg" style="${cols}">${h1}${h2}${h3}</div>`;
  }
  const WLBL = { auto: 'Al azar', sol: 'Sol', viento: 'Ventisca', nublado: 'Nublado', lluvia: 'Lluvia', granizo: 'Granizo' };
  const DICE = '<svg width="22" height="22" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="#9B82FF"/><g fill="#fff"><circle cx="8" cy="8" r="1.8"/><circle cx="16" cy="16" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="16" cy="8" r="1.8"/><circle cx="8" cy="16" r="1.8"/></g></svg>';
  // v8 (Jose): menú por pasos, a pantalla completa. 1: cuántos hoyos (+ récords) · 2: tiempo y tipo de golpe ·
  // 3 (solo si es 1 hoyo): el hoyo, separado por par 3 / 4 / 5.
  const NCARD = { 1: ['1 hoyo', 'Elige el hoyo que quieras'], 3: ['3 hoyos', 'Uno de cada par, al azar'], 6: ['6 hoyos', 'Dos de cada par, al azar'], 9: ['9 hoyos', 'Tres de cada par, al azar'] };
  function menuInit() {
    let P = {}; try { P = JSON.parse(localStorage.getItem(PREF_K) || '{}') || {}; } catch (e) { P = {}; }
    st.menuN = [1, 3, 6, 9].includes(P.n) ? P.n : 3; st.menuH = P.h >= 0 && P.h < HOLES.length ? P.h : HI; st.wPref = WLBL[P.w] ? P.w : 'auto'; st.menuStep = 1; st.menuPar = HOLES[st.menuH].par;
    el.g3mw.innerHTML = Object.keys(WLBL).map((k) => `<button data-w="${k}">${k === 'auto' ? DICE : WICON[k]}<span>${T(WLBL[k])}</span></button>`).join('');
    el.g3mw.querySelectorAll('button').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); st.wPref = b.dataset.w; SND.tick(); menuRefresh(); }));
    el.g3mm.querySelectorAll('button').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); st.mode = b.dataset.m; try { localStorage.setItem('tq.golf3d.mode', st.mode); } catch (er) { /* nada */ } el.setMode(); SND.tick(); menuRefresh(); }));
    el.g3mp.querySelectorAll('button').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); st.menuPar = +b.dataset.p; SND.tick(); menuRefresh(); }));
    el.g3mback.onclick = (e) => { e.stopPropagation(); if (st.menuStep > 1) { st.menuStep--; SND.tick(); menuRefresh(); } };
    el.g3go.onclick = (e) => { e.stopPropagation(); const last = st.menuN === 1 ? 3 : 2;
      if (st.menuStep < last) { st.menuStep++; SND.tick(); menuRefresh(); return; }
      ac(); ambStart(); try { localStorage.setItem(PREF_K, JSON.stringify({ n: st.menuN, h: st.menuH, w: st.wPref })); } catch (er) { /* nada */ }
      el.g3menu.style.display = 'none'; if (st.menuN === 1) { st.round = null; goHole(st.menuH); } else startRound(st.menuN); };
  }
  function menuRefresh() {
    const B = loadBest(), n = st.menuN, step = st.menuStep, last = n === 1 ? 3 : 2;
    el.g3menu.querySelectorAll('.g3-mstep').forEach((d) => (d.style.display = +d.dataset.s === step ? '' : 'none'));
    el.g3msteps.innerHTML = `<span>${TF('Paso {a} de {b}', { a: step, b: last })}</span>` + Array.from({ length: last }, (_, k) => `<i class="${k < step ? 'on' : ''}"></i>`).join('');
    el.g3mback.style.visibility = step > 1 ? 'visible' : 'hidden';
    el.g3go.textContent = T(step < last ? 'Siguiente' : '¡A jugar!');
    if (step === 1) {
      el.g3mn.innerHTML = [1, 3, 6, 9].map((k) => { const br = B['r' + k]; return `<button data-n="${k}" class="${k === n ? 'on' : ''}"><b>${T(NCARD[k][0])}</b><span>${T(NCARD[k][1])}</span>${k > 1 && br != null ? `<small>${T('Tu mejor:')} ${relS(br)}</small>` : ''}</button>`; }).join('');
      el.g3mn.querySelectorAll('button').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); st.menuN = +b.dataset.n; SND.tick(); menuRefresh(); }));
      el.g3mnote.textContent = T(n === 1 ? 'Juega solo el hoyo que elijas.' : 'Te tocan hoyos distintos cada vez, en orden al azar.');
    } else if (step === 2) {
      el.g3mw.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.w === st.wPref));
      el.g3mm.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.m === st.mode));
      el.g3mmnote.textContent = T(st.mode === 'lanzar' ? 'Tiras hacia abajo y lanzas hacia arriba: si subes torcido, la bola se curva.' : 'Tiras hacia abajo y sueltas: más fácil, sin efecto.');
    } else {
      el.g3mp.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.p === st.menuPar));
      const list = HOLES.map((H, i) => [H, i]).filter(([H]) => H.par === st.menuPar);
      if (!list.some(([, i]) => i === st.menuH)) st.menuH = list[0][1];
      el.g3mholes.innerHTML = list.map(([H, i]) => { const th = holeThumb(i); return `<button data-h="${i}" class="${i === st.menuH ? 'on' : ''}"><div class="g3-ht"><em class="p${H.par}">${T('Par')} ${H.par} · ${H.len} m</em><b>${T(H.name)}</b><span>${T(H.where)}</span>${B['h:' + H.id] != null ? `<small>${T('Tu mejor:')} ${B['h:' + H.id]}</small>` : ''}</div>${th ? `<img class="g3-hmap" src="${th}" alt="">` : ''}</button>`; }).join('');
      el.g3mholes.querySelectorAll('button').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); st.menuH = +b.dataset.h; SND.tick(); menuRefresh(); }));
    }
  }
  function showMenu() {
    st.round = null; el.g3intro.style.display = 'none'; el.g3end.style.display = 'none'; el.g3pop.style.display = 'none'; el.g3big.style.display = 'none';
    if (st.phase !== 'intro') { st.phase = 'intro'; const [p, l] = introCam(); camPos.copy(p); camLook.copy(l); }
    el.g3menu.style.display = 'flex'; st.menuStep = 1; menuRefresh();
  }
  // recorrido: 3 = uno de cada par · 6 = dos de cada · 9 = tres de cada (al azar dentro de cada par, y el orden también)
  function startRound(n) {
    const per = n / 3, pick = []; for (const par of [3, 4, 5]) { const g = HOLES.map((H, i) => (H.par === par ? i : -1)).filter((i) => i >= 0).sort(() => Math.random() - 0.5); for (let k = 0; k < per; k++) pick.push(g[k % g.length]); }
    pick.sort(() => Math.random() - 0.5); st.round = { list: pick, i: 0, cards: [] }; goHole(pick[0]);
  }
  function introText() { const R = st.round; el.g3play.textContent = R ? TF('Jugar · hoyo {a} de {b}', { a: R.i + 1, b: R.list.length }) : T('Jugar el hoyo'); el.g3tag.textContent = T(HOLE.tag); el.g3where.textContent = T(HOLE.where); el.g3title.textContent = T(HOLE.name); el.g3sub.textContent = `${T('Par')} ${HOLE.par} · ${HOLE.len} m · ${T(HOLE.info)}`; el.g3icard.innerHTML = ''; el.g3icard.style.display = 'none'; el.g3other.textContent = T(R ? '‹ Salir al menú' : '‹ Menú'); }
  // cambia de hoyo: mismo motor, otros datos (terreno, árboles, mapa, textos). Vuelve a la vista de inicio.
  // 7.3: compila los shaders y sube las texturas al cargar el hoyo, para que nada se compile en pleno vuelo (corte de cámara)
  function warmGL() { try { R.compile(S, cam); S.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { for (const k in m) { const v = m[k]; if (v && v.isTexture) R.initTexture(v); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (v && v.isTexture) R.initTexture(v); } } }); } catch (e) { /* nada */ } }
  function loadHole(i, intro) {
    HI = i; HOLE = HOLES[i]; st.infoTxt = 0; st.dTxt = null; derive(); buildScene(); applyWeather(); st.slopePts = null; st.slopeArr = null; st.slopeHeat = null; st.gTile = null; el.mapImg = paintMap(720, 1080, 6); bgStart(); warmGL(); // 7.3: todo lo pesado se prepara aquí, tapado por la carga (antes se calculaba en pleno vuelo y el juego se congelaba) st.pp = null; st.pk = null; st.introShift = 0; st.acK = null; st.infoTxt = null; st.mmZ = null;
    if (el.g3end) el.g3end.style.display = 'none'; st.strokes = 0; st.swing = null; st.ca = null; newRound(); resetBall(HOLE.tee); yawToCup(); st.club = pickClub(); refreshClubs();
    if (intro) { introText(); el.g3intro.style.display = ''; st.phase = 'intro'; const [p, l] = introCam(); camPos.copy(p); camLook.copy(l); }
  }
  // pantalla de carga: Tiny golfista, barra y (en un recorrido) la tarjeta; se pinta antes de montar el hoyo
  function boldInfo(t) {
    const e = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;'), m = t.match(/^([^:：]*[:：]\s*)([^.。!?！？]*[.。!?！？]?)([\s\S]*)$/);
    return m && m[2] ? e(m[1]) + '<b>' + e(m[2]) + '</b>' + e(m[3]) : e(t);
  }
  let lastLoad = 0;
  function goHole(i) {
    const R = st.round, H = HOLES[i]; el.g3ltag.textContent = R ? TF('Hoyo {a} de {b}', { a: R.i + 1, b: R.list.length }) + ' · ' + T(H.tag) : T(H.tag); el.g3ltit.textContent = T(H.name); el.g3lwhere.textContent = `${T(H.where)} · ${T('Par')} ${H.par} · ${H.len} m`; el.g3linfo.innerHTML = boldInfo(T(H.info)); el.g3lcard.innerHTML = R && R.cards.length ? cardHTML() : ''; el.g3lcard.style.display = el.g3lcard.innerHTML ? '' : 'none';
    /* rápido: si el último campo cargó en menos de 0,7 s, solo un fundido corto (sin pantalla de carga) */
    const quick = lastLoad > 0 && lastLoad < 700, L = el.g3load, bar = el.g3lbar;
    L.classList.toggle('quick', quick); L.style.transition = 'none'; L.style.opacity = '1'; L.style.display = 'flex'; el.g3end.style.display = 'none';
    bar.style.transition = 'none'; bar.style.transform = 'scaleX(.04)'; void bar.offsetWidth;
    if (!quick) { bar.style.transition = 'transform 7s cubic-bezier(.12,.75,.25,1)'; bar.style.transform = 'scaleX(.93)'; }
    const hide = () => { L.style.transition = 'opacity .28s ease-out'; L.style.opacity = '0'; setTimeout(() => { L.style.display = 'none'; L.style.opacity = '1'; }, 300); };
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { const t0 = performance.now(); loadHole(i, true); const took = performance.now() - t0; lastLoad = took;
      if (quick) { requestAnimationFrame(() => requestAnimationFrame(hide)); return; }
      const wait = Math.max(450, 1300 - took);
      setTimeout(() => { bar.style.transition = 'transform .35s ease-out'; bar.style.transform = 'scaleX(1)'; setTimeout(hide, 380); }, wait - 380); }, quick ? 0 : 80)));
  }
  function newRound(kind) { setWeather(kind || (st.wPref && st.wPref !== 'auto' ? st.wPref : undefined)); applyWeather(); st.drops = null; }
  function restart() { el.g3end.style.display = 'none'; st.strokes = 0; newRound(); resetBall(HOLE.tee); yawToCup(); st.club = pickClub(); toAim(); }
  /* ------------------------------------------------------------------ 13. montar */
  function mount(root, opts) {
    host = root; const canvas = document.createElement('canvas'); canvas.className = 'g3-canvas'; root.appendChild(canvas);
    if (opts && opts.hole != null) { HI = opts.hole; HOLE = HOLES[HI]; derive(); }
    build(canvas); buildUI(root); newRound(opts && opts.weather); resetBall(HOLE.tee); yawToCup(); st.club = pickClub(); refreshClubs();
    const [p, l] = introCam(); camPos.copy(p); camLook.copy(l);
    if (!opts || opts.menu !== false) showMenu(); else { introText(); }
    canvas.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    requestAnimationFrame(frame);
  }
  window.TQGolf3D = { mount, again: () => showMenu(), _st: st, _dbg: { prof: () => { const o = {}; let t = performance.now(); st.gTile = null; greenTile(); o.gTile = performance.now() - t; t = performance.now(); st.slopeHeat = null; slopeHeat(); o.heat = performance.now() - t; t = performance.now(); paintMap(720, 1080); o.map = performance.now() - t; t = performance.now(); drawMap(el.g3mini, false); o.draw = performance.now() - t; return o; }, step: (dt) => { st.t += dt; for (let i = 0; i < 8; i++) physics(dt / 8); if (st.phase === "sunk") st.sinkT += dt; updateCam(dt); }, cam: () => [camPos.toArray().map((v) => +v.toFixed(2)), camLook.toArray().map((v) => +v.toFixed(2))], physics, resetBall, launch, surf, h, pickClub, yawToCup, cupD, predict, setWeather, newRound, W, HOLE, CLUBS, HOLES, loadHole, setHole: (i) => { HI = i; HOLE = HOLES[i]; derive(); st.trees = []; }, hole: () => HOLE, startCharge, release, tempoOf, simPutt, meshH, aimCam: () => aimCam(), flat: (v) => { FLAT = v; }, renderer: () => R, scene: () => S, camera: () => cam, setCam: (p, l) => { camPos.set(...p); camLook.set(...l); st.paused = true; }, h } };
})();
