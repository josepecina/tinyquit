/* =====================================================================
 * TinyQuit · Minijuego «Pesca con Tiny» v2 (primera persona) · 19 oct
 * ---------------------------------------------------------------------
 * API:  window.TQPesca = { mount(containerEl), unmount(), again() }
 *
 * Vas tú pescando desde el embarcadero; Tiny se sienta a tu lado con su
 * cañita y reacciona a todo. Todo lo que está en el mundo (caña, sedal,
 * corcho, peces, orilla) se calcula en 3D y se proyecta con una cámara
 * de verdad (ver proj()).
 *  1. Lanzar: mantén pulsado (la caña va hacia atrás por encima del hombro)
 *     y suelta en la franja dorada → «¡Lance perfecto!» (más lejos y
 *     mejores peces). Si aguantas de más, el brazo se cansa y pierde fuerza.
 *  2. Esperar: mordisqueos (¡no toques!) y la picada: toca rápido; si es
 *     al instante, «¡Enganche perfecto!».
 *  3. Pelea: mantén para recoger y suelta cuando la tensión sube al rojo.
 * 25 peces en 3 lugares; dependen del cebo (con %), del lugar y de la hora.
 * Desbloqueos largos (decenas de capturas) para que dure mucho.
 * Guarda en localStorage 'tq.pesca'. Avisa a la app con
 * {game:'pesca', ev:'catch', id, kg, nuevo, especies, total} y {ev:'play'}.
 * ===================================================================== */
(function (root) {
  'use strict';
  function TQT(s) { try { const d = root.TQ_TR; return (d && typeof d[s] === 'string' && d[s]) || s; } catch (e) { return s; } }
  function tf(s, a) { return TQT(s).replace('{a}', a); }
  function tqSend(o) { try { if (root.TQBridge && root.TQBridge.postMessage) root.TQBridge.postMessage(JSON.stringify(o)); } catch (e) { /* sin app */ } }
  const W = 360, LH = 640, KEY = 'tq.pesca', DAY = 480; // un día entero = 8 minutos
  // cámara: ojos a 2,2 m sobre el agua, mirando al frente; horizonte en HY
  const HY = 236, EYE = 2.2, FOC = 560, CX = 180, DECK = 1.1;
  const FD = '"Fredoka","Trebuchet MS",sans-serif';
  const INK = '#22324F', MUTED = '#6B7080';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => t * t * (3 - 2 * t), easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function proj(X, Y, Z) { const z = Math.max(.05, Z); return { x: CX + FOC * X / z, y: HY + FOC * (EYE - Y) / z, k: FOC / z }; }

  // ------------------------------------------------------------------ datos
  const RAR = {
    c: { name: 'Común', w: 1, stam: 1, col: '#5E9E7A', col2: '#7FC29A' },
    u: { name: 'Poco común', w: .38, stam: 1.4, col: '#3B8FD0', col2: '#6CB6EC' },
    r: { name: 'Raro', w: .11, stam: 1.95, col: '#E8833A', col2: '#F6AE62' },
    l: { name: 'Legendario', w: .03, stam: 2.5, col: '#D4A21C', col2: '#F2CF5B' } };
  // Desbloqueos largos (Jose: que dure mucho y cueste)
  const BAITS = [
    { id: 'lombriz', name: 'Lombriz' },
    { id: 'maiz', name: 'Maíz', need: ['trucha', 30] },
    { id: 'grillo', name: 'Grillo', need: ['carpa', 40] },
    { id: 'gamba', name: 'Gamba', need: ['perca', 50] },
    { id: 'cuchara', name: 'Cucharilla', need: ['bass', 25] }];
  // lugares: se abren con especies del lugar anterior; cada uno pelea más fuerte
  const PLACES = [
    { id: 'lago', name: 'El lago', need: 0, str: 1 },
    { id: 'rio', name: 'El río', need: 7, from: 'lago', str: 1.15 },
    { id: 'mar', name: 'El muelle', need: 7, from: 'rio', str: 1.3 },
    { id: 'tropical', name: 'La laguna', need: 7, from: 'mar', str: 1.4 },
    { id: 'helado', name: 'El lago helado', need: 4, from: 'tropical', str: 1.5 },
    { id: 'pantano', name: 'El pantano', need: 4, from: 'helado', str: 1.65 }];
  // cañas: más lejos, aguantan más tensión y peces más grandes
  const RODS = [
    { id: 'bambu', name: 'Bambú', dist: 1, tens: 1, kg: 12, c: '#C9A35E', c2: '#8E6A34', need: 0 },
    { id: 'carbono', name: 'Carbono', dist: 1.2, tens: .8, kg: 40, c: '#3A4452', c2: '#1C222B', need: 15 },
    { id: 'maestra', name: 'Maestra', dist: 1.4, tens: .64, kg: 150, c: '#2F6AA6', c2: '#163A62', need: 30 }];
  const DEMO = () => !root.TQ_APP; // en las demos TODO abierto (Jose, 19 oct)
  const FISH = [
    // —— El lago
    { id: 'trucha', p: 'lago', name: 'Trucha arcoíris', r: 'c', b: { lombriz: 5, maiz: 3, grillo: 3 }, kg: [.3, 2.5], st: 'dash', sh: 'fus', pat: 'band', c: ['#7F9C86', '#EEF1E6', '#F08AA0', '#8FA894'], t: 'any',
      cur: 'Su franja rosa brilla más cuando el agua está fría.' },
    { id: 'carpa', p: 'lago', name: 'Carpa', r: 'c', b: { lombriz: 3, maiz: 6 }, kg: [1, 12], st: 'dive', sh: 'deep', pat: 'scales', c: ['#A9803E', '#F1DFAE', '#C9984A', '#9A6F35'], t: 'any',
      cur: 'Puede vivir más de 40 años y reconoce a quien le da de comer.' },
    { id: 'perca', p: 'lago', name: 'Perca', r: 'c', b: { lombriz: 5, grillo: 3 }, kg: [.2, 1.5], st: 'zig', sh: 'fus', pat: 'vstripes', c: ['#7E9A4C', '#F2EBC8', '#3F5B2C', '#F0823C'], t: 'any',
      cur: 'Sus rayas verticales la esconden entre las cañas.' },
    { id: 'sol', p: 'lago', name: 'Pez sol', r: 'c', b: { lombriz: 4, grillo: 2 }, kg: [.05, .3], st: 'zig', sh: 'round', pat: 'sun', c: ['#4E9AA8', '#F4B24A', '#2F6E86', '#5AA3A0'], t: 'dia',
      cur: 'Cabe en la palma de la mano y tiene los colores de un atardecer.' },
    { id: 'tenca', p: 'lago', name: 'Tenca', r: 'u', b: { lombriz: 3, maiz: 2 }, kg: [.5, 3], st: 'calm', sh: 'deep', pat: 'none', c: ['#5D7442', '#C9C98C', '#E2493A', '#4C6235'], t: 'crep',
      cur: 'La llamaban «pez doctor»: se decía que curaba a los otros peces.' },
    { id: 'bass', p: 'lago', name: 'Black bass', r: 'u', b: { grillo: 5, cuchara: 4, lombriz: 1 }, kg: [.5, 4], st: 'jump', sh: 'fus', pat: 'blotch', c: ['#5F7A45', '#EAE7C7', '#33472A', '#6A824E'], t: 'any',
      cur: 'Le encanta saltar fuera del agua cuando lo pescan.' },
    { id: 'lucio', p: 'lago', name: 'Lucio', r: 'r', b: { grillo: 2, cuchara: 6, lombriz: .5 }, kg: [2, 15], st: 'dash', sh: 'long', pat: 'spots', c: ['#5E7B4E', '#E9E5C2', '#DCD48A', '#8E7A3F'], t: 'any',
      cur: 'Espera quieto como un tronco y ataca en una décima de segundo.' },
    { id: 'koi', p: 'lago', name: 'Carpa koi', r: 'r', b: { maiz: 3 }, kg: [2, 10], st: 'calm', sh: 'deep', pat: 'koi', c: ['#FBF6EE', '#FFFFFF', '#F06A3C', '#F7E9DA'], t: 'dia',
      cur: 'En Japón es el símbolo de la constancia: sube los ríos contra corriente.' },
    { id: 'esturion', p: 'lago', name: 'Esturión', r: 'l', b: { lombriz: .4, cuchara: .6 }, kg: [10, 60], st: 'dive', sh: 'long', pat: 'scutes', c: ['#6B7A86', '#D9DEE0', '#ECEFF0', '#5C6A75'], t: 'noche',
      cur: 'Ya nadaba en los ríos cuando vivían los dinosaurios.' },
    // —— El río
    { id: 'fario', p: 'rio', name: 'Trucha común', r: 'c', b: { lombriz: 4, grillo: 4 }, kg: [.2, 2], st: 'dash', sh: 'fus', pat: 'redspots', c: ['#8B7347', '#F2E3B6', '#D9452E', '#9A8051'], t: 'any',
      cur: 'Solo vive en aguas muy limpias: si la ves, el río está sano.' },
    { id: 'boga', p: 'rio', name: 'Boga', r: 'c', b: { maiz: 4, grillo: 2, lombriz: 2 }, kg: [.1, .6], st: 'calm', sh: 'fus', pat: 'none', c: ['#7F8F96', '#EEF2F2', '#B8C4C8', '#C9A37A'], t: 'any',
      cur: 'Nada en grupos que brillan bajo el agua como monedas.' },
    { id: 'barbo', p: 'rio', name: 'Barbo', r: 'c', b: { lombriz: 4, maiz: 4 }, kg: [.5, 5], st: 'dive', sh: 'barbel', pat: 'none', c: ['#9A8452', '#EDE1BE', '#B49A5E', '#C07A4B'], t: 'any',
      cur: 'Busca comida entre las piedras con sus cuatro bigotes.' },
    { id: 'gobio', p: 'rio', name: 'Gobio', r: 'c', b: { lombriz: 5 }, kg: [.02, .1], st: 'zig', sh: 'barbel', pat: 'dots', c: ['#8E8A6E', '#EFEBD7', '#5D5A45', '#A8A27E'], t: 'dia',
      cur: 'Es tan pequeño que cabe en una cucharilla de postre.' },
    { id: 'anguila', p: 'rio', name: 'Anguila', r: 'u', b: { lombriz: 3, gamba: 2 }, kg: [.3, 3], st: 'zig', sh: 'eel', pat: 'none', c: ['#5B5F3A', '#D8D2A2', '#6E7244', '#5B5F3A'], t: 'noche',
      cur: 'Nace en el mar de los Sargazos y cruza un océano entero para llegar aquí.' },
    { id: 'lucioperca', p: 'rio', name: 'Lucioperca', r: 'u', b: { grillo: 2, cuchara: 4, gamba: 1 }, kg: [1, 8], st: 'dash', sh: 'long', pat: 'vstripes', c: ['#7F8C78', '#EEEEDD', '#4D5A4A', '#8E9A84'], t: 'crep',
      cur: 'Ve muy bien con poca luz: por eso caza al atardecer.' },
    { id: 'salmon', p: 'rio', name: 'Salmón', r: 'r', b: { gamba: 3, cuchara: 4 }, kg: [3, 15], st: 'jump', sh: 'fus', pat: 'xdots', c: ['#7D93A6', '#F7E4DC', '#F2A08A', '#8496A4'], t: 'any',
      cur: 'Vuelve al mismo río en el que nació, aunque esté a miles de kilómetros.' },
    { id: 'siluro', p: 'rio', name: 'Siluro', r: 'l', b: { gamba: .8, cuchara: .3, lombriz: .25 }, kg: [20, 90], st: 'dive', sh: 'cat', pat: 'marble', c: ['#4E4B44', '#D6CDB5', '#6D695E', '#3E3B35'], t: 'noche',
      cur: 'Puede medir más que una persona y tiene más de cien mil dientes diminutos.' },
    // —— El muelle (mar)
    { id: 'sardina', p: 'mar', name: 'Sardina', r: 'c', b: { lombriz: 3, gamba: 3 }, kg: [.03, .12], st: 'zig', sh: 'fus', pat: 'shine', c: ['#4F7FA6', '#F2F6F8', '#9CC3DC', '#7FA4C0'], t: 'any',
      cur: 'Viaja en bancos de millones que se mueven como si fueran uno.' },
    { id: 'caballa', p: 'mar', name: 'Caballa', r: 'c', b: { gamba: 4, cuchara: 4, lombriz: 1 }, kg: [.2, 1], st: 'dash', sh: 'tuna', pat: 'waves', c: ['#2F8C88', '#F1F4F2', '#1C4E5C', '#5BA7A0'], t: 'any',
      cur: 'Nunca deja de nadar: necesita moverse para poder respirar.' },
    { id: 'dorada', p: 'mar', name: 'Dorada', r: 'u', b: { gamba: 5, lombriz: 2 }, kg: [.3, 3], st: 'calm', sh: 'deep', pat: 'brow', c: ['#8FA2AE', '#F2F4F4', '#E3B23C', '#8B9BA6'], t: 'any',
      cur: 'Lleva una ceja dorada entre los ojos; de ahí su nombre.' },
    { id: 'lubina', p: 'mar', name: 'Lubina', r: 'u', b: { gamba: 4, cuchara: 3, grillo: 1 }, kg: [.5, 6], st: 'dash', sh: 'fus', pat: 'shine', c: ['#6E8798', '#F1F4F6', '#B9C8D2', '#7D93A1'], t: 'crep',
      cur: 'Le encanta cazar justo donde rompen las olas.' },
    { id: 'globo', p: 'mar', name: 'Pez globo', r: 'r', b: { gamba: 2, lombriz: 1 }, kg: [.2, 1], st: 'calm', sh: 'puffer', pat: 'dots', c: ['#D7B46A', '#FBF3DE', '#7C5B2A', '#E0C27F'], t: 'dia',
      cur: 'Si se asusta, se hincha como un balón. ¡Y luego se le pasa!' },
    { id: 'rodaballo', p: 'mar', name: 'Rodaballo', r: 'r', b: { gamba: 2, lombriz: 1 }, kg: [1, 10], st: 'dive', sh: 'flat', pat: 'dots', c: ['#9C8A6A', '#E9DEC6', '#6E5E43', '#AD9C7C'], t: 'any',
      cur: 'Nace con un ojo a cada lado y luego uno se le muda al otro.' },
    { id: 'atun', p: 'mar', name: 'Atún rojo', r: 'l', b: { cuchara: 1, gamba: .3 }, kg: [30, 200], st: 'dash', sh: 'tuna', pat: 'finlets', c: ['#24456E', '#E9EEF2', '#F2C94C', '#3A5E86'], t: 'dia',
      cur: 'Puede nadar a 70 km/h, más rápido que un coche por la ciudad.' },
    { id: 'mola', p: 'mar', name: 'Pez luna', r: 'l', b: { gamba: .5 }, kg: [60, 300], st: 'calm', sh: 'mola', pat: 'none', c: ['#A9B5BD', '#E7ECEF', '#8E9AA3', '#9AA7B0'], t: 'any',
      cur: 'Es el pez con espinas más pesado del mundo y le encanta tomar el sol.' },
    // —— La laguna tropical
    { id: 'loro', p: 'tropical', name: 'Pez loro', r: 'c', b: { gamba: 4, maiz: 2, lombriz: 2 }, kg: [.5, 4], st: 'calm', sh: 'deep', pat: 'scales', c: ['#2FB7A0', '#BDF0E2', '#F27FB2', '#5FD0E8'], t: 'dia',
      cur: 'Muerde el coral y lo convierte en arena: muchas playas blancas son obra suya.' },
    { id: 'cirujano', p: 'tropical', name: 'Pez cirujano', r: 'u', b: { gamba: 3, maiz: 2 }, kg: [.3, 1.5], st: 'zig', sh: 'round', pat: 'none', c: ['#2F6FD0', '#7FB3F2', '#FFD23C', '#1F3F8A'], t: 'any',
      cur: 'Tiene una cuchilla en la cola, como un bisturí: de ahí su nombre.' },
    { id: 'barracuda', p: 'tropical', name: 'Barracuda', r: 'r', b: { cuchara: 5, gamba: 1 }, kg: [3, 25], st: 'dash', sh: 'long', pat: 'xdots', c: ['#7F96A6', '#EEF3F5', '#3E5566', '#9AB0BE'], t: 'any',
      cur: 'Le atraen las cosas que brillan: por eso la cucharilla le encanta.' },
    { id: 'vela', p: 'tropical', name: 'Pez vela', r: 'l', b: { cuchara: .8, gamba: .3 }, kg: [25, 90], st: 'jump', sh: 'tuna', pat: 'vstripes', c: ['#244E8F', '#E6EEF5', '#6FB3F0', '#2F65B0'], t: 'dia',
      cur: 'Es uno de los peces más rápidos del mar y cambia de color al cazar.' },
    // —— El lago helado
    { id: 'salvelino', p: 'helado', name: 'Salvelino', r: 'c', b: { lombriz: 4, grillo: 3, gamba: 2 }, kg: [.3, 4], st: 'dash', sh: 'fus', pat: 'redspots', c: ['#4F6E7A', '#F6B08A', '#F2E7C8', '#E8704A'], t: 'any',
      cur: 'Vive más al norte que ningún otro pez de agua dulce.' },
    { id: 'timalo', p: 'helado', name: 'Tímalo', r: 'u', b: { grillo: 4, lombriz: 2 }, kg: [.3, 2], st: 'zig', sh: 'fus', pat: 'dots', c: ['#7D8C9C', '#E9ECEF', '#3E4B58', '#9C6FB0'], t: 'dia',
      cur: 'Recién pescado huele a tomillo; su nombre en latín lo recuerda.' },
    { id: 'lota', p: 'helado', name: 'Lota', r: 'r', b: { lombriz: 3, gamba: 3 }, kg: [1, 8], st: 'dive', sh: 'cat', pat: 'marble', c: ['#6E6A4E', '#E3DDBC', '#8A855E', '#5C5940'], t: 'noche',
      cur: 'Es el único bacalao de agua dulce y prefiere el agua helada.' },
    { id: 'taimen', p: 'helado', name: 'Taimen', r: 'l', b: { cuchara: .8, gamba: .4 }, kg: [20, 70], st: 'dash', sh: 'long', pat: 'xdots', c: ['#5E6B5A', '#EAD9C6', '#3A4436', '#C9503A'], t: 'any',
      cur: 'Es el salmón más grande del mundo y puede vivir más de 50 años.' },
    // —— El pantano
    { id: 'gato', p: 'pantano', name: 'Pez gato', r: 'c', b: { lombriz: 4, maiz: 3, gamba: 2 }, kg: [.5, 6], st: 'calm', sh: 'cat', pat: 'none', c: ['#5A5A4E', '#D9D2B8', '#3E3E36', '#4A4A40'], t: 'any',
      cur: 'Tiene papilas del gusto por todo el cuerpo: saborea con la piel.' },
    { id: 'serpiente', p: 'pantano', name: 'Cabeza de serpiente', r: 'u', b: { grillo: 3, gamba: 2, cuchara: 2 }, kg: [1, 8], st: 'zig', sh: 'long', pat: 'blotch', c: ['#5F6A44', '#D8D3A8', '#2E3522', '#55603C'], t: 'crep',
      cur: 'Puede respirar aire y aguantar días fuera del agua si está húmedo.' },
    { id: 'pejelagarto', p: 'pantano', name: 'Pejelagarto', r: 'r', b: { cuchara: 3, gamba: 2 }, kg: [3, 40], st: 'dash', sh: 'long', pat: 'spots', c: ['#7A7A58', '#E8E1C2', '#3E3A2A', '#8A7A50'], t: 'any',
      cur: 'Su familia es tan antigua que ya existía con los dinosaurios.' },
    { id: 'arapaima', p: 'pantano', name: 'Arapaima', r: 'l', b: { gamba: .6, cuchara: .5, lombriz: .2 }, kg: [50, 200], st: 'dive', sh: 'long', pat: 'scales', c: ['#4E5C4E', '#E8C9A8', '#C9503A', '#B84A36'], t: 'noche',
      cur: 'Sube a respirar aire cada pocos minutos y puede pasar de los dos metros.' }];
  const FBY = {}; FISH.forEach((f) => { FBY[f.id] = f; });
  const TAIL = { gato: 'round', arapaima: 'round', lota: 'round', serpiente: 'round', cirujano: 'fork', tenca: 'round', gobio: 'round', siluro: 'round', rodaballo: 'round', globo: 'round', mola: 'trunc', anguila: 'none', esturion: 'shark', atun: 'lunate', caballa: 'lunate', lucio: 'round', bass: 'round', sol: 'round' };
  const STYLE = { calm: { str: .6, burst: .2 }, dash: { str: .75, burst: .6 }, zig: { str: .65, burst: .4 }, dive: { str: 1, burst: .3 }, jump: { str: .75, burst: .4, jump: 1 } };
  const TIMEN = { dia: 'Pica de día', noche: 'Pica de noche', crep: 'Pica al amanecer y al atardecer', any: 'Pica a cualquier hora' };
  const HH = { fus: .27, deep: .44, long: .16, eel: .11, round: .52, barbel: .27, cat: .24, tuna: .3, puffer: .62, flat: .5, mola: .55 };
  const lenM = (f, kg) => .42 * Math.cbrt(kg) * (f.sh === 'eel' ? 1.8 : f.sh === 'long' ? 1.3 : f.sh === 'mola' || f.sh === 'round' || f.sh === 'puffer' ? .75 : 1);

  // ------------------------------------------------------------------ guardado
  function load() { try { return JSON.parse(root.localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { root.localStorage.setItem(KEY, JSON.stringify({ n: s.n, best: s.best, bait: s.bait, place: s.place, tod: s.tod, perf: s.perf, rod: s.rodId, mus: s.mus, tut: s.tut })); } catch (e) { /* nada */ } }
  const species = (s, p) => Object.keys(s.n).filter((k) => s.n[k] > 0 && (!p || FBY[k].p === p)).length;
  const baitOpen = (s, b) => DEMO() || !b.need || (s.n[b.need[0]] || 0) >= b.need[1];
  const placeOpen = (s, p) => DEMO() || !p.need || species(s, p.from) >= p.need;
  const rodOpen = (s, r) => DEMO() || species(s) >= r.need;
  // 7.3: cómo se desbloquea cada cosa (se enseña siempre junto al candado)
  const delEs = (t) => t.replace(/ de el /g, ' del ');
  const placeNeedS = (p) => { const pf = PLACES.find((q) => q.id === p.from); return delEs(`${p.need} ${TQT('especies de')} ${TQT(pf ? pf.name : '').toLowerCase()}`); };
  const placeNeed = (p) => delEs(tf('Se abre con {a}', placeNeedS(p)));
  const rodNeed = (r) => tf('Se abre con {a}', `${r.need} ${TQT('especies')}`);
  const baitNeed = (s, b) => tf('Pesca {a} para conseguirlo', `${b.need[1]} × ${TQT(FBY[b.need[0]].name)}`) + ` (${s.n[b.need[0]] || 0}/${b.need[1]})`;
  const ROD = (s) => RODS.find((r) => r.id === s.rodId) || RODS[0];
  const PL = (s) => PLACES.find((p) => p.id === s.place) || PLACES[0];
  function createState() {
    const d = load();
    const s = { n: d.n || {}, best: d.best || {}, perf: d.perf || 0, rodId: d.rod || 'bambu', mus: d.mus !== false, menu: true, drag: 0, reelSpin: 0, tut: d.tut || 0, spots: [], px: 0, py: 0, baitSwing: 0, bait: d.bait || 'lombriz', place: d.place || 'lago', tod: typeof d.tod === 'number' ? d.tod : .16,
      phase: 'idle', t: 0, pw: 0, holding: false, toasts: [], parts: [], rings: [], book: null, card: null, pops: [],
      rod: { e: .42, ev: 0, yaw: -.04, bend: 0, bx: 0 }, cam: { z: 1, tz: 1, fx: CX, fy: 330 }, shake: 0,
      face: 'calm', faceT: 0, msg: '', msgT: 0, saveT: 0, jumpers: [], shadows: [], birds: [], flies: [], idleT: 0 };
    if (!placeOpen(s, PL(s))) s.place = 'lago';
    if (!baitOpen(s, BAITS.find((b) => b.id === s.bait) || BAITS[0])) s.bait = 'lombriz';
    initPlace(s); return s;
  }
  function initPlace(s) {
    s.shadows = []; s.spots = []; for (let i = 0; i < 3; i++) spawnSpot(s, true);
    s.flies = []; for (let i = 0; i < 18; i++) s.flies.push({ x: rnd(0, 360), y: rnd(200, 520), ph: rnd(0, 6), sp: rnd(.4, 1) });
    s.birds = []; s.jumpers = [];
  }

  // ------------------------------------------------------------------ hora del día (degradados cozy: cielo de 3 tonos, agua de 3 tonos)
  // [fase, cielo arriba, cielo medio, horizonte, agua lejos, agua cerca, luz, bruma]
  const SKY = [
    [0, '#6A7FB8', '#E7B4B8', '#FFD2A1', '#E9C3B4', '#3E5E86', .62, '#FFE2C8'],
    [.08, '#77B5E8', '#BFE0F5', '#FFF0D6', '#BFDCEB', '#2F6E92', .9, '#FFF3E2'],
    [.2, '#5FAEEA', '#A9D8F6', '#E8F6FF', '#A9D9EC', '#23688F', 1, '#EEF8FF'],
    [.5, '#5AA9E8', '#A4D4F5', '#E3F4FF', '#A3D5EA', '#21648B', 1, '#EAF6FF'],
    [.63, '#6BA2DC', '#C9DDEF', '#FFE6BF', '#D9D6C6', '#2B5F84', .92, '#FFEBD0'],
    [.72, '#3F659F', '#E59A8A', '#FFC07A', '#F0B28A', '#2E4B70', .72, '#FFD2A6'],
    [.79, '#25395F', '#7E6A8C', '#E79A7A', '#9A7E86', '#1E3456', .46, '#D99A86'],
    [.86, '#0D1738', '#1C2C55', '#33497A', '#293F68', '#0B1832', .26, '#2C4270'],
    [.96, '#0F1A3E', '#22355F', '#3E5584', '#2E4670', '#0C1A36', .3, '#3A5080'],
    [1, '#6A7FB8', '#E7B4B8', '#FFD2A1', '#E9C3B4', '#3E5E86', .62, '#FFE2C8']];
  function hx(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mixc(a, b, t) { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); }
  function rgba(c, a) { const A = hx(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
  function sky(tod) {
    let i = 0; while (i < SKY.length - 2 && tod >= SKY[i + 1][0]) i++;
    const a = SKY[i], b = SKY[i + 1], t = ease(clamp((tod - a[0]) / (b[0] - a[0]), 0, 1));
    return { top: mixc(a[1], b[1], t), mid: mixc(a[2], b[2], t), hor: mixc(a[3], b[3], t), wf: mixc(a[4], b[4], t), wn: mixc(a[5], b[5], t), L: lerp(a[6], b[6], t), haze: mixc(a[7], b[7], t) };
  }
  const todKind = (t) => (t >= .08 && t < .66) ? 'dia' : (t >= .8 && t < .97) ? 'noche' : 'crep';
  function todName(t) { if (t >= .97 || t < .08) return 'Amanecer'; if (t < .3) return 'Mañana'; if (t < .5) return 'Mediodía'; if (t < .66) return 'Tarde'; if (t < .8) return 'Atardecer'; return 'Noche'; }
  const shade = (c, C, k) => mixc(c, '#0B1430', (1 - C.L) * (k == null ? .72 : k)); // oscurece con la noche

  // ------------------------------------------------------------------ sonido (WebAudio, muy suave)
  let AC = null;
  function ac() { if (root.TQ_NOSFX) return null; try { if (!AC) AC = new (root.AudioContext || root.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; }
  function tone(f0, f1, dur, vol, type, delay) {
    const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (delay || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, vol, fc, delay) {
    const a = ac(); if (!a) return; const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; f.type = 'lowpass'; f.frequency.value = fc; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(a.currentTime + (delay || 0));
  }
  function vib(p) { try { if (root.TQBridge) tqSend({ ev: 'vib', p }); else if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(p); } catch (e) { /* nada */ } }
  // técnica de cada pez: 'fondo' (quieto) o 'recogida' (pica mientras recoges: le atrae el movimiento)
  const RECOGIDA = { lucio: 1, bass: 1, lucioperca: 1, salmon: 1, caballa: 1, lubina: 1, atun: 1, barracuda: 1, vela: 1, taimen: 1, pejelagarto: 1, serpiente: 1 };
  const tec = (f) => RECOGIDA[f.id] ? 'recogida' : 'fondo';
  const SFX = {
    plop: (far) => { tone(520, 180, .16, .1 * (1 - far * .6)); noise(.18, .06 * (1 - far * .6), 1400); },
    nib: () => tone(700, 560, .06, .04),
    bite: () => { tone(880, 880, .12, .08, 'triangle'); tone(1175, 1175, .16, .07, 'triangle', .09); },
    tick: () => tone(2400, 1800, .02, .018, 'square'),
    splash: () => noise(.35, .1, 1800),
    perfect: () => [784, 1047, 1319].forEach((f, i) => tone(f, f, .25, .06, 'triangle', i * .06)),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .35, .07, 'triangle', i * .085)),
    lose: () => { tone(440, 300, .25, .06, 'triangle'); tone(330, 220, .35, .05, 'triangle', .16); },
    whoosh: () => noise(.32, .07, 3000), zip: () => { for (let i = 0; i < 8; i++) tone(3000 - i * 120, 2600 - i * 120, .015, .012, 'square', i * .035); } };

  // ------------------------------------------------------------------ utilidades de dibujo
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function ell(ctx, x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
  function padlock(ctx, x, y, k, col) { // 7.3: candado dibujado (los emojis no salen igual en todos los móviles)
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); const c = col || '#8A93A6'; ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4, -3.5); ctx.arc(0, -3.5, 4, Math.PI, 0); ctx.lineTo(4, 0); ctx.stroke();
    rr(ctx, -6.5, -1, 13, 10.5, 3); ctx.fillStyle = c; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(0, 3.6, 1.6, 0, 7); ctx.fill(); ctx.restore(); }
  function fillRR(ctx, x, y, w, h, r, c) { rr(ctx, x, y, w, h, r); ctx.fillStyle = c; ctx.fill(); }
  function vgrad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function txt(ctx, s, x, y, size, color, weight, align) { ctx.font = `${weight || 600} ${size}px ${FD}`; ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); }
  function wrap(ctx, text, maxW) { const w = String(text).split(' '), l = []; let line = ''; for (const x of w) { const t = line ? line + ' ' + x : x; if (ctx.measureText(t).width > maxW && line) { l.push(line); line = x; } else line = t; } if (line) l.push(line); return l; }
  function para(ctx, s, x, y, maxW, size, color, weight, lh) { ctx.font = `${weight || 500} ${size}px ${FD}`; const L = wrap(ctx, s, maxW); L.forEach((ln, i) => txt(ctx, ln, x, y + i * size * (lh || 1.3), size, color, weight || 500)); return L.length * size * (lh || 1.3); }
  const fmtKg = (kg) => (kg < 1 ? Math.round(kg * 1000) + ' g' : (kg < 10 ? kg.toFixed(2) : kg.toFixed(1)).replace('.', root.TQ_DEC || ',') + ' kg');
  // botón con degradado y canto (como en los otros juegos)
  function gbutton(ctx, x, y, w, h, c1, c2, edge, label, size) { fillRR(ctx, x, y + 4, w, h, h / 2, edge); rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = vgrad(ctx, y, y + h, [[0, c1], [1, c2]]); ctx.fill(); fillRR(ctx, x + h * .3, y + 3, w - h * .6, h * .32, h * .16, 'rgba(255,255,255,.25)'); txt(ctx, label, x + w / 2, y + h / 2 + 1, size || 17, '#fff', 700); }
  // NUBE DEL CIELO: una sola silueta (nunca círculos sueltos) con degradado de luz arriba y sombra abajo
  function skyCloud(ctx, x, y, w, h, seed, top, bot, alpha) {
    let sd = seed * 9301 + 49297; const R = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
    const n = 4 + Math.floor(R() * 2), pts = []; for (let i = 0; i <= n; i++) pts.push([x + w * i / n, y - h * (.35 + .65 * Math.sin(Math.PI * i / n)) * (.75 + .5 * R())]);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 0; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], my = Math.min(y0, y1) - h * (.25 + .2 * R()); ctx.bezierCurveTo(x0, my, x1, my, x1, y1 + (i < n - 1 ? h * .12 : 0)); }
    ctx.quadraticCurveTo(x + w * .5, y + h * .14, x, y); ctx.closePath();
    ctx.globalAlpha = alpha; ctx.fillStyle = vgrad(ctx, y - h * 1.1, y + h * .1, [[0, top], [.65, top], [1, bot]]); ctx.fill(); ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ PECES (lo más importante: bien dibujados)
  // Pez de lado mirando a la derecha, centrado en (x,y), largo len (cuerpo + cola).
  function bodyPath(ctx, f, L, wig) {
    const s = f.sh, hh = HH[s] * L, nose = L * .5, tb = -L * (s === 'eel' ? .5 : s === 'mola' ? .3 : .3);
    ctx.beginPath();
    if (s === 'eel') {
      const up = [], dn = []; for (let i = 0; i <= 16; i++) { const t = i / 16, x = lerp(nose, tb, t), w = hh * (t < .1 ? .7 + t * 3 : 1 - t * .8), y = Math.sin(t * 5 + wig * 3) * hh * .8 * t; up.push([x, y - w]); dn.push([x, y + w * .9]); }
      ctx.moveTo(nose + L * .02, 0); up.forEach(([x, y]) => ctx.lineTo(x, y)); dn.reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); return { hh, nose, tb };
    }
    const blunt = s === 'round' || s === 'puffer' || s === 'mola' ? .55 : s === 'deep' ? .35 : s === 'cat' ? .3 : .15;
    const top = hh * (s === 'flat' ? 1 : 1.04), bot = hh * (s === 'flat' ? .96 : s === 'deep' ? .9 : .82), my = s === 'long' || s === 'cat' ? hh * .12 : hh * .05;
    ctx.moveTo(nose, my);
    ctx.bezierCurveTo(nose, my - top * (.35 + blunt), nose - L * (.12 + blunt * .1), -top, L * .06, -top);
    ctx.bezierCurveTo(-L * .12, -top, tb * .7, -hh * .55, tb, -hh * .18);
    ctx.lineTo(tb, hh * .18);
    ctx.bezierCurveTo(tb * .7, bot * .55, -L * .12, bot, L * .06, bot);
    ctx.bezierCurveTo(nose - L * (.12 + blunt * .1), bot, nose, my + bot * (.3 + blunt * .5), nose, my);
    ctx.closePath(); return { hh, nose, tb };
  }
  function finFill(ctx, c, edge, alpha) { ctx.globalAlpha = alpha; ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = edge; ctx.stroke(); }
  function rays(ctx, ox, oy, pts, col, lw) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y]) => { ctx.moveTo(ox, oy); ctx.lineTo(x, y); }); ctx.stroke(); }
  function drawFish(ctx, f, x, y, len, dir, wig, mode) {
    // mode: 'full' | 'shadow' (sombra en el agua) | 'unknown' (silueta del libro)
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.rotate(Math.sin(wig) * .04);
    const L = len, s = f.sh, hh = HH[s] * L, tb = -L * (s === 'eel' ? .5 : .3), [c0, c1, c2, c3] = f.c, full = mode === 'full';
    const SIL = mode === 'shadow' ? 'rgba(8,26,44,.32)' : '#C5CBD4', edge = full ? rgba(mixc(c0, '#101828', .55), .55) : 'rgba(0,0,0,0)';
    const fin = full ? c3 : SIL, finA = full ? .9 : 1, lw = Math.max(.7, L / 110), tw = Math.sin(wig * 2) * .22, tail = TAIL[f.id] || (s === 'tuna' ? 'lunate' : 'fork');
    ctx.lineWidth = lw; ctx.lineJoin = 'round';
    // cola
    if (s !== 'eel') {
      const tl = L * (tail === 'trunc' ? .08 : tail === 'lunate' ? .24 : .22), th = hh * (tail === 'lunate' ? 1.25 : tail === 'round' ? .8 : tail === 'trunc' ? .9 : 1), bx = tb + L * .02;
      ctx.beginPath(); ctx.moveTo(bx, -hh * .14);
      if (tail === 'round') { ctx.bezierCurveTo(tb - tl * .5, -th + tw * L * .1, tb - tl * 1.15, -th * .5 + tw * L * .1, tb - tl, tw * L * .08); ctx.bezierCurveTo(tb - tl * 1.15, th * .5 + tw * L * .1, tb - tl * .5, th + tw * L * .1, bx, hh * .14); }
      else if (tail === 'trunc') { ctx.quadraticCurveTo(tb - tl * 1.6, -th * .2, tb - tl * .4, -th * .75); ctx.quadraticCurveTo(tb - tl * 1.4, 0, tb - tl * .4, th * .75); ctx.quadraticCurveTo(tb - tl * 1.6, th * .2, bx, hh * .14); }
      else if (tail === 'shark') { ctx.quadraticCurveTo(tb - tl * .6, -th * .5, tb - tl * 1.3, -th * 1.1 + tw * L * .1); ctx.quadraticCurveTo(tb - tl * .8, -th * .1, tb - tl * .7, th * .5 + tw * L * .1); ctx.quadraticCurveTo(tb - tl * .3, th * .2, bx, hh * .14); }
      else { const fork = tail === 'lunate' ? .75 : .42; ctx.quadraticCurveTo(tb - tl * .45, -th * .45, tb - tl * 1.05, -th + tw * L * .12); ctx.quadraticCurveTo(tb - tl * (1 - fork), tw * L * .1, tb - tl * 1.05, th + tw * L * .12); ctx.quadraticCurveTo(tb - tl * .45, th * .45, bx, hh * .14); }
      ctx.closePath(); finFill(ctx, fin, edge, finA);
      if (full) { const pts = []; for (let i = 0; i <= 6; i++) pts.push([tb - tl * (tail === 'round' ? .95 : .9), lerp(-th * .85, th * .85, i / 6) + tw * L * .1]); rays(ctx, tb + L * .01, 0, pts, rgba(mixc(c3, '#000', .35), .35), lw * .7); }
      // aleta dorsal (con radios)
      ctx.beginPath();
      if (s === 'mola') { ctx.moveTo(-L * .02, -hh * .82); ctx.quadraticCurveTo(-L * .02, -hh * 1.6, -L * .16, -hh * 1.75); ctx.lineTo(-L * .2, -hh * .66); ctx.closePath(); finFill(ctx, fin, edge, finA); ctx.beginPath(); ctx.moveTo(-L * .02, hh * .82); ctx.quadraticCurveTo(-L * .02, hh * 1.6, -L * .16, hh * 1.75); ctx.lineTo(-L * .2, hh * .66); ctx.closePath(); finFill(ctx, fin, edge, finA); }
      else if (s === 'flat') { ctx.moveTo(L * .38, -hh * .62); ctx.quadraticCurveTo(L * .05, -hh * 1.22, tb * .95, -hh * .3); ctx.lineTo(tb * .6, -hh * .55); ctx.closePath(); finFill(ctx, fin, edge, finA); ctx.beginPath(); ctx.moveTo(L * .28, hh * .7); ctx.quadraticCurveTo(L * .02, hh * 1.18, tb * .95, hh * .3); ctx.lineTo(tb * .6, hh * .5); ctx.closePath(); finFill(ctx, fin, edge, finA); }
      else {
        const dx = s === 'long' || s === 'cat' ? -L * .12 : L * .1, dl = s === 'long' ? L * .14 : s === 'cat' ? L * .1 : L * .3, dh = L * (s === 'deep' || s === 'round' ? .13 : s === 'tuna' ? .1 : .11);
        const spiky = f.pat === 'vstripes' || f.id === 'bass' || f.id === 'lubina' || f.id === 'lucioperca';
        ctx.moveTo(dx, -hh * .96); ctx.quadraticCurveTo(dx - dl * .2, -hh - dh * (spiky ? 1.1 : 1), dx - dl * .45, -hh - dh * .8); ctx.quadraticCurveTo(dx - dl * .8, -hh - dh * .5, dx - dl, -hh * .86); ctx.closePath(); finFill(ctx, fin, edge, finA);
        if (full) { const pts = []; for (let i = 0; i <= 6; i++) pts.push([dx - dl * i / 6, -hh - dh * (spiky && i % 2 ? 1.05 : .8) * Math.sin(Math.PI * (.15 + .7 * i / 6))]); rays(ctx, dx - dl * .5, -hh * .85, pts, rgba(mixc(c3, '#000', .35), .4), lw * .7); }
        if (s === 'tuna' || f.id === 'trucha' || f.id === 'fario' || f.id === 'salmon') { ctx.beginPath(); ctx.moveTo(tb * .55, -hh * .7); ctx.quadraticCurveTo(tb * .62, -hh * 1.02, tb * .72, -hh * .6); ctx.closePath(); finFill(ctx, fin, edge, finA); } // aleta adiposa
        // anal y pélvica
        ctx.beginPath(); ctx.moveTo(-L * .08, hh * .78); ctx.quadraticCurveTo(-L * .14, hh + L * .07, -L * .24, hh * .62); ctx.closePath(); finFill(ctx, fin, edge, finA);
        ctx.beginPath(); ctx.moveTo(L * .12, hh * .82); ctx.quadraticCurveTo(L * .07, hh + L * .07, L * .0, hh * .8); ctx.closePath(); finFill(ctx, fin, edge, finA);
      }
    }
    // cuerpo
    const B = bodyPath(ctx, f, L, wig);
    if (!full) { ctx.fillStyle = SIL; ctx.fill(); }
    else {
      ctx.fillStyle = vgrad(ctx, -hh, hh, [[0, mixc(c0, '#0E1A2A', .18)], [.35, c0], [.62, mixc(c0, c1, .7)], [1, c1]]); ctx.fill();
      ctx.save(); ctx.clip(); pattern(ctx, f, L, hh);
      // escamas muy sutiles y línea lateral
      if (s !== 'eel' && s !== 'cat' && s !== 'mola' && s !== 'puffer') { ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = lw * .8; const r = L * .035; for (let ix = 0; ix < 18; ix++) for (let iy = -6; iy <= 6; iy++) { ctx.beginPath(); ctx.arc(-L * .28 + ix * r * 1.25 + (iy & 1) * r * .6, iy * r * .95, r, -1.1, 1.1); ctx.stroke(); } }
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(L * .3, -hh * .2); ctx.quadraticCurveTo(0, -hh * .05, tb, hh * .02); ctx.stroke();
      // brillo y sombra de volumen
      const gl = ctx.createLinearGradient(0, -hh, 0, hh); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(.3, 'rgba(255,255,255,.28)'); gl.addColorStop(.45, 'rgba(255,255,255,0)'); gl.addColorStop(.85, 'rgba(0,0,0,0)'); gl.addColorStop(1, 'rgba(10,20,40,.18)');
      ctx.fillStyle = gl; ctx.fillRect(-L, -hh * 1.1, L * 2, hh * 2.2);
      const gr = ctx.createRadialGradient(L * .3, -hh * .1, 0, L * .3, -hh * .1, L * .5); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(-L, -hh * 1.1, L * 2, hh * 2.2);
      ctx.restore(); ctx.strokeStyle = edge; ctx.lineWidth = lw * 1.2; bodyPath(ctx, f, L, wig); ctx.stroke();
    }
    if (mode !== 'shadow') {
      const ex = s === 'eel' ? L * .42 : s === 'mola' ? L * .3 : s === 'round' || s === 'puffer' ? L * .28 : L * .34, ey = s === 'flat' ? -hh * .42 : s === 'round' || s === 'puffer' ? -hh * .22 : s === 'deep' ? -hh * .2 : -hh * .16;
      const er = Math.max(1.4, L * (s === 'puffer' ? .065 : s === 'eel' ? .022 : s === 'mola' ? .04 : .042));
      if (full) {
        // agalla y aleta pectoral translúcida con radios
        if (s !== 'eel' && s !== 'mola') { ctx.strokeStyle = rgba(mixc(c0, '#101828', .5), .35); ctx.lineWidth = lw * 1.3; ctx.beginPath(); ctx.arc(L * .3 - Math.min(hh * .55, L * .14), ey * .3, Math.min(hh * .62, L * .16), -.95, .95); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(L * .2, hh * .2); ctx.quadraticCurveTo(L * .08, hh * .5, L * .04, hh * .55); ctx.quadraticCurveTo(L * .09, hh * .3, L * .2, hh * .2); ctx.closePath(); finFill(ctx, c3, rgba(mixc(c3, '#000', .3), .5), .75);
        rays(ctx, L * .2, hh * .2, [[L * .05, hh * .53], [L * .08, hh * .45], [L * .11, hh * .37]], rgba(mixc(c3, '#000', .35), .45), lw * .6);
      }
      // ojo: esclerótica, iris dorado, pupila y brillo
      ctx.fillStyle = full ? '#FFFFFF' : '#AEB4BE'; ctx.beginPath(); ctx.arc(ex, ey, er * 1.3, 0, 7); ctx.fill();
      if (full) { ctx.fillStyle = f.id === 'tenca' ? '#D84A35' : f.id === 'lucioperca' ? '#C8D8E0' : '#E8B84A'; ctx.beginPath(); ctx.arc(ex + er * .1, ey, er * 1.0, 0, 7); ctx.fill(); }
      ctx.fillStyle = full ? '#141A28' : '#98A0AB'; ctx.beginPath(); ctx.arc(ex + er * .18, ey, er * .62, 0, 7); ctx.fill();
      if (full) { ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(ex + er * .45, ey - er * .4, er * .28, 0, 7); ctx.fill(); }
      if (s === 'flat') { ctx.fillStyle = full ? '#141A28' : '#98A0AB'; ctx.beginPath(); ctx.arc(ex - er * 3, ey - er * 1.5, er * .8, 0, 7); ctx.fill(); }
      if (s === 'barbel' || s === 'cat') { ctx.strokeStyle = full ? mixc(c2, '#000', .1) : '#AEB4BE'; ctx.lineWidth = Math.max(.8, L / 80); ctx.lineCap = 'round'; ctx.beginPath(); const L2 = s === 'cat' ? .32 : .12; ctx.moveTo(L * .47, hh * .12); ctx.quadraticCurveTo(L * .56, hh * .6, L * (.5 - L2 * .3), hh * (.6 + L2 * 3)); ctx.moveTo(L * .48, 0); ctx.quadraticCurveTo(L * .62, hh * .3, L * .6, hh * (.4 + L2 * 2)); ctx.stroke(); }
      if (full) { ctx.strokeStyle = 'rgba(20,24,36,.45)'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(L * .5, hh * .1); ctx.quadraticCurveTo(L * .45, hh * .2, L * .4, hh * .15); ctx.stroke(); }
      if (s === 'puffer' && full) { ctx.strokeStyle = rgba(mixc(c0, '#000', .3), .5); ctx.lineWidth = lw; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = hh * .95; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .9 + L * .02, Math.sin(a) * r * .9); ctx.lineTo(Math.cos(a) * r * 1.08 + L * .02, Math.sin(a) * r * 1.08); ctx.stroke(); } }
    }
    ctx.restore();
  }
  function pattern(ctx, f, L, hh) {
    const [c0, c1, c2] = f.c; const P = f.pat; ctx.fillStyle = c2; ctx.strokeStyle = c2;
    let seed = 7; const R = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    if (P === 'band') { const g = ctx.createLinearGradient(0, -hh * .3, 0, hh * .25); g.addColorStop(0, rgba(c2, 0)); g.addColorStop(.5, rgba(c2, .85)); g.addColorStop(1, rgba(c2, 0)); ctx.fillStyle = g; ctx.fillRect(-L * .5, -hh * .3, L, hh * .55); ctx.fillStyle = 'rgba(40,50,40,.42)'; for (let i = 0; i < 34; i++) { ctx.beginPath(); ctx.arc(lerp(-L * .45, L * .35, R()), lerp(-hh, -hh * .15, R()), L * .011, 0, 7); ctx.fill(); } }
    else if (P === 'vstripes') { ctx.globalAlpha = .5; for (let i = 0; i < 6; i++) { const x = lerp(-L * .22, L * .26, i / 5); ctx.beginPath(); ctx.moveTo(x - L * .035, -hh); ctx.quadraticCurveTo(x + L * .01, -hh * .3, x - L * .005, hh * .3); ctx.lineTo(x - L * .03, hh * .3); ctx.quadraticCurveTo(x - L * .04, -hh * .3, x - L * .07, -hh); ctx.fill(); } ctx.globalAlpha = 1; }
    else if (P === 'scales') { ctx.globalAlpha = .28; ctx.lineWidth = Math.max(.8, L / 110); ctx.strokeStyle = '#5E4018'; const r = L * .05; for (let ix = 0; ix < 12; ix++) for (let iy = -4; iy < 5; iy++) { ctx.beginPath(); ctx.arc(-L * .28 + ix * r * 1.3 + (iy & 1) * r * .65, iy * r * 1.05, r, -1.25, 1.25); ctx.stroke(); } ctx.globalAlpha = 1; }
    else if (P === 'shine') { const g = ctx.createLinearGradient(0, -hh * .2, 0, hh * .2); g.addColorStop(0, rgba(c2, 0)); g.addColorStop(.5, rgba(c2, .75)); g.addColorStop(1, rgba(c2, 0)); ctx.fillStyle = g; ctx.fillRect(-L * .5, -hh * .2, L, hh * .4); }
    else if (P === 'spots' || P === 'dots' || P === 'redspots' || P === 'xdots') {
      const n = P === 'spots' ? 30 : 24; for (let i = 0; i < n; i++) { const x = lerp(-L * .42, L * .35, R()), y = lerp(-hh * .95, hh * (P === 'dots' ? .8 : .3), R()), r = L * (P === 'spots' ? .022 : .016);
        ctx.beginPath(); if (P === 'xdots') { ctx.lineWidth = Math.max(.8, L / 110); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); } else { ctx.ellipse(x, y, r * 1.35, r, 0, 0, 7); ctx.fill(); if (P === 'redspots') { ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(.6, L / 160); ctx.stroke(); ctx.strokeStyle = c2; } } } }
    else if (P === 'blotch') { ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(L * .32, -hh * .05); for (let i = 0; i <= 10; i++) { const x = lerp(L * .32, -L * .3, i / 10); ctx.lineTo(x, -hh * (.18 + .1 * Math.sin(i * 1.9))); } for (let i = 10; i >= 0; i--) { const x = lerp(L * .32, -L * .3, i / 10); ctx.lineTo(x, hh * (.08 + .08 * Math.sin(i * 2.3))); } ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    else if (P === 'koi') { ctx.fillStyle = c2; [[.16, -.45, .17, .5, .3], [-.1, -.6, .14, .42, -.2], [-.28, .05, .1, .32, .5]].forEach(([x, y, rx, ry, r]) => { ctx.beginPath(); ctx.ellipse(x * L, y * hh, rx * L, ry * hh * 2, r, 0, 7); ctx.fill(); }); ctx.fillStyle = '#2C2C34'; ctx.beginPath(); ctx.ellipse(-L * .04, -hh * .28, L * .035, hh * .14, .2, 0, 7); ctx.fill(); }
    else if (P === 'scutes') { ctx.fillStyle = c2; for (let i = 0; i < 11; i++) { const x = lerp(-L * .28, L * .34, i / 10); for (const yy of [-hh * .82, -hh * .1, hh * .55]) { ctx.beginPath(); ctx.moveTo(x, yy - L * .02); ctx.lineTo(x + L * .022, yy); ctx.lineTo(x, yy + L * .015); ctx.lineTo(x - L * .022, yy); ctx.fill(); } } }
    else if (P === 'sun') { ctx.globalAlpha = .65; ctx.strokeStyle = c2; ctx.lineWidth = L * .024; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-L * .28 + i * L * .1, -hh); ctx.quadraticCurveTo(-L * .23 + i * L * .1, 0, -L * .28 + i * L * .1, hh); ctx.stroke(); } ctx.globalAlpha = 1; ctx.fillStyle = '#E8603C'; ctx.beginPath(); ctx.ellipse(L * .22, -hh * .12, L * .045, L * .035, 0, 0, 7); ctx.fill(); }
    else if (P === 'waves') { ctx.strokeStyle = c2; ctx.lineWidth = L * .016; ctx.globalAlpha = .85; for (let i = 0; i < 10; i++) { const x = -L * .4 + i * L * .08; ctx.beginPath(); ctx.moveTo(x, -hh); ctx.quadraticCurveTo(x + L * .05, -hh * .6, x, -hh * .2); ctx.stroke(); } ctx.globalAlpha = 1; }
    else if (P === 'brow') { ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(L * .3, -hh * .48, L * .07, hh * .09, -.3, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(60,70,90,.2)'; ctx.lineWidth = L * .007; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-L * .4, -hh * .6 + i * hh * .24); ctx.lineTo(L * .25, -hh * .6 + i * hh * .24); ctx.stroke(); } }
    else if (P === 'finlets') { ctx.fillStyle = c2; for (let i = 0; i < 6; i++) { const x = -L * .1 - i * L * .035; ctx.beginPath(); ctx.moveTo(x, -hh * .62 + i * hh * .07); ctx.lineTo(x - L * .018, -hh * .82 + i * hh * .06); ctx.lineTo(x - L * .028, -hh * .56 + i * hh * .07); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, hh * .6 - i * hh * .06); ctx.lineTo(x - L * .018, hh * .8 - i * hh * .05); ctx.lineTo(x - L * .028, hh * .52 - i * hh * .06); ctx.fill(); } const g = ctx.createLinearGradient(0, -hh * .15, 0, hh * .15); g.addColorStop(0, 'rgba(160,200,230,0)'); g.addColorStop(.5, 'rgba(170,210,240,.55)'); g.addColorStop(1, 'rgba(160,200,230,0)'); ctx.fillStyle = g; ctx.fillRect(-L * .5, -hh * .15, L, hh * .3); }
    else if (P === 'marble') { ctx.globalAlpha = .38; ctx.fillStyle = '#2A2824'; for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.ellipse(lerp(-L * .45, L * .3, R()), lerp(-hh, 0, R()), L * .05, hh * .18, R() * 3, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  }
  // tamaño del pez para que quepa en una caja (cuenta cola y aletas)
  function fitLen(f, w, h) { const hh = HH[f.sh], tl = f.sh === 'eel' ? 0 : .24, fh = f.sh === 'mola' ? 1.75 : 1.3; return Math.min(w / (1 + tl + .04), h / (2 * hh * fh + .06)); }

  // ------------------------------------------------------------------ iconos de cebo
  function baitIcon(ctx, id, x, y, k, locked) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (locked) ctx.globalAlpha = .32; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (id === 'lombriz') { ctx.strokeStyle = '#E98B8F'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-10, 4); ctx.bezierCurveTo(-6, -8, -1, 8, 3, -2); ctx.quadraticCurveTo(6, -8, 10, -3); ctx.stroke(); ctx.strokeStyle = '#C96A70'; ctx.lineWidth = 1; for (let i = -6; i < 8; i += 4) { ctx.beginPath(); ctx.moveTo(i, -3); ctx.lineTo(i + 1, 3); ctx.stroke(); } }
    else if (id === 'maiz') { for (let i = 0; i < 3; i++) { const g = ctx.createRadialGradient(-8 + i * 7, i === 1 ? -4 : 0, 0, -7 + i * 7, i === 1 ? -2 : 2, 5); g.addColorStop(0, '#FFE58A'); g.addColorStop(1, '#F0B52C'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-7 + i * 7, i === 1 ? -2 : 2, 4.2, 5, 0, 0, 7); ctx.fill(); } }
    else if (id === 'grillo') { ctx.fillStyle = '#7A5A35'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(9, -1, 3.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#5A3F22'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(-8, -7); ctx.lineTo(-13, 5); ctx.moveTo(11, -3); ctx.quadraticCurveTo(16, -10, 19, -8); ctx.stroke(); }
    else if (id === 'gamba') { ctx.strokeStyle = '#F28466'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 7, -2.6, 1.2); ctx.stroke(); ctx.strokeStyle = '#D9654A'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-14, -9); ctx.moveTo(-6, -3); ctx.lineTo(-13, -4); ctx.stroke(); ctx.fillStyle = '#F28466'; ctx.beginPath(); ctx.moveTo(3, 7); ctx.lineTo(9, 11); ctx.lineTo(9, 4); ctx.fill(); }
    else if (id === 'cuchara') { const g = ctx.createLinearGradient(-8, -8, 8, 8); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.5, '#B9C3CC'); g.addColorStop(1, '#E8EDF1'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-2, 0, 9, 5.5, -.3, 0, 7); ctx.fill(); ctx.strokeStyle = '#8B97A2'; ctx.lineWidth = 1; ctx.stroke(); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(7, -3); ctx.lineTo(12, -6); ctx.stroke(); ctx.fillStyle = '#E8603C'; ctx.beginPath(); ctx.arc(-4, 1, 1.8, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  // ------------------------------------------------------------------ Tiny sentado a tu lado en el embarcadero
  function tinyBody(ctx, k, fill, shadow) { // una sola forma: rectángulo + 3 bultos en el mismo trazo
    const blob = (dy) => { ctx.beginPath(); [[-26, 6, 24], [0, -12, 30], [28, 4, 23]].forEach(([cx, cy, r]) => { ctx.moveTo(cx * k + r * k, (cy + dy) * k); ctx.arc(cx * k, (cy + dy) * k, r * k, 0, 7); });
      const x = -48 * k, y = dy * k, w = 96 * k, h = 36 * k, r = 18 * k; ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }; // OJO: sin beginPath dentro (si no, se pierden los bultos)
    blob(5); ctx.fillStyle = shadow; ctx.fill(); blob(0); ctx.fillStyle = fill; ctx.fill();
  }
  function tiny(ctx, s, x, y, C) {
    const k = 1.0, hop = s.face === 'happy' ? -Math.abs(Math.sin(s.t * 7)) * 6 : 0, br = Math.sin(s.t * 1.6) * 1.2;
    ctx.save(); ctx.translate(x, y + hop + br * .4);
    // su cañita, hacia el agua
    const tipx = 70, tipy = -78 + Math.sin(s.t * .9) * 2 - (s.face === 'alert' ? 10 : 0);
    ctx.strokeStyle = shade('#8A5E38', C); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(22, 10); ctx.quadraticCurveTo(48, -40, tipx, tipy); ctx.stroke();
    // cuerpo con degradado (luz arriba-izquierda)
    const g = ctx.createLinearGradient(-40, -40, 30, 40); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, mixc('#E6EEF8', '#9AA9C6', 1 - C.L));
    tinyBody(ctx, k, g, rgba('#7C8FB4', .35));
    const f = s.face, ex = 13, ey = 4; ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
    if (f === 'calm' || f === 'sleep') { ctx.beginPath(); ctx.moveTo(-ex - 5, ey); ctx.quadraticCurveTo(-ex, ey + 4, -ex + 5, ey); ctx.moveTo(ex - 5, ey); ctx.quadraticCurveTo(ex, ey + 4, ex + 5, ey); ctx.stroke(); }
    else if (f === 'alert' || f === 'focus') { ctx.beginPath(); ctx.ellipse(-ex, ey, 3.4, 4.2, 0, 0, 7); ctx.ellipse(ex, ey, 3.4, 4.2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-ex + 1.2, ey - 1.5, 1.3, 0, 7); ctx.arc(ex + 1.2, ey - 1.5, 1.3, 0, 7); ctx.fill(); }
    else if (f === 'happy') { ctx.beginPath(); ctx.moveTo(-ex - 5, ey + 2); ctx.quadraticCurveTo(-ex, ey - 5, -ex + 5, ey + 2); ctx.moveTo(ex - 5, ey + 2); ctx.quadraticCurveTo(ex, ey - 5, ex + 5, ey + 2); ctx.stroke(); }
    else if (f === 'sad') { ctx.beginPath(); ctx.moveTo(-ex - 5, ey - 1); ctx.lineTo(-ex + 4, ey + 2); ctx.moveTo(ex + 5, ey - 1); ctx.lineTo(ex - 4, ey + 2); ctx.stroke(); }
    ctx.fillStyle = INK; ctx.beginPath();
    if (f === 'happy') { ctx.moveTo(-6, ey + 10); ctx.quadraticCurveTo(0, ey + 18, 6, ey + 10); ctx.stroke(); }
    else if (f === 'alert') { ctx.ellipse(0, ey + 13, 3, 3.8, 0, 0, 7); ctx.fill(); }
    else if (f === 'sad') { ctx.moveTo(-5, ey + 15); ctx.quadraticCurveTo(0, ey + 11, 5, ey + 15); ctx.stroke(); }
    else { ctx.moveTo(-4, ey + 11); ctx.quadraticCurveTo(0, ey + 14, 4, ey + 11); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,143,192,.75)'; ctx.beginPath(); ctx.ellipse(-ex - 9, ey + 8, 5, 3.3, 0, 0, 7); ctx.ellipse(ex + 9, ey + 8, 5, 3.3, 0, 0, 7); ctx.fill();
    // gorro de pescador (con degradado)
    ctx.fillStyle = vgrad(ctx, -50, -24, [[0, '#FFD873'], [1, '#E9A93A']]); ctx.beginPath(); ctx.ellipse(-2, -27, 36, 8, -.06, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-24, -28); ctx.quadraticCurveTo(-22, -54, 0, -55); ctx.quadraticCurveTo(20, -54, 20, -29); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#D9822B'; ctx.fillRect(-23, -34, 43, 5); ctx.fillStyle = '#3B8FD0'; ctx.beginPath(); ctx.moveTo(14, -36); ctx.lineTo(24, -44); ctx.lineTo(20, -33); ctx.fill(); // plumita
    // bracito con la caña
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(26, 8, 10, 8, -.5, 0, 7); ctx.fill();
    if (s.phase === 'wait' && s.idleT > 9) { const a = .5 + .5 * Math.sin(s.t * 2); txt(ctx, 'z', 38, -60 - (s.t * 10 % 14), 12, rgba('#FFFFFF', a), 700); txt(ctx, 'z', 48, -72 - (s.t * 10 % 14), 9, rgba('#FFFFFF', a * .8), 700); }
    ctx.restore();
  }

  // ------------------------------------------------------------------ lógica
  // BANCOS DE PECES: sombras en sitios y distancias distintas; hay que lanzar donde están (Jose, 19 oct)
  function spawnSpot(s, first) {
    const kind = todKind(s.tod), pool = FISH.filter((f) => f.p === s.place && (f.t === 'any' || f.t === kind)); if (!pool.length) return;
    let tot = 0; const w = pool.map((f) => { const x = RAR[f.r].w * (f.r === 'l' ? .6 : 1); tot += x; return x; }); let r = Math.random() * tot, f = pool[0]; for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { f = pool[i]; break; } }
    const maxZ = Math.min(58, 50 * ROD(s).dist * (s.place === 'rio' ? .82 : 1)), Z = rnd(11, maxZ), X = rnd(-.26, .26) * Z, n = f.r === 'l' ? 1 : f.r === 'r' ? 2 : Math.floor(rnd(3, 7));
    const m = []; for (let i = 0; i < n; i++) m.push({ dx: rnd(-1.4, 1.4), dz: rnd(-1.2, 1.2), ph: rnd(0, 6), v: rnd(.6, 1.2) });
    const cross = !first && Math.random() < .5, dir = Math.random() < .5 ? -1 : 1; // la mitad entran por un lado y cruzan
    s.spots.push({ f, X: cross ? -dir * Z * .42 : X, Z, vx: cross ? dir * rnd(.5, 1.6) * (f.r === 'c' ? 1 : .7) : rnd(-.25, .25), vz: rnd(-.15, .15), m, t: first ? rnd(0, 20) : cross ? 3 : 0, life: cross ? 999 : rnd(40, 75), cross, len: lenM(f, (f.kg[0] + f.kg[1]) / 2) });
  }
  function nearSpot(s, X, Z) { let best = null, bd = 1e9; for (const sp of s.spots) { const d = Math.hypot(sp.X - X, (sp.Z - Z) * .8); if (d < bd) { bd = d; best = sp; } } return bd < 6 ? best : null; }
  function pickFish(s, power, perfect) {
    const kind = todKind(s.tod), pool = []; let tot = 0;
    for (const f of FISH) {
      if (f.p !== s.place) continue; const bw = f.b[s.bait] || 0; if (!bw) continue;
      if (f.t !== 'any' && f.t !== kind) continue;
      const far = power + (perfect ? .35 : 0), boost = f.r === 'c' ? 1 - far * .3 : 1 + far * (f.r === 'l' ? 1.3 : .9);
      const w = bw * RAR[f.r].w * boost; pool.push([f, w]); tot += w;
    }
    let x = Math.random() * tot; for (const [f, w] of pool) { x -= w; if (x <= 0) return f; } return pool.length ? pool[0][0] : FBY.trucha;
  }
  function chances(s, place) {
    const kind = todKind(s.tod), out = {}; let tot = 0;
    for (const f of FISH) { if (f.p !== place) continue; const bw = f.b[s.bait] || 0; out[f.id] = 0; if (!bw || (f.t !== 'any' && f.t !== kind)) continue; out[f.id] = bw * RAR[f.r].w; tot += out[f.id]; }
    for (const k in out) out[k] = tot ? out[k] / tot : 0; return out;
  }
  function rollKg(f) { const u = Math.pow(Math.random(), 2.4); return f.kg[0] + (f.kg[1] - f.kg[0]) * u; }
  function setFace(s, f, t) { s.face = f; s.faceT = t || 0; }
  function toast(s, text, col) { s.toasts.push({ text, col: col || INK, t: 0 }); }
  function say(s, text, t) { s.msg = text; s.msgT = t || 1.6; }
  function fitTxt(ctx, str, x, y, size, maxW, color, weight, align) { let f = size; ctx.font = `${weight || 600} ${f}px ${FD}`; while (ctx.measureText(str).width > maxW && f > 8.5) { f -= .5; ctx.font = `${weight || 600} ${f}px ${FD}`; } txt(ctx, str, x, y, f, color, weight, align); }
  function pop(s, text, x, y, col) { s.pops.push({ text, x, y, col: col || '#FFD45C', t: 0 }); }
  function ring(s, X, Z, big) { s.rings.push({ X, Z, r: big ? .25 : .12, a: big ? .9 : .55, v: big ? 1.2 : .6 }); }
  function splash(s, X, Z, n, big) { for (let i = 0; i < n; i++) s.parts.push({ X: X + rnd(-.1, .1), Y: 0, Z: Z + rnd(-.1, .1), vx: rnd(-.8, .8) * (big ? 1.6 : 1), vy: rnd(1.2, 2.8) * (big ? 1.4 : 1), vz: rnd(-.6, .6), life: rnd(.5, .9), t: 0, r: rnd(.02, .05) }); ring(s, X, Z, true); }
  const CH = { T: 5, P0: .88, P1: .95 }; // carga muy lenta y tranquila (5,2 s): se puede lanzar cerquita o lejísimos; franja dorada = lance perfecto
  function startCast(s) { s.phase = 'charge'; s.pw = 0; s.pt = 0; setFace(s, 'focus'); s.idleT = 0; }
  function release(s) {
    if (s.phase !== 'charge') return;
    const p = s.pw, perfect = p >= CH.P0 && p <= CH.P1;
    const Z = (5 + p * 43) * ROD(s).dist * (perfect ? 1.18 : 1) * (s.place === 'rio' ? .82 : 1);
    s.cast = { p, perfect, Z, X: (s.aim || 0) * Z + rnd(-.02, .02) * Z, t: 0, dur: .55 + p * .55 }; s.phase = 'fly'; SFX.whoosh(); SFX.zip(); s.rod.ev = -9; s.shake = .25;
    if (perfect) { s.perf++; SFX.perfect(); pop(s, TQT('¡Lance perfecto!'), 250, 300, '#FFD45C'); s.flash = .5; }
    tqSend({ ev: 'play' });
  }
  function landed(s) {
    const c = s.cast; s.phase = 'wait'; s.bob = { X: c.X, Z: c.Z, dip: 0, under: 0 }; SFX.plop(clamp(c.Z / 60, 0, 1)); splash(s, c.X, c.Z, 7); setFace(s, 'calm'); s.idleT = 0;
    // ¿Has caído junto a un banco? Entonces es probable que pique uno de ellos (si le gusta tu cebo). Si no, solo de vez en cuando.
    const sp = nearSpot(s, c.X, c.Z); let f = null, wait = rnd(2, 5);
    if (sp && (sp.f.b[s.bait] || 0) > 0 && Math.random() < .85) f = Math.random() < .8 ? sp.f : pickFish(s, c.p, c.perfect);
    else if (Math.random() < (sp ? .4 : .35)) { f = pickFish(s, c.p, c.perfect); wait = rnd(6, 12); }
    s.hook = f ? { f, kg: rollKg(f), wait, nibs: tec(f) === 'recogida' ? 0 : Math.floor(rnd(0, 3.99)), nibT: 0, tt: 0, state: 'come', X: sp && f === sp.f ? sp.X : c.X + rnd(-5, 5), Z: sp && f === sp.f ? sp.Z : c.Z + rnd(-5, 6), idle: 0 } : { state: 'none', tt: 0 };
    if (c.perfect) vib(20);
  }
  function tapDuringWait(s) {
    const h = s.hook;
    if (s.phase === 'bite') { startFight(s, h.bt < .24); return; }
    if (h && h.state === 'nib') { s.phase = 'wait'; setFace(s, 'sad', 1.2); s.hook.state = 'gone'; s.hook.tt = 0; vib(8); return; }
  }
  function startFight(s, perfect) {
      const h = s.hook; s.phase = 'fight'; SFX.splash(); splash(s, s.bob.X, s.bob.Z, 10, true); setFace(s, 'alert'); vib(perfect ? [60, 30, 60, 30, 120] : [70, 40, 110]);
      if (perfect) { pop(s, TQT('¡Enganche perfecto!'), 180, 240, '#7FE3C8'); SFX.perfect(); }
      const R = RAR[h.f.r], St = STYLE[h.f.st], sizeK = (h.kg - h.f.kg[0]) / (h.f.kg[1] - h.f.kg[0] + 1e-6), rod = ROD(s), over = Math.max(0, h.kg - rod.kg) / rod.kg;
      s.fight = { T: perfect ? .18 : .4, prog: perfect ? .08 : 0, slack: 0, stam: R.stam * (1 + sizeK * .6) * (1 + over * .4), str: St.str * (.85 + sizeK * .4) * PL(s).str * (h.f.r === 'l' ? 1.15 : 1) * (1 + Math.min(1.5, over) * .5),
        sizeK, burst: 0, kind: null, bt: rnd(.6, 1.6), jump: 0, X: s.bob.X, Z: s.bob.Z, Z0: s.bob.Z, D: .5, side: 0, ph: 0, tick: 0, jy: 0, miss: 0, maxMiss: { c: 3, u: 2, r: 2, l: 1 }[h.f.r], qte: null, qcd: 1.2, vt: 0 };
  }
  function lose(s, why) {
    s.phase = 'idle'; SFX.lose(); setFace(s, 'sad', 1.8);
    vib(220); say(s, why === 'snap' ? '¡Se ha roto el sedal! Suelta cuando la tensión llegue al rojo.' : why === 'qte' ? 'Se ha escapado… ¡sigue la flecha a tiempo!' : 'Se ha soltado… No dejes el sedal flojo tanto rato.', 2.8); s.hook = null; s.fight = null; s.bob = null;
  }
  function caught(s) {
    const f = s.hook.f, kg = s.hook.kg, id = f.id; SFX.splash(); splash(s, s.fight.X, s.fight.Z, 14, true); vib([30, 60, 30, 60, 90]);
    const isNew = !(s.n[id] > 0), rec = !isNew && kg > (s.best[id] || 0);
    const ob = BAITS.map((b) => baitOpen(s, b)), op = PLACES.map((p) => placeOpen(s, p)), or = RODS.map((r) => rodOpen(s, r));
    s.n[id] = (s.n[id] || 0) + 1; if (kg > (s.best[id] || 0)) s.best[id] = kg;
    s.phase = 'lifted'; s.lift = { t: 0, f, kg, X: s.fight.X, Z: s.fight.Z }; setFace(s, 'happy');
    s.card = { f, kg, isNew, rec, t: 0, unlocks: [] };
    BAITS.forEach((b, i) => { if (!ob[i] && baitOpen(s, b)) s.card.unlocks.push({ k: 'bait', b }); });
    PLACES.forEach((p, i) => { if (!op[i] && placeOpen(s, p)) s.card.unlocks.push({ k: 'place', p }); });
    RODS.forEach((r, i) => { if (!or[i] && rodOpen(s, r)) s.card.unlocks.push({ k: 'rod', r }); });
    if (species(s) === FISH.length && isNew) s.card.unlocks.push({ k: 'master' });
    s.fight = null; s.bob = null; save(s); s.drag = 0;
    tqSend({ game: 'pesca', ev: 'catch', id, kg: Math.round(kg * 1000) / 1000, nuevo: isNew, especies: species(s), total: Object.values(s.n).reduce((a, b) => a + b, 0) });
  }
  function update(s, dt) {
    s.t += dt; { const t0 = s.tod, seg = t0 >= .97 || t0 < .08 ? .11 : t0 < .66 ? .58 : t0 < .8 ? .14 : .17; s.tod = (t0 + dt * seg / 120) % 1; } s.saveT += dt; if (s.saveT > 10) { s.saveT = 0; save(s); }
    if (s.faceT > 0) { s.faceT -= dt; if (s.faceT <= 0) s.face = 'calm'; }
    if (s.msgT > 0) s.msgT -= dt; if (s.flash > 0) s.flash -= dt; if (s.shake > 0) s.shake -= dt;
    for (const p of s.parts) { p.t += dt; p.vy -= 9.8 * dt; p.X += p.vx * dt; p.Y += p.vy * dt; p.Z += p.vz * dt; if (p.Y < 0 && p.vy < 0) p.t = p.life; }
    s.parts = s.parts.filter((p) => p.t < p.life);
    for (const r of s.rings) { r.r += r.v * dt; r.a -= dt * .55; } s.rings = s.rings.filter((r) => r.a > 0);
    for (const p of s.pops) p.t += dt; s.pops = s.pops.filter((p) => p.t < 1.6);
    for (const sp of s.spots) { sp.t += dt; sp.X += sp.vx * dt; sp.Z = clamp(sp.Z + sp.vz * dt, 10, 60); if (!sp.cross && Math.abs(sp.X) > sp.Z * .3) sp.vx = -sp.vx; if (sp.cross && Math.abs(sp.X) > sp.Z * .46) sp.t = sp.life + 3; for (const m of sp.m) m.ph += dt * 3 * m.v; if (Math.random() < dt * .25) ring(s, sp.X + rnd(-1, 1), sp.Z + rnd(-1, 1), false); }
    s.spots = s.spots.filter((sp) => sp.t < sp.life + 3); while (s.spots.length < 3) spawnSpot(s, false);
    if (s.baitSwing > 0) s.baitSwing -= dt;
    if (Math.random() < dt * .18 && s.spots.length) { const sp = s.spots[Math.floor(Math.random() * s.spots.length)]; s.jumpers.push({ X: sp.X + rnd(-1, 1), Z: sp.Z + rnd(-1, 1), t: 0, f: sp.f.r === 'l' ? FISH.filter((f) => f.p === s.place && f.r === 'c')[0] : sp.f }); } // saltos SOBRE los bancos: pistas de dónde lanzar
    for (const j of s.jumpers) { j.t += dt; if (j.t > .55 && !j.sp) { j.sp = 1; ring(s, j.X, j.Z, false); } } s.jumpers = s.jumpers.filter((j) => j.t < 1.4);
    if (Math.random() < dt * .5) ring(s, rnd(-14, 14), rnd(6, 40), false);
    if (todKind(s.tod) === 'dia' && s.birds.length < 3 && Math.random() < dt * .05) s.birds.push({ x: -20, y: rnd(60, 170), v: rnd(14, 26), ph: rnd(0, 6) });
    for (const b of s.birds) { b.x += b.v * dt; b.ph += dt * 8; } s.birds = s.birds.filter((b) => b.x < 400);
    for (const t of s.toasts) t.t += dt; s.toasts = s.toasts.filter((t) => t.t < 2.8);
    // caña: muelle amortiguado hacia su ángulo objetivo
    const R = s.rod; let te = .42, tb = 0;
    if (s.phase === 'charge') { s.pt += dt; const u = s.pt / CH.T; s.pw = u <= 1 ? u : Math.max(.35, 1 - (s.pt - CH.T * 1.15) * .5); if (u > 1.12 && !s.tired) { s.tired = 1; } te = lerp(.42, 1.95, clamp(s.pw, 0, 1)); }
    else s.tired = 0;
    if (s.phase === 'fly') te = .12; if (s.phase === 'wait') tb = s.holding ? .14 : 0; if (s.phase === 'bite') tb = R.bend; if (s.phase === 'fight') { const F = s.fight; te = .52 + F.T * .22 - (F.kind === 'down' ? .12 : 0); tb = clamp(F.T * (.75 + F.sizeK * .7) + (F.kind === 'down' ? .35 : 0) + (F.jump > 0 ? .3 : 0), 0, 1.7); } if (s.phase === 'lifted') { te = .9; tb = .5 + lenM(s.lift.f, s.lift.kg) * .4; }
    R.ev += ((te - R.e) * 160 - R.ev * 18) * dt; R.e += R.ev * dt; R.bend = lerp(R.bend, tb, dt * 8);
    const ty = (s.fight ? clamp(s.fight.X / s.fight.Z * .55, -.16, .16) : s.bob ? (s.holding && s.phase === 'wait' ? clamp(s.drag < 0 ? s.drag * .34 : s.drag * .2, -.34, .2) : clamp(s.bob.X / s.bob.Z * .5, -.16, .16)) : (s.aim || 0) * .6 - .02); R.yaw = lerp(R.yaw, ty, dt * (s.phase === 'fight' ? 1.6 : 3)); R.side = lerp(R.side || 0, s.fight ? clamp((s.fight.X / s.fight.Z - R.yaw) * 4, -1, 1) : 0, dt * 6);
    // cámara: se acerca suavemente al corcho cuando está lejos (como cuando enfocas la vista)
    const cam = s.cam, tgt = s.bob || s.fight;
    if (tgt && (s.phase === 'wait' || s.phase === 'bite' || s.phase === 'fight')) { const p = proj(tgt.X, 0, tgt.Z); cam.tz = 1 + clamp((tgt.Z - 10) / 40, 0, 1) * .75; cam.fx = lerp(cam.fx, p.x, dt * 2); cam.fy = lerp(cam.fy, p.y, dt * 2); }
    else if (s.phase === 'charge') { const pw = clamp(s.pw, 0, 1); cam.tz = 1 + pw * .09; cam.fx = lerp(cam.fx, CX + (s.aim || 0) * 120, dt * 2.5); cam.fy = lerp(cam.fy, 330 - pw * 40, dt * 2); } // al cargar, la vista mira un poquito hacia donde apuntas y hacia lo lejos
    else { cam.tz = 1; cam.fx = lerp(cam.fx, CX, dt * 2); cam.fy = lerp(cam.fy, 330, dt * 2); }
    cam.z = lerp(cam.z, cam.tz, dt * 1.5);
    if (s.book) return;
    if (s.phase === 'fly') { s.cast.t += dt; if (s.cast.t >= s.cast.dur) landed(s); }
    else if (s.phase === 'wait' || s.phase === 'bite') {
      const h = s.hook, b = s.bob; h.tt += dt; s.idleT += dt; b.dip = Math.max(0, b.dip - dt * 4); const rec = h.f && tec(h.f) === 'recogida';
      if (s.place === 'rio') b.X = Math.min(b.X + dt * .2, b.Z * .3); // la corriente arrastra el corcho (sin sacarlo de la vista)
      if (s.holding && s.phase === 'wait') { // RECOGER: el corcho viene hacia ti poco a poco (como el carrete de verdad)
        const v = 7; b.Z -= v * dt; b.X = clamp(b.X + (Math.sin(s.rod.yaw) * .8 * b.Z - b.X) * .35 * dt, -b.Z * .34, b.Z * .34); // la caña tira del sedal: el corcho va poco a poco hacia donde apunta b.X *= 1 - dt * .25; s.reelSpin += dt * 14; s.idleT = 0; s.rod.bend = Math.max(s.rod.bend, .12); s.reelT = (s.reelT || 0) + dt;
        if (s.reelT > .08) { s.reelT = 0; SFX.tick(); } if (Math.random() < dt * 6) ring(s, b.X, b.Z, false);
        if (h.state === 'nib') { h.state = 'gone'; h.tt = 0; setFace(s, 'sad', 1); vib(8); }
        else if (h.state === 'come' && rec) { const dx = b.X - h.X, dz = b.Z - h.Z, d = Math.hypot(dx, dz); if (d > .4) { const sp2 = 5 + 4 * Math.random(); h.X += dx / d * sp2 * dt; h.Z += dz / d * sp2 * dt; } else if (h.tt > 1) { s.phase = 'bite'; h.bt = 0; startFight(s, false); vib([90, 30, 120]); pop(s, TQT('¡Ha picado recogiendo!'), 180, 240, '#7FE3C8'); return; } }
        else if (h.state === 'come' && Math.random() < dt * .6) { h.tt = 0; h.wait = rnd(2.5, 6); }
        if (b.Z < 5.3) { s.phase = 'idle'; s.hook = null; s.bob = null; SFX.plop(0); s.baitSwing = .8; }
      }
      if (h.state === 'gone' && h.f) { h.X += dt * 3; if (h.tt > 4) { const sp = nearSpot(s, b.X, b.Z); if (sp && (sp.f.b[s.bait] || 0) > 0 && Math.random() < .6) { h.state = 'come'; h.tt = 0; h.f = sp.f; h.kg = rollKg(h.f); h.nibs = tec(h.f) === 'recogida' ? 0 : Math.floor(rnd(0, 3.99)); h.X = sp.X; h.Z = sp.Z; h.wait = rnd(3, 7); h.idle = 0; } else { h.state = 'none'; } } }
      if (h.state === 'none' || h.state === 'gone') { h.scan = (h.scan || 0) + dt; if (h.scan > .5) { h.scan = 0; const sp = nearSpot(s, b.X, b.Z); // al pasar junto a un banco (recogiendo o porque se acerca), alguno se interesa
          if (sp && (sp.f.b[s.bait] || 0) > 0 && (h.state === 'none' || h.tt > 3) && Math.random() < .45) { Object.assign(h, { state: 'come', f: sp.f, kg: rollKg(sp.f), tt: 0, wait: rnd(1.5, 3.5), nibs: tec(sp.f) === 'recogida' ? 0 : Math.floor(rnd(0, 3.99)), X: sp.X, Z: sp.Z, idle: 0, nibT: 0 }); } } }
      else if (rec && h.state === 'come') { if (!s.holding) { h.idle += dt; if (h.idle > 7) { h.state = 'gone'; h.tt = 0; } } else h.idle = 0; }
      else if (h.state === 'come') { const dx = b.X - h.X, dz = b.Z - h.Z, d = Math.hypot(dx, dz); if (h.tt > h.wait * .4 && d > .1) { const sp = 1.2 + 1.2 * Math.min(1, h.tt / 4); h.X += dx / d * sp * dt; h.Z += dz / d * sp * dt; } if (d < .3 && h.tt > h.wait) { h.state = h.nibs > 0 ? 'nib' : 'bite'; h.nibT = rnd(.4, .9); } }
      else if (h.state === 'nib') { h.nibT -= dt; if (h.nibT <= 0) { if (h.nibs > 0) { h.nibs--; b.dip = .5; SFX.nib(); ring(s, b.X, b.Z, false); h.nibT = rnd(.7, 1.5); s.rod.ev -= 2.5; s.rod.bend = Math.max(s.rod.bend, .25); vib(12); } else h.state = 'bite'; } }
      if (h.state === 'bite' && s.phase !== 'bite') { s.phase = 'bite'; h.bt = 0; h.win = { c: .95, u: .8, r: .66, l: .55 }[h.f.r]; SFX.bite(); setFace(s, 'alert'); splash(s, b.X, b.Z, 5); s.rod.ev -= 3; vib([70, 40, 110]); }
      if (s.phase === 'bite') { h.bt += dt; b.dip = 1; b.X += Math.sin(s.t * 9) * dt * .3; s.rod.bend = lerp(s.rod.bend, .55 + lenM(h.f, h.kg) * .2, dt * 10); if (h.bt > h.win) { s.phase = 'wait'; setFace(s, 'sad', 1.2); h.state = 'gone'; h.tt = 0; } }
    } else if (s.phase === 'fight') {
      const F = s.fight, St = STYLE[s.hook.f.st], reel = s.holding, rod = ROD(s); F.ph += dt;
      // cada pez tira a su manera: se aleja, se va al fondo, a los lados, salta…
      F.bt -= dt; if (F.bt <= 0) { F.burst = Math.random() < St.burst + .25 ? rnd(.6, 1) : 0;
        const st = s.hook.f.st; F.kind = !F.burst ? null : st === 'dive' ? (Math.random() < .7 ? 'down' : 'run') : st === 'zig' ? 'side' : st === 'dash' ? (Math.random() < .5 ? 'run' : 'side') : st === 'jump' ? (Math.random() < .45 && F.prog > .1 ? 'jump' : 'side') : 'side';
        F.side = F.kind === 'side' ? (st === 'zig' ? -(F.side || 1) : Math.random() < .5 ? -1 : 1) : 0; F.bt = F.burst ? (st === 'calm' ? rnd(1.2, 2) : st === 'zig' ? rnd(.4, .8) : rnd(.6, 1.3)) : rnd(.6, 1.6);
        if (F.kind === 'jump') { F.jump = 1.1; SFX.splash(); vib([40, 30, 140]); } }
      const counter = 0; F.counter = 0;
      if (F.burst && !F.qte && F.kind !== 'jump' && F.qcd <= 0 && F.kind) { // al empezar un tirón: gesto contrario con tiempo
        const dir = F.kind === 'side' ? (F.side < 0 ? 'R' : 'L') : F.kind === 'down' ? 'U' : 'D';
        if (Math.random() < { c: .6, u: .75, r: .85, l: 1 }[s.hook.f.r]) { F.qte = { dir: Math.random() < .15 ? 'TAP' : dir, t: 0, win: { c: 1.5, u: 1.25, r: 1.05, l: .85 }[s.hook.f.r], taps: 0, ox: s.holding ? s.px : null, oy: s.py }; vib(25); }
      }
      F.qcd -= dt; F.vt -= dt; if (F.burst && F.vt <= 0) { F.vt = .35; vib(F.T > .85 ? 30 : 14); } // el pez se nota en la mano
      if (F.qte) { const Q = F.qte; Q.t += dt; let res = 0;
        if (Q.dir === 'TAP') { if (Q.taps >= 4) res = 1; }
        else if (Q.ox != null) { const dx = s.px - Q.ox, dy = s.py - Q.oy; if (Math.hypot(dx, dy) > 42) { const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'); res = d === Q.dir ? 1 : -1; } }
        if (!res && Q.t > Q.win) res = -1;
        if (res === 1) { F.qte = null; F.qcd = rnd(.8, 1.6); F.burst = 0; F.kind = null; F.bt = rnd(.8, 1.4); F.prog = Math.min(1, F.prog + .06); F.T = Math.max(0, F.T - .25); pop(s, TQT('¡Bien!'), 180, 330, '#7FE3C8'); vib(30); SFX.nib(); }
        else if (res === -1) { F.qte = null; F.qcd = rnd(.8, 1.6); F.miss++; F.str *= 1.05; pop(s, '✕', 180, 330, '#FF7A59'); vib([80, 40, 80]); if (F.miss >= F.maxMiss) { lose(s, 'qte'); return; } } }
      let pull = F.str * (.45 + F.burst * .95 + (s.hook.f.st === 'zig' ? Math.sin(F.ph * 5) * .22 : 0)) * (1 - .55 * counter);
      if (F.kind === 'down') pull *= 1.25;
      if (F.jump > 0) { F.jump -= dt; pull *= 1.7; F.jy = F.jump > .2 && F.jump < .95 ? Math.sin((F.jump - .2) / .75 * Math.PI) * (.8 + lenM(s.hook.f, s.hook.kg)) : 0; if (F.jump < .25 && !F.spl) { F.spl = 1; splash(s, F.X, F.Z, 10, true); } } else { F.jy = 0; F.spl = 0; }
      pull = Math.max(.1, pull);
      if (reel) { F.T += (.24 + .8 * pull) * rod.tens * dt; F.prog += dt * (.5 / F.stam) * (1.15 - .55 * pull) * (F.kind === 'down' ? .45 : 1) * (1 + counter * .5); s.reelSpin += dt * 16; F.tick -= dt; if (F.tick <= 0) { F.tick = .08; SFX.tick(); } }
      else { F.T -= (.55 - .12 * pull) * dt; F.prog -= dt * .09 * pull / F.stam; }
      if (F.kind === 'run' && F.burst) { F.Z0 = Math.min(F.Z0 + dt * 3.5 * F.burst, 75); if (!reel) F.T = Math.max(F.T, .15); } // se lleva sedal
      F.T = clamp(F.T, 0, 1.05); F.prog = clamp(F.prog, 0, 1);
      if (F.T < .06) F.slack += dt; else F.slack = Math.max(0, F.slack - dt * 2);
      F.D = lerp(F.D, F.kind === 'down' ? 2.2 + F.sizeK * 2 : .45, dt * 1.2); // profundidad
      F.Z = lerp(F.Z0, 5.2, F.prog); F.X = lerp(F.X, F.side * (2.2 + F.Z * .14) + Math.sin(F.ph * 1.3) * (.6 + F.Z * .03), dt * (F.burst ? 2.2 : .8));
      if (F.burst && Math.random() < dt * 8) ring(s, F.X, F.Z, false);
      if (F.T > .9 && F.vt <= 0) { F.vt = .25; vib(18); }
      if (F.T >= 1) lose(s, 'snap'); else if (F.slack > 2.2) lose(s, 'slack'); else if (F.prog >= 1) caught(s);
    } else if (s.phase === 'lifted') { s.lift.t += dt; if (s.lift.t > 1.15) { s.phase = 'card'; SFX.win(); } }
    if (s.card && s.phase === 'card') s.card.t += dt;
  }

  // ------------------------------------------------------------------ mundo (con «zoom» de la vista)
  function world(ctx, s, v, C) {
    const x0 = v.x0 - 200, x1 = v.x1 + 200, y0 = v.y0 - 200;
    // cielo en 3 tonos
    ctx.fillStyle = vgrad(ctx, y0, HY, [[0, C.top], [.55, C.mid], [1, C.hor]]); ctx.fillRect(x0, y0, x1 - x0, HY - y0 + 1);
    const night = clamp((.6 - C.L) / .32, 0, 1);
    if (night > 0) { for (let i = 0; i < 90; i++) { const sx = (i * 97.3) % 420 - 30, sy = v.y0 + ((i * 53.7) % (HY - 50 - v.y0)); const tw = .5 + .5 * Math.sin(s.t * 2 + i * 1.7); ctx.fillStyle = `rgba(255,252,235,${night * (.25 + .55 * tw)})`; const r = i % 9 === 0 ? 1.6 : .9; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); } }
    // sol o luna
    const dayT = (s.tod + .03) / .8; let lx = null, lc = null;
    if (dayT >= 0 && dayT <= 1) { lx = lerp(-20, 380, dayT); const ly = HY - 12 - Math.sin(dayT * Math.PI) * 190, low = 1 - Math.sin(dayT * Math.PI);
      const sg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 110); sg.addColorStop(0, rgba(mixc('#FFF4D6', '#FFB070', low), .7)); sg.addColorStop(.25, rgba('#FFE6B0', .22)); sg.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = sg; ctx.fillRect(lx - 110, ly - 110, 220, 220);
      ctx.fillStyle = mixc('#FFFBEA', '#FFC27A', low); ctx.beginPath(); ctx.arc(lx, ly, 15, 0, 7); ctx.fill(); lc = mixc('#FFF1C9', '#FFB070', low); }
    else { const nt = clamp(((s.tod - .77 + 1) % 1) / .26, 0, 1); lx = lerp(20, 340, nt); const ly = HY - 30 - Math.sin(nt * Math.PI) * 160;
      const mg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 70); mg.addColorStop(0, 'rgba(225,232,255,.4)'); mg.addColorStop(1, 'rgba(225,232,255,0)'); ctx.fillStyle = mg; ctx.fillRect(lx - 70, ly - 70, 140, 140);
      ctx.fillStyle = '#F6F2E2'; ctx.beginPath(); ctx.arc(lx, ly, 11, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(200,196,180,.5)'; ctx.beginPath(); ctx.arc(lx - 3, ly - 2, 2.4, 0, 7); ctx.arc(lx + 3, ly + 3, 1.6, 0, 7); ctx.fill(); lc = '#DCE4FF'; }
    // nubes: siluetas únicas con degradado
    const ct = mixc('#FFFFFF', C.mid, .15), cb = mixc(C.hor, C.top, .35), ca = .55 + .4 * C.L;
    [[40, 80, 120, 26, 3], [210, 120, 90, 20, 7], [300, 60, 70, 16, 11], [120, 168, 150, 22, 5]].forEach(([cx, cy, w, h, sd], i) => { const x = ((cx + s.t * (1.5 + i * .4)) % 520) - 100; skyCloud(ctx, x, cy, w, h, sd, ct, cb, ca * (i === 3 ? .7 : 1)); });
    ctx.strokeStyle = rgba('#2A3350', .55); ctx.lineWidth = 1.3; for (const b of s.birds) { const w = Math.sin(b.ph) * 3; ctx.beginPath(); ctx.moveTo(b.x - 6, b.y - w); ctx.quadraticCurveTo(b.x - 3, b.y - 3, b.x, b.y); ctx.quadraticCurveTo(b.x + 3, b.y - 3, b.x + 6, b.y - w); ctx.stroke(); }
    // tierra lejana + reflejo
    land(ctx, s, C, v, false);
    // agua: degradado lejos → cerca
    const WT = { tropical: ['#5FD6D0', '#138C9A', .55], helado: ['#B9CFE2', '#2E5070', .4], pantano: ['#6F8A5A', '#21361F', .6] }[s.place], wf = WT ? mixc(C.wf, shade(WT[0], C), WT[2]) : C.wf, wn = WT ? mixc(C.wn, shade(WT[1], C), WT[2]) : C.wn;
    ctx.fillStyle = vgrad(ctx, HY, v.y1 + 200, [[0, mixc(wf, C.hor, .35)], [.18, wf], [.6, mixc(wf, wn, .7)], [1, wn]]); ctx.fillRect(x0, HY, x1 - x0, v.y1 + 400 - HY);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, HY, x1 - x0, 400); ctx.clip(); ctx.translate(0, 2 * HY); ctx.scale(1, -1); ctx.globalAlpha = .28; land(ctx, s, C, v, true); ctx.restore(); ctx.globalAlpha = 1;
    ctx.fillStyle = vgrad(ctx, HY - 6, HY + 14, [[0, rgba(C.haze, 0)], [.5, rgba(C.haze, .55)], [1, rgba(C.haze, 0)]]); ctx.fillRect(x0, HY - 6, x1 - x0, 20); // bruma en el horizonte
    // reflejo del sol/luna: columna de destellos que se estrecha con la distancia
    if (lx != null) { for (let i = 0; i < 40; i++) { const Z = 300 / (1 + i * .35), p = proj((lx - CX) * Z / FOC, 0, Z), w = (3 + 26 / (1 + i * .15)) * (.6 + .4 * Math.sin(s.t * 3 + i * 2.1)); ctx.fillStyle = rgba(lc, (.55 - i * .011) * (.6 + .4 * C.L)); ctx.fillRect(lx - w / 2 + Math.sin(s.t * 1.7 + i * 1.3) * (2 + i * .3), p.y, w, Math.max(1, .9 + i * .05)); } }
    // ondas: rayitas que se hacen grandes al acercarse (perspectiva)
    for (let i = 0; i < 46; i++) { const Z = 4 + Math.pow(i / 45, 2.2) * 160, p = proj(0, 0, Z), al = clamp(.08 + (1 - Z / 170) * .22, 0, .32); ctx.strokeStyle = `rgba(255,255,255,${al})`; ctx.lineWidth = Math.max(.6, p.k * .012);
      const step = 260 / (1 + Z * .08) + 20, off = ((s.t * (s.place === 'rio' ? 1.6 : .35) * p.k) + i * 47) % step; ctx.beginPath(); for (let x = x0 - step + off; x < x1; x += step) { const L2 = Math.max(4, p.k * .5); ctx.moveTo(x, p.y); ctx.quadraticCurveTo(x + L2 / 2, p.y - p.k * .02, x + L2, p.y); } ctx.stroke(); }
    places(ctx, s, C, v);
    // sombras de peces bajo la superficie
    for (const sp of s.spots) { const a = clamp(Math.min(sp.t / 3, (sp.life + 3 - sp.t) / 3), 0, 1); if (a <= 0) continue; ctx.globalAlpha = a; for (const m of sp.m) { const X = sp.X + m.dx + Math.sin(m.ph * .3) * .5, Z = sp.Z + m.dz + Math.cos(m.ph * .25) * .4, q = proj(X, -.25, Z); ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, .3); drawFish(ctx, sp.f, 0, 0, Math.max(5, sp.len * q.k), Math.sin(m.ph * .3) > 0 ? 1 : -1, m.ph, 'shadow'); ctx.restore(); } ctx.globalAlpha = 1; }
    for (const j of s.jumpers) { if (j.t > .55) continue; const u = j.t / .55, p = proj(j.X, Math.sin(u * Math.PI) * .45, j.Z), L2 = .35 * p.k; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(lerp(-.9, .9, u)); drawFish(ctx, j.f, 0, 0, L2, 1, 0, 'full'); ctx.restore(); }
    // anillos
    for (const r of s.rings) { const p = proj(r.X, 0, r.Z); ctx.strokeStyle = `rgba(255,255,255,${r.a})`; ctx.lineWidth = Math.max(.7, p.k * .012); ctx.beginPath(); ctx.ellipse(p.x, p.y, r.r * p.k, r.r * p.k * EYE / r.Z * 1.0 + .5, 0, 0, 7); ctx.stroke(); }
    // pez enganchado, corcho, salpicaduras
    if (s.hook && s.hook.f && s.bob && (s.phase === 'wait' || s.phase === 'bite') && s.hook.state !== 'none' && Math.hypot(s.hook.X - s.bob.X, s.hook.Z - s.bob.Z) < 5) { const h = s.hook, p = proj(h.X, -.2, h.Z); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, .3); drawFish(ctx, h.f, 0, 0, Math.max(10, lenM(h.f, h.kg) * p.k), s.bob && h.X < s.bob.X ? 1 : -1, s.t * 5, 'shadow'); ctx.restore(); }
    if (s.phase === 'fight') { const F = s.fight, f = s.hook.f, p = proj(F.X, F.jy, F.Z), L2 = Math.max(10, lenM(f, s.hook.kg) * p.k); if (F.jy > .05) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-.5 + (1.1 - F.jump) * 1.1); drawFish(ctx, f, 0, 0, L2, 1, s.t * 14, 'full'); ctx.restore(); } else { const q = proj(F.X, -.25, F.Z); ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, .32); drawFish(ctx, f, 0, 0, L2, F.side >= 0 ? 1 : -1, s.t * (F.burst ? 14 : 6), 'shadow'); ctx.restore(); } if (F.burst) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x - L2 * .6, p.y + 1); ctx.lineTo(p.x, p.y - 1); ctx.lineTo(p.x + L2 * .6, p.y + 1); ctx.stroke(); } }
    if (s.phase === 'fly') { const c = s.cast, u = c.t / c.dur, Z = lerp(3.2, c.Z, easeOut(u)), Y = 2.4 + Math.sin(u * Math.PI) * (3 + c.p * 7) - u * 2.4, p = proj(c.X * u, Y, Z); s.flyP = p; bobber(ctx, p.x, p.y, p.k, 0); }
    if (s.bob && (s.phase === 'wait' || s.phase === 'bite')) { const b = s.bob, bob = Math.sin(s.t * 2.2) * .015, p = proj(b.X, bob - b.dip * .08, b.Z); bobber(ctx, p.x, p.y, p.k, b.dip); s.bobP = p; }
    ctx.fillStyle = 'rgba(255,255,255,.9)'; for (const q of s.parts) { const p = proj(q.X, q.Y, q.Z); ctx.globalAlpha = 1 - q.t / q.life; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.8, q.r * p.k), 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  }
  function bobber(ctx, x, y, k, dip) {
    const r = Math.max(2.4, .06 * k); ctx.save(); ctx.translate(x, y); if (dip > .9) ctx.globalAlpha = .55;
    ctx.fillStyle = vgrad(ctx, -r, r, [[0, '#FFFFFF'], [1, '#D9DEE6']]); ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.1, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = vgrad(ctx, -r, 0, [[0, '#FF8A63'], [1, '#E8433A']]); ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.2, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-r * .18, -r * 2.4, r * .36, r * 1.3);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-r * .35, -r * .5, r * .25, r * .35, -.4, 0, 7); ctx.fill();
    ctx.restore();
  }
  function hills(ctx, x0, x1, base, amp, f, ph, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, HY + 1); for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, base - amp * (.6 + .4 * Math.sin(x * f + ph)) - amp * .3 * Math.sin(x * f * 2.3 + ph * 2)); ctx.lineTo(x1, HY + 1); ctx.closePath(); ctx.fill(); }
  function pine(ctx, x, y, h, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + h * .26, y - h * .42); ctx.lineTo(x + h * .15, y - h * .44); ctx.lineTo(x + h * .34, y); ctx.lineTo(x - h * .34, y); ctx.lineTo(x - h * .15, y - h * .44); ctx.lineTo(x - h * .26, y - h * .42); ctx.closePath(); ctx.fill(); }
  // ---- paisaje con textura: crestas con ruido, sombra de ladera y nieve; árboles con volumen (lado con luz y lado en sombra)
  function n1(x) { const i = Math.floor(x), f = x - i, h = (k) => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }; const u = f * f * (3 - 2 * f); return h(i) * (1 - u) + h(i + 1) * u; }
  // MONTAÑAS bien hechas: silueta con ruido fractal (más quebrada arriba), luz desde la izquierda según la pendiente de cada columna
  // (la ladera que baja hacia la derecha queda en sombra), barrancos, y NIEVE que sigue la silueta: empieza en la cresta y baja hasta una
  // cota irregular, con lenguas por los barrancos; azulada en la sombra. Se pinta una vez en un lienzo aparte y se reutiliza.
  const RIDGE_CACHE = {};
  function ridge(ctx, x0, x1, base, peaks, rough, top, bot, snow, seed, C) {
    const hmax = Math.max(...peaks.map((q) => q[1])), L = clamp(C.L, 0, 1), key = [x0, x1, base, seed, top, bot, snow, Math.round(L * 20)].join('|');
    let E = RIDGE_CACHE[seed]; if (!E || E.key !== key) {
      const W = Math.ceil(x1 - x0) + 4, Hh = Math.ceil(hmax + rough + 12), cv = root.document.createElement('canvas'); cv.width = W * 2; cv.height = Hh * 2; const g = cv.getContext('2d'); g.scale(2, 2);
      const sm = (a, b, k) => { const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return lerp(a, b, h) + k * h * (1 - h); }; // máximo suave: los picos se funden sin «pinchos»
      const Hf = (x) => { let h = 0; for (const [px, ph, pw] of peaks) { const d = Math.abs(x - px) / pw; h = sm(h, ph * Math.max(0, 1 - d) ** 1.15, 10); }
        const k = h / hmax; return Math.max(0, h + ((n1(x * .045 + seed) - .5) * rough + (n1(x * .13 + seed * 2) - .5) * rough * .45 + (n1(x * .3 + seed * 3) - .5) * rough * .12) * (.35 + .65 * k)); };
      const hs = []; for (let x = 0; x <= W; x++) hs.push(Hf(x0 + x)); const Y = (i) => Hh - 6 - hs[clamp(i, 0, W)];
      // cuerpo con degradado (aire arriba → base)
      g.beginPath(); g.moveTo(0, Hh); for (let i = 0; i <= W; i++) g.lineTo(i, Y(i)); g.lineTo(W, Hh); g.closePath(); const gr = g.createLinearGradient(0, Hh - 6 - hmax, 0, Hh); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fill(); g.save(); g.clip();
      // luz/sombra por pendiente: columnas de 1 px con sombra que se difumina hacia abajo
      for (let i = 0; i < W; i++) { const sl = (hs[Math.min(W, i + 8)] - hs[Math.max(0, i - 8)]) / 16, sh = clamp(-sl * 2.2, 0, 1), li = clamp(sl * 2.2, 0, 1), y = Y(i), hh = hs[i];
        if (sh > .02) { const gg = g.createLinearGradient(0, y, 0, y + hh * .9); gg.addColorStop(0, `rgba(25,35,70,${.26 * sh})`); gg.addColorStop(1, 'rgba(25,35,70,0)'); g.fillStyle = gg; g.fillRect(i, y, 1, hh * .9); }
        if (li > .02) { g.fillStyle = `rgba(255,250,235,${.1 * li * (.4 + .6 * L)})`; g.fillRect(i, y, 1, hh * .5); } }
      // barrancos: vetas finas que bajan desde la cresta
      for (let k = 0; k < Math.round(W / 9); k++) { const i = Math.floor(n1(k * 2.9 + seed * 5) * W), hh = hs[i]; if (hh < hmax * .25) continue; let x = i, y = Y(i) + 2; g.strokeStyle = 'rgba(30,40,75,.13)'; g.lineWidth = .8; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (n1(k * 7 + j) - .5) * 4 + .6; y += hh * .09; g.lineTo(x, y); } g.stroke(); }
      // nieve que sigue la silueta
      if (snow) { const sLit = mixc(mixc('#FFFFFF', C.hor, .12), '#6F7FA8', (1 - L) * .75), sDark = mixc(mixc('#C8D5EC', C.hor, .1), '#56658E', (1 - L) * .75); for (let i = 0; i < W; i++) { const hh = hs[i], tg = n1((x0 + i) * .05 + seed * 6), line = hmax * snow * (1 + (n1((x0 + i) * .025 + seed * 4) - .5) * .28) - clamp((tg - .55) / .4, 0, 1) ** 2 * hmax * .2; if (hh <= line) continue;
          const sl = (hs[Math.min(W, i + 8)] - hs[Math.max(0, i - 8)]) / 16, sh = clamp(-sl * 2.2, 0, 1), y = Y(i);
          g.fillStyle = sh > .25 ? sDark : sLit; g.fillRect(i, y - .5, 1, hh - line + .5);
          if (sh > .25) { g.fillStyle = 'rgba(120,140,190,.12)'; g.fillRect(i, y, 1, (hh - line) * .7); } }
      }
      // bruma al pie
      const hz = g.createLinearGradient(0, Hh - 6 - hmax * .35, 0, Hh); hz.addColorStop(0, rgba(C.hor, 0)); hz.addColorStop(1, rgba(C.hor, .35)); g.fillStyle = hz; g.fillRect(0, 0, W, Hh); g.restore();
      E = RIDGE_CACHE[seed] = { key, cv, W, Hh };
    }
    ctx.drawImage(E.cv, x0, base + 6 - E.Hh, E.W, E.Hh);
  }
  function pineT(ctx, x, y, h, lit, dark, snowK) { // pino con lado de luz y lado de sombra; nieve distinta en cada uno
    const w = h * .34; ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(x, y - h); for (let k = 0; k < 3; k++) { const yy = y - h + h * (k + 1) / 3; ctx.lineTo(x + w * (k + 1) / 3 + 1, yy); ctx.lineTo(x + w * (k + .4) / 3, yy - 1); } ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(x, y - h); for (let k = 0; k < 3; k++) { const yy = y - h + h * (k + 1) / 3; ctx.lineTo(x - w * (k + 1) / 3 - 1, yy); ctx.lineTo(x - w * (k + .4) / 3, yy - 1); } ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    if (snowK) { ctx.fillStyle = 'rgba(255,255,255,.92)'; for (let k = 0; k < 3; k++) { if (n1(x * .9 + k * 7) > snowK) continue; const yy = y - h + h * k / 3, ww = w * (k + 1) / 3; ctx.beginPath(); ctx.moveTo(x, yy + 1); ctx.lineTo(x - ww * .8, yy + h / 3 * .85); ctx.quadraticCurveTo(x, yy + h / 3 * .55, x + ww * .7, yy + h / 3 * .8); ctx.closePath(); ctx.fill(); } }
  }
  function crown(ctx, x, y, rx, ry, lit, dark, seed) { // copa de árbol con bultos (una sola forma) y luz de arriba-izquierda
    ctx.beginPath(); const n = 9; for (let k = 0; k <= n; k++) { const a = Math.PI * 2 * k / n, r = 1 + (n1(k * 2.3 + seed) - .5) * .35, xx = x + Math.cos(a) * rx * r, yy = y + Math.sin(a) * ry * r; if (!k) ctx.moveTo(xx, yy); else { const am = a - Math.PI / n, rm = 1.12 + (n1(k * 3.1 + seed) - .5) * .3; ctx.quadraticCurveTo(x + Math.cos(am) * rx * rm, y + Math.sin(am) * ry * rm, xx, yy); } } ctx.closePath();
    const g = ctx.createRadialGradient(x - rx * .4, y - ry * .5, 1, x, y, Math.max(rx, ry) * 1.2); g.addColorStop(0, lit); g.addColorStop(1, dark); ctx.fillStyle = g; ctx.fill();
  }
  function palmT(ctx, x, y, h, dir, lit, dark, trunk) {
    const tx = x + dir * h * .22, ty = y - h; ctx.strokeStyle = trunk; ctx.lineWidth = Math.max(1.5, h * .06); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + dir * h * .02, y - h * .55, tx, ty); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = .8; for (let k = 1; k < 8; k++) { const u = k / 8, px = lerp(x, tx, u * u * .9 + u * .1), py = lerp(y, ty, u); ctx.beginPath(); ctx.moveTo(px - h * .03, py); ctx.lineTo(px + h * .03, py - 1); ctx.stroke(); }
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .5 + dir * .15, L = h * (.45 + (k % 2) * .12), ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * .55 + L * .35;
      ctx.fillStyle = k % 2 ? dark : lit; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * L * .55, ty + Math.sin(a) * L * .5 - L * .18, ex, ey); ctx.quadraticCurveTo(tx + Math.cos(a) * L * .45, ty + Math.sin(a) * L * .3 + L * .05, tx, ty + 1); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * L * .5, ty + Math.sin(a) * L * .4 - L * .08, ex, ey); ctx.stroke(); }
    ctx.fillStyle = '#6B4A2E'; ctx.beginPath(); ctx.arc(tx - 1.5, ty + 2, h * .03, 0, 7); ctx.arc(tx + 2, ty + 2.5, h * .028, 0, 7); ctx.fill();
  }
  function willow(ctx, x, y, h, lit, dark, t) { // sauce llorón: tronco, copa en cúpula y ramas que cuelgan (se reconoce)
    ctx.strokeStyle = dark; ctx.lineWidth = h * .07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - h * .05, y - h * .4, x + h * .03, y - h * .62); ctx.stroke();
    crown(ctx, x, y - h * .74, h * .3, h * .2, lit, dark, x);
    ctx.lineWidth = Math.max(.8, h * .022); for (let k = -8; k <= 8; k++) { const sx = x + k * h * .045, sy = y - h * .7 + Math.abs(k) * h * .012, ln = h * (.5 + .25 * n1(k * 3 + x)); const g = ctx.createLinearGradient(0, sy, 0, sy + ln); g.addColorStop(0, lit); g.addColorStop(1, rgba(dark, .1)); ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + Math.sin(t * .8 + k) * 2 + k * .6, sy + ln * .5, sx + Math.sin(t * .8 + k + .7) * 3 + k * 1.2, sy + ln); ctx.stroke(); }
  }
  function land(ctx, s, C, v, refl) {
    const x0 = v.x0 - 200, x1 = v.x1 + 200, atm = (c, k) => mixc(shade(c, C, .6), C.hor, k); // perspectiva aérea: lo lejano se funde con el cielo
    if (s.place === 'lago') {
      ridge(ctx, x0, x1, HY - 4, [[60, 118, 150], [190, 82, 120], [300, 132, 140], [420, 90, 120]], 14, atm('#8EA2C8', .38), atm('#A9B8D4', .5), .62, 1, C);
      ridge(ctx, x0, x1, HY - 2, [[-10, 62, 120], [130, 54, 110], [250, 66, 120], [370, 48, 110]], 10, atm('#6F8FA8', .25), atm('#7E9DAE', .32), 0, 4, C);
      ridge(ctx, x0, x1, HY, [[40, 26, 120], [200, 22, 130], [330, 30, 120]], 6, atm('#5E8A6E', .12), atm('#6B9476', .18), 0, 7, C);
      for (let k = -8; k < 52; k++) { const x = k * 8 + n1(k) * 5, h = 10 + n1(k * 2.7) * 9; pineT(ctx, x, HY + 1, h, atm(k % 3 ? '#4F8466' : '#5A8F6E', .12), atm('#2F5A45', .12), 0); }
    } else if (s.place === 'rio') {
      ridge(ctx, x0, x1, HY - 30, [[80, 70, 160], [260, 86, 170], [420, 60, 140]], 10, atm('#9FB3D0', .4), atm('#B3C4DA', .5), 0, 2, C);
      ridge(ctx, x0, x1, HY - 4, [[0, 44, 140], [170, 36, 130], [330, 50, 140]], 8, atm('#7DA670', .2), atm('#8AB27A', .25), 0, 5, C);
      const by = proj(0, 0, 70).y; ctx.fillStyle = vgrad(ctx, HY - 4, by, [[0, atm('#7DA267', .1)], [1, shade('#5E844C', C)]]); ctx.fillRect(x0, HY - 4, x1 - x0, by - HY + 4);
      for (let k = -4; k < 34; k++) { const x = k * 12 + n1(k * 1.9) * 6, h = 20 + n1(k * 2.3) * 12, yb = HY - 1; ctx.strokeStyle = atm('#EFEBE0', .08); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x + 1, yb - h); ctx.stroke(); ctx.strokeStyle = atm('#3A3A38', .1); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, yb - h * .3); ctx.lineTo(x, yb - h * .3 - 1.5); ctx.moveTo(x, yb - h * .55); ctx.lineTo(x, yb - h * .55 - 1.5); ctx.stroke();
        crown(ctx, x, yb - h - 2, 6 + n1(k) * 3, 9 + n1(k * 1.3) * 3, atm(k % 2 ? '#CDE38E' : '#B9D97C', .08), atm('#6F9A4A', .12), k); }
      if (!refl) { for (const [rx, rw] of [[40, 9], [150, 6], [260, 11], [330, 7]]) { ctx.fillStyle = vgrad(ctx, by - 4, by, [[0, shade('#B3B7BC', C)], [1, shade('#7E848B', C)]]); ctx.beginPath(); ctx.ellipse(rx, by, rw, 3.8, 0, Math.PI, 0); ctx.fill(); } }
    } else if (s.place === 'tropical') {
      ridge(ctx, x0, x1, HY - 2, [[260, 44, 110], [340, 30, 70]], 6, atm('#5EA27A', .2), atm('#7BBF8A', .28), 0, 3, C);
      ctx.fillStyle = vgrad(ctx, HY - 5, HY + 1, [[0, atm('#FFF2CF', .1)], [1, atm('#F0DBA8', .15)]]); ctx.beginPath(); ctx.moveTo(130, HY + 1); ctx.quadraticCurveTo(250, HY - 7, 400, HY - 2); ctx.lineTo(400, HY + 1); ctx.fill();
      for (const [px, h, d] of [[176, 30, 1], [204, 42, -1], [232, 36, 1], [270, 48, -1], [300, 38, 1], [336, 32, -1]]) palmT(ctx, px, HY - 1, h, d, atm('#58B060', .15), atm('#2F7A44', .18), atm('#9C7A50', .2));
      if (!refl) { const bx = ((s.t * 2.5) % 520) - 80; ctx.fillStyle = atm('#FFFFFF', .1); ctx.beginPath(); ctx.moveTo(bx, HY - 3); ctx.lineTo(bx, HY - 20); ctx.lineTo(bx + 10, HY - 3); ctx.fill(); }
    } else if (s.place === 'helado') {
      ridge(ctx, x0, x1, HY - 8, [[40, 128, 120], [170, 96, 110], [290, 140, 130], [420, 100, 110]], 16, atm('#8FA4C4', .3), atm('#B4C4DA', .45), .5, 9, C);
      ridge(ctx, x0, x1, HY - 3, [[-20, 70, 110], [110, 60, 100], [230, 76, 110], [360, 64, 110]], 10, atm('#7A93B2', .2), atm('#98AECA', .3), .7, 12, C);
      for (let k = -8; k < 52; k++) { const x = k * 8 + n1(k * 1.7) * 5, h = 11 + n1(k * 2.1) * 10; pineT(ctx, x, HY + 1, h, atm('#4E7468', .15), atm('#2C4A44', .15), .2 + n1(k * 4.2) * .6); }
    } else if (s.place === 'pantano') {
      ctx.fillStyle = vgrad(ctx, HY - 50, HY, [[0, rgba(C.haze, 0)], [1, rgba(C.haze, .5)]]); ctx.fillRect(x0, HY - 50, x1 - x0, 50);
      for (let k = -2; k < 11; k++) { const x = k * 44 + n1(k * 2.2) * 16, h = 54 + n1(k * 1.7) * 34; willow(ctx, x, HY + 1, h, atm(k % 2 ? '#7E9A5E' : '#6E8C52', .25), atm('#2F4426', .25), s.t); }
      for (const [x, h] of [[70, 40], [250, 52]]) { ctx.strokeStyle = atm('#4A3E32', .3); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, HY + 1); ctx.lineTo(x + 2, HY - h); ctx.moveTo(x + 1, HY - h * .6); ctx.lineTo(x + 12, HY - h * .8); ctx.moveTo(x + 2, HY - h * .8); ctx.lineTo(x - 9, HY - h); ctx.stroke(); } // tocones secos
    }
    else {
      ctx.fillStyle = vgrad(ctx, HY - 60, HY, [[0, atm('#B9A985', .3)], [1, atm('#8F9C80', .45)]]); ctx.beginPath(); ctx.moveTo(x0, HY + 1); ctx.lineTo(x0, HY - 40); ctx.quadraticCurveTo(40, HY - 64, 110, HY - 30); ctx.quadraticCurveTo(130, HY - 8, 160, HY + 1); ctx.fill();
      ctx.fillStyle = atm('#F4F1E8', .1); ctx.fillRect(56, HY - 98, 10, 44); ctx.fillStyle = atm('#E2574C', .15); ctx.fillRect(56, HY - 84, 10, 7); ctx.fillRect(56, HY - 70, 10, 7); ctx.fillStyle = atm('#3B4A63', .1); ctx.fillRect(54, HY - 106, 14, 8); ctx.beginPath(); ctx.moveTo(53, HY - 106); ctx.lineTo(61, HY - 112); ctx.lineTo(69, HY - 106); ctx.fill();
      if (!refl && C.L < .7) { const a = (Math.sin(s.t * 1.4) * .5 + .5) * (1 - C.L); const lg = ctx.createRadialGradient(61, HY - 102, 1, 61, HY - 102, 70); lg.addColorStop(0, `rgba(255,236,170,${a})`); lg.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = lg; ctx.fillRect(-10, HY - 172, 140, 140); }
      const bx = ((s.t * 3) % 520) - 80; ctx.fillStyle = atm('#FFFFFF', .15); ctx.beginPath(); ctx.moveTo(bx, HY - 3); ctx.lineTo(bx, HY - 24); ctx.lineTo(bx + 11, HY - 3); ctx.fill(); ctx.fillStyle = atm('#E9A93A', .15); ctx.beginPath(); ctx.moveTo(bx - 1, HY - 3); ctx.lineTo(bx - 1, HY - 18); ctx.lineTo(bx - 8, HY - 3); ctx.fill(); ctx.fillStyle = atm('#7A5634', .2); ctx.fillRect(bx - 9, HY - 3, 22, 3);
    }
  }
  function places(ctx, s, C, v) { // cosas sobre el agua, en perspectiva
    if (s.place === 'helado') { for (const [X, Z, r] of [[-4, 9, .9], [3.5, 12, 1.2], [-8, 20, 1.6], [7, 26, 1.4], [-2, 34, 1.1]]) { const p = proj(X, 0, Z), rx = r * p.k, ry = rx * EYE / Z * 1.1; ctx.fillStyle = vgrad(ctx, p.y - ry * 2, p.y + ry, [[0, shade('#FFFFFF', C, .4)], [1, shade('#C6DAEA', C, .5)]]); ctx.beginPath(); ctx.moveTo(p.x - rx, p.y); ctx.lineTo(p.x - rx * .7, p.y - ry * 1.6); ctx.lineTo(p.x + rx * .4, p.y - ry * 1.9); ctx.lineTo(p.x + rx, p.y - ry * .4); ctx.lineTo(p.x + rx * .8, p.y + ry * .6); ctx.lineTo(p.x - rx * .6, p.y + ry * .7); ctx.closePath(); ctx.fill(); } }
    if (s.place === 'pantano' || s.place === 'tropical') { const pads = s.place === 'pantano' ? [[-3, 8, .5], [-2, 9.5, .4], [3, 10, .55], [-5.5, 14, .6], [5, 7, .45], [1.5, 16, .5], [-1, 12, .35]] : []; for (const [X, Z, r] of pads) { const p = proj(X, 0, Z), rx = r * p.k, ry = rx * EYE / Z * 1.1; ctx.fillStyle = vgrad(ctx, p.y - ry, p.y + ry, [[0, shade('#7FA35A', C)], [1, shade('#4E7238', C)]]); ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, .35, 6.0); ctx.lineTo(p.x, p.y); ctx.closePath(); ctx.fill(); } }
    if (s.place === 'lago') { for (const [X, Z, r] of [[-3.2, 9, .6], [-2.4, 10.5, .45], [3.6, 12, .55], [-6, 18, .7], [5, 7.5, .5], [-4.6, 7, .4]]) { const p = proj(X, 0, Z), rx = r * p.k, ry = rx * EYE / Z * 1.1; ctx.fillStyle = vgrad(ctx, p.y - ry, p.y + ry, [[0, shade('#78B26A', C)], [1, shade('#4E8A48', C)]]); ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, .35, 6.0); ctx.lineTo(p.x, p.y); ctx.closePath(); ctx.fill(); if (r > .5) { ctx.fillStyle = shade('#F9C3D2', C, .5); ctx.beginPath(); ctx.ellipse(p.x - rx * .2, p.y - ry * .8, rx * .28, ry * 1.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = shade('#FFE28A', C, .5); ctx.beginPath(); ctx.arc(p.x - rx * .2, p.y - ry * 1.2, Math.max(1, rx * .08), 0, 7); ctx.fill(); } } }
    if (s.place === 'mar') { for (let i = 0; i < 4; i++) { const p = proj(-30 + i * 22, 0, 120 + i * 30); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x - 10, p.y); ctx.quadraticCurveTo(p.x, p.y - 1.5, p.x + 10, p.y); ctx.stroke(); } }
  }
  // ------------------------------------------------------------------ primer plano (sin zoom): juncos, embarcadero, Tiny, caña, sedal
  function foreground(ctx, s, v, C) {
    if (s.place === 'lago' || s.place === 'rio' || s.place === 'pantano') { // juncos a los lados, muy cerca
      for (const side of [-1, 1]) for (let i = 0; i < 8; i++) { const bx = side < 0 ? v.x0 + 4 + i * 7 : v.x1 - 4 - i * 7, h = 150 + (i * 37 % 60), sway = Math.sin(s.t * .8 + i) * 5;
        ctx.strokeStyle = shade(i % 2 ? '#5F9A52' : '#78B05E', C); ctx.lineWidth = 3 + (i % 3); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, 560); ctx.quadraticCurveTo(bx + sway * .5 + side * -8, 560 - h * .5, bx + sway - side * 14, 560 - h); ctx.stroke();
        if (i % 3 === 0 && s.place === 'lago') { ctx.fillStyle = vgrad(ctx, 560 - h, 560 - h + 26, [[0, shade('#8A5E36', C)], [1, shade('#6A4426', C)]]); ctx.beginPath(); ctx.ellipse(bx + sway - side * 13, 560 - h + 14, 3.6, 12, 0, 0, 7); ctx.fill(); } }
    }
    // embarcadero: tablones que se van al horizonte (en 3D)
    const z0 = .25, z1 = 2.05, X0 = -1.6, X1 = 1.6, pA = proj(X0, DECK, z1), pB = proj(X1, DECK, z1);
    ctx.fillStyle = vgrad(ctx, pA.y, v.y1, [[0, shade('#C6915C', C)], [1, shade('#8E5E36', C)]]); ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); ctx.lineTo(proj(X1, DECK, z0).x, v.y1 + 40); ctx.lineTo(proj(X0, DECK, z0).x, v.y1 + 40); ctx.fill();
    ctx.strokeStyle = shade('#7A4E2C', C); ctx.lineWidth = 1.2; for (let i = -7; i <= 7; i++) { const X = i * .22, a = proj(X, DECK, z1), b = proj(X, DECK, z0); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,230,190,.12)'; ctx.lineWidth = 3; for (let i = -7; i <= 7; i++) { const X = i * .22 + .09, a = proj(X, DECK, z1), b = proj(X, DECK, z0); ctx.beginPath(); ctx.moveTo(a.x, a.y + 2); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.fillStyle = shade('#6E4628', C); ctx.fillRect(v.x0, pA.y - 1, v.x1 - v.x0, 4); // canto del tablón final
    if (s.place === 'helado') { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 60; i++) { const x = (i * 61.7 + s.t * (12 + i % 5 * 3)) % 400 - 20, y = (i * 37.3 + s.t * (30 + (i % 7) * 6)) % 700 - 30; ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * .5, 0, 7); ctx.fill(); } }
    for (const X of [-1.3, 1.3]) { const a = proj(X, DECK + .25, z1 - .05), b = proj(X, -.4, z1 - .05), w = .14 * a.k; ctx.fillStyle = vgrad(ctx, a.y, b.y, [[0, shade('#8A5A34', C)], [1, shade('#4A3020', C)]]); ctx.fillRect(a.x - w / 2, a.y, w, b.y - a.y); }
    tiny(ctx, s, 92, 505, C);
    { const tb = proj(-.02, Math.sin(s.t * 2) * .01, 6.8), tx = 162, ty = 427 + Math.sin(s.t * .9) * 2 - (s.face === 'alert' ? 10 : 0); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - 2, (ty + tb.y) / 2 + 12, tb.x, tb.y - 3); ctx.stroke(); bobber(ctx, tb.x, tb.y, 40, 0); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(tb.x, tb.y + 1, 7 + Math.sin(s.t * 2) * 1.5, 1.6, 0, 0, 7); ctx.stroke(); }
    rodAndLine(ctx, s, C);
  }
  // CAÑA en 3D: base cerca de la cámara (abajo a la derecha); al cargar se va hacia atrás por encima del hombro
  function rodPoints(s) {
    const R = s.rod, B = { X: .34, Y: 1.32, Z: .72 }, L = 2.75, e = R.e, yw = R.yaw, pts = [], side = R.side || 0;
    const D = { X: Math.sin(yw) * Math.cos(e), Y: Math.sin(e), Z: Math.cos(yw) * Math.cos(e) };
    for (let i = -3; i <= 20; i++) { const t = i / 20, bt = Math.max(0, t), b2 = bt * bt * (1.4 - .4 * bt); // la punta se dobla mucho más que la base
      pts.push({ X: B.X + D.X * L * t + R.bend * b2 * .5 * side, Y: B.Y + D.Y * L * t - R.bend * b2 * 1.05, Z: B.Z + D.Z * L * t - R.bend * b2 * .2, t }); }
    return pts;
  }
  function rodAndLine(ctx, s, C) {
    const pts = rodPoints(s), P = pts.filter((q) => q.Z > .12).map((q) => Object.assign(proj(q.X, q.Y, q.Z), { t: q.t }));
    if (P.length < 2) return; const shk = s.shake > 0 ? Math.sin(s.t * 80) * 2 * s.shake : 0, rod = ROD(s);
    for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], th = lerp(.026, .006, clamp(a.t, 0, 1)), w = Math.max(.9, th * a.k);
      ctx.strokeStyle = a.t < 0 ? shade('#C99A62', C, .5) : a.t < .12 ? shade('#2F3A44', C, .5) : shade(i % 2 && rod.id === 'bambu' ? rod.c2 : rod.c, C, .5); ctx.lineWidth = a.t < 0 ? w * 1.5 : w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x + shk, a.y); ctx.lineTo(b.x + shk, b.y); ctx.stroke();
      if (a.t >= 0) { ctx.strokeStyle = 'rgba(255,245,220,.38)'; ctx.lineWidth = Math.max(.5, w * .28); ctx.beginPath(); ctx.moveTo(a.x + shk - w * .25, a.y - w * .2); ctx.lineTo(b.x + shk - w * .25, b.y - w * .2); ctx.stroke(); }
      if (rod.id === 'maestra' && a.t > .1 && i % 3 === 0) { ctx.strokeStyle = '#E9C25A'; ctx.lineWidth = Math.max(.6, w * 1.15); ctx.beginPath(); ctx.moveTo(a.x + shk, a.y); ctx.lineTo(a.x + shk + (b.x - a.x) * .15, a.y + (b.y - a.y) * .15); ctx.stroke(); } }
    for (const t of [.3, .5, .68, .84]) { const q = P.find((p) => Math.abs(p.t - t) < .026); if (q) { ctx.strokeStyle = '#C9CED6'; ctx.lineWidth = Math.max(.6, q.k * .004); ctx.beginPath(); ctx.ellipse(q.x + shk, q.y + q.k * .012, Math.max(1, q.k * .01), Math.max(1, q.k * .012), 0, 0, 7); ctx.stroke(); } }
    // carrete: la manivela gira cuando recoges
    const r0 = P.find((p) => Math.abs(p.t - .05) < .03); if (r0) { const R = r0.k * .045, spin = s.reelSpin; ctx.save(); ctx.translate(r0.x + shk, r0.y + R * 1.3);
      ctx.fillStyle = vgrad(ctx, -R, R, [[0, '#7D8794'], [1, '#2E3540']]); ctx.beginPath(); ctx.ellipse(0, 0, R * .55, R, 0, 0, 7); ctx.fill(); ctx.fillStyle = vgrad(ctx, -R, R, [[0, '#E9EDF2'], [1, '#9AA4B0']]); ctx.beginPath(); ctx.ellipse(-R * .2, 0, R * .4, R * .8, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = R * .05; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-R * .2, 0, R * .3, R * (.25 + i * .12), 0, -1.2, 1.2); ctx.stroke(); }
      ctx.strokeStyle = '#3A3F4B'; ctx.lineWidth = R * .15; ctx.beginPath(); ctx.moveTo(-R * .2, 0); ctx.lineTo(-R * .2 + Math.cos(spin) * R * .9, Math.sin(spin) * R * .9); ctx.stroke(); ctx.fillStyle = '#F2C14E'; ctx.beginPath(); ctx.arc(-R * .2 + Math.cos(spin) * R * .9, Math.sin(spin) * R * .9, R * .18, 0, 7); ctx.fill(); ctx.restore(); }
    // sedal: punta → donde entra en el agua (tenso = recto; flojo = comba) → bajo el agua hasta el pez
    const tip = P[P.length - 1]; let end = null, tens = 0, under = null;
    if (s.phase === 'fly' && s.flyP) end = s.zw(s.flyP);
    else if ((s.phase === 'wait' || s.phase === 'bite') && s.bobP) { end = s.zw(s.bobP); tens = s.phase === 'bite' ? .8 : s.holding ? .5 : 0; }
    else if (s.phase === 'fight') { const F = s.fight; end = s.zw(proj(F.X, F.jy > .05 ? F.jy : 0, F.Z)); tens = F.T; if (F.jy <= .05) under = s.zw(proj(F.X, -F.D, F.Z)); }
    if (end) { const sag = (1 - tens) * 44 + (s.phase === 'fly' ? 0 : 6); ctx.strokeStyle = tens > .82 && s.phase === 'fight' ? 'rgba(255,170,150,.95)' : 'rgba(255,255,255,.82)'; ctx.lineWidth = 1 + tens * .6; ctx.beginPath(); ctx.moveTo(tip.x + shk, tip.y); ctx.quadraticCurveTo(lerp(tip.x, end.x, .55), lerp(tip.y, end.y, .55) + sag, end.x, end.y - 1); ctx.stroke();
      if (under) { ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(end.x, end.y); ctx.lineTo(under.x, under.y); ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${.5 + tens * .4})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(end.x, end.y, 6 + tens * 6, 2 + tens, 0, 0, 7); ctx.stroke(); } }
    else if (s.phase !== 'lifted') { const sw = Math.sin(s.t * 7) * s.baitSwing * 10, bx = tip.x + shk + Math.sin(s.t) * 2; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tip.x + shk, tip.y); ctx.lineTo(bx, tip.y + 34); ctx.lineTo(bx + sw, tip.y + 62); ctx.stroke(); bobber(ctx, bx, tip.y + 40, 50, 0);
      ctx.fillStyle = '#4A505A'; ctx.beginPath(); ctx.ellipse(bx + sw * .55, tip.y + 52, 2, 3, 0, 0, 7); ctx.fill(); // plomo
      ctx.strokeStyle = '#B9C1CC'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(bx + sw - 2.5, tip.y + 64, 3, 0, Math.PI); ctx.stroke(); baitIcon(ctx, s.bait, bx + sw, tip.y + 68, .62 + s.baitSwing * .5, false); }
  }
  // ------------------------------------------------------------------ interfaz
  // ------------------------------------------------------------------ interfaz: arriba TODOS los botones (lugar, hora, libro, sonido) con el mismo estilo; abajo solo caña + cebos
  const UI = { top: [], baits: [], rodB: null, card: { x: 70, y: 0, w: 220, h: 50 } };
  function pill(ctx, b, on) { rr(ctx, b.x, b.y + 2, b.w, b.h, b.h / 2); ctx.fillStyle = 'rgba(20,40,70,.12)'; ctx.fill(); rr(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = on ? vgrad(ctx, b.y, b.y + b.h, [[0, '#FFFFFF'], [1, '#F1F5F9']]) : 'rgba(255,255,255,.88)'; ctx.fill(); }
  function todIcon(ctx, x, y, tod) { // iconos de verdad: amanecer, sol, atardecer y luna
    const k = tod >= .97 || tod < .08 ? 'dawn' : tod < .66 ? 'sun' : tod < .8 ? 'dusk' : 'moon';
    ctx.save(); ctx.translate(x, y);
    if (k === 'moon') { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.clip(); ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.arc(4.5, -3.5, 7, 0, 7, true); ctx.fillStyle = vgrad(ctx, -8, 8, [[0, '#FFF3C4'], [1, '#E9CF7A']]); ctx.fill('evenodd'); ctx.restore(); ctx.fillStyle = '#F2C14E'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 1.3 : 3.2; ctx.lineTo(8 + Math.cos(a) * r, -7 + Math.sin(a) * r); } ctx.fill(); }
    else { const half = k !== 'sun', col = k === 'sun' ? ['#FFE07A', '#F5A623'] : k === 'dawn' ? ['#FFD3A0', '#F39A6A'] : ['#FFB37A', '#E86A4A'];
      if (half) { ctx.beginPath(); ctx.rect(-12, -12, 24, 14); ctx.clip(); }
      ctx.fillStyle = vgrad(ctx, -7, 7, [[0, col[0]], [1, col[1]]]); ctx.beginPath(); ctx.arc(0, half ? 2 : 0, 6.5, 0, 7); ctx.fill();
      ctx.strokeStyle = col[1]; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 9, (half ? 2 : 0) + Math.sin(a) * 9); ctx.lineTo(Math.cos(a) * 11.5, (half ? 2 : 0) + Math.sin(a) * 11.5); ctx.stroke(); }
      if (half) { ctx.restore(); ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#5B8FC0'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-11, 3); ctx.lineTo(11, 3); ctx.moveTo(-7, 6.5); ctx.lineTo(7, 6.5); ctx.stroke(); } }
    ctx.restore();
  }
  function bookIcon(ctx, x, y) { ctx.save(); ctx.translate(x, y); rr(ctx, -11, -9, 22, 18, 3); ctx.fillStyle = vgrad(ctx, -9, 9, [[0, '#F6A25A'], [1, '#D9702C']]); ctx.fill(); ctx.fillStyle = '#FFF4E4'; ctx.fillRect(-9, -7, 8, 14); ctx.fillRect(1, -7, 8, 14); ctx.fillStyle = '#E8A770'; for (let i = 0; i < 3; i++) { ctx.fillRect(-7.5, -4 + i * 4, 5, 1); ctx.fillRect(2.5, -4 + i * 4, 5, 1); } ctx.restore(); }
  function speaker(ctx, x, y, on) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-4, -3); ctx.lineTo(1, -7.5); ctx.lineTo(1, 7.5); ctx.lineTo(-4, 3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); if (on) { ctx.arc(2, 0, 5, -.8, .8); ctx.moveTo(2 + Math.cos(-.85) * 8.5, Math.sin(-.85) * 8.5); ctx.arc(2, 0, 8.5, -.85, .85); } else { ctx.moveTo(4, -4); ctx.lineTo(10, 4); ctx.moveTo(10, -4); ctx.lineTo(4, 4); } ctx.stroke(); ctx.restore(); }
  function rodIcon(ctx, rod, x, y, locked) { ctx.save(); ctx.translate(x, y); if (locked) ctx.globalAlpha = .32; ctx.strokeStyle = rod.c; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-12, 10); ctx.quadraticCurveTo(0, -4, 13, -11); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(13, -11); ctx.lineTo(14, 2); ctx.stroke(); ctx.fillStyle = '#5E6874'; ctx.beginPath(); ctx.arc(-6, 8, 3.4, 0, 7); ctx.fill(); if (rod.id === 'maestra') { ctx.strokeStyle = '#E9C25A'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(-1, 2); ctx.lineTo(1, 1); ctx.moveTo(6, -4); ctx.lineTo(8, -5); ctx.stroke(); } ctx.restore(); }
  function music(s, on) { s.mus = on; s.playing = on; save(s); try { if (root.TQ_MUSIC) root.TQ_MUSIC(on); } catch (e) { /* nada */ } tqSend({ ev: 'music', on }); }
  function hud(ctx, s, C, v) {
    const ty = v.y0 + 10, h = 36; UI.top = [];
    // 7.3: botón ≡ para volver al menú de la pesca (no a «Tengo ganas»)
    const mB = { x: 10, y: ty, w: 40, h, k: 'menu' }, pB = { x: 56, y: ty, w: 114, h, k: 'place' }, tB = { x: 176, y: ty, w: 90, h, k: 'time' }, bB = { x: 272, y: ty, w: 40, h, k: 'book' }, sB = { x: 318, y: ty, w: 34, h, k: 'sound' }; UI.top.push(mB, pB, tB, bB, sB);
    pill(ctx, mB); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(mB.x + 13, ty + 18 + k * 5.5); ctx.lineTo(mB.x + 27, ty + 18 + k * 5.5); } ctx.stroke();
    pill(ctx, pB, true); ctx.save(); ctx.translate(pB.x + 16, ty + 18); ctx.strokeStyle = '#17A89A'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); for (let k = 0; k < 2; k++) { ctx.moveTo(-7, -3 + k * 6); ctx.quadraticCurveTo(-3.5, -7 + k * 6, 0, -3 + k * 6); ctx.quadraticCurveTo(3.5, 1 + k * 6, 7, -3 + k * 6); } ctx.stroke(); ctx.restore();
    ctx.font = `700 13px ${FD}`; const pn = TQT(PL(s).name); const pn2 = ctx.measureText(pn).width > 64 ? pn.replace(/^(El|La) /, '') : pn; fitTxt(ctx, pn2.charAt(0).toUpperCase() + pn2.slice(1), pB.x + 28, ty + 18.5, 13, 66, INK, 700, 'left');
    ctx.fillStyle = MUTED; ctx.beginPath(); ctx.moveTo(pB.x + pB.w - 15, ty + 15); ctx.lineTo(pB.x + pB.w - 9, ty + 15); ctx.lineTo(pB.x + pB.w - 12, ty + 20); ctx.fill();
    pill(ctx, tB); todIcon(ctx, tB.x + 17, ty + 18, s.tod); fitTxt(ctx, TQT(todName(s.tod)), tB.x + 31, ty + 18.5, 12.5, tB.w - 37, INK, 600, 'left');
    pill(ctx, bB); bookIcon(ctx, bB.x + 20, ty + 18); rr(ctx, bB.x + 22, ty - 5, 24, 16, 8); ctx.fillStyle = '#17A89A'; ctx.fill(); txt(ctx, `${species(s)}`, bB.x + 34, ty + 3.5, 10, '#fff', 700);
    pill(ctx, sB); speaker(ctx, sB.x + 18, ty + 18, !!s.playing);
    // mensajes / pelea
    const my = ty + 64;
    if (s.phase === 'fight') fightBar(ctx, s, my);
    else if (!s.menu) { const m = s.msgT > 0 ? s.msg : s.phase === 'idle' ? 'Mantén pulsado y suelta en el dorado' : s.phase === 'charge' ? (s.tired ? '¡Suelta ya! Se te cansa el brazo' : 'Suelta en la franja dorada') : s.phase === 'wait' && s.idleT > 9 && !s.holding && s.hook && s.hook.state === 'none' ? 'Lanza donde veas peces (mantén para recoger)' : '';
      if (m) { let fs = 14.5; ctx.font = `600 ${fs}px ${FD}`; while (ctx.measureText(TQT(m)).width > 300 && fs > 10.5) { fs -= .5; ctx.font = `600 ${fs}px ${FD}`; } const w = Math.min(336, ctx.measureText(TQT(m)).width + 34); rr(ctx, 180 - w / 2, my - 17, w, 34, 17); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill(); txt(ctx, TQT(m), 180, my + 1, fs, INK, 600); } }
    if (s.phase === 'charge') { const x = 318, y0 = 300, hh = 170; fillRR(ctx, x - 9, y0 - 4, 18, hh + 8, 9, 'rgba(255,255,255,.85)'); ctx.fillStyle = 'rgba(255,212,92,.55)'; ctx.fillRect(x - 7, y0 + hh * (1 - CH.P1), 14, hh * (CH.P1 - CH.P0));
      const pw = clamp(s.pw, 0, 1); rr(ctx, x - 6, y0 + hh * (1 - pw), 12, hh * pw, 6); ctx.fillStyle = vgrad(ctx, y0 + hh, y0, [[0, '#5BC0A8'], [.6, '#9ED9A0'], [.86, '#FFD45C'], [1, '#FF7A59']]); ctx.fill();
      ctx.strokeStyle = '#E3A21A'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 8, y0 + hh * (1 - CH.P1), 16, hh * (CH.P1 - CH.P0)); txt(ctx, Math.round((5 + pw * 43) * ROD(s).dist) + ' m', x, y0 - 16, 12.5, '#fff', 700); }
    if (s.bob && (s.phase === 'wait' || s.phase === 'bite') && (s.idleT < 2.2 || s.holding) && s.bobP) { const p = s.zw(s.bobP); ctx.globalAlpha = s.holding ? 1 : clamp(2.2 - s.idleT, 0, 1); ctx.font = `700 14px ${FD}`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(34,50,79,.7)'; ctx.textAlign = 'center'; ctx.strokeText(Math.round(s.bob.Z) + ' m', p.x, p.y - 22); txt(ctx, Math.round(s.bob.Z) + ' m', p.x, p.y - 22, 14, '#FFFFFF', 700); ctx.globalAlpha = 1; }
    // abajo: caña + cebos, todos del mismo tamaño
    const by = Math.min(v.y1, 700) - 74, bw = 50, gap = 5; let bx = 16; UI.baits = [];
    rr(ctx, 10, by - 5, 340, 60, 22); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill();
    const rod = ROD(s); UI.rodB = { x: bx, y: by, w: 54, h: 50 }; rr(ctx, bx, by, 54, 50, 16); ctx.fillStyle = vgrad(ctx, by, by + 50, [[0, '#FFF6E4'], [1, '#FCE6C0']]); ctx.fill(); rodIcon(ctx, rod, bx + 27, by + 18, false); txt(ctx, TQT(rod.name), bx + 27, by + 40, 10, INK, 700); bx += 54 + gap + 2;
    ctx.fillStyle = 'rgba(34,50,79,.12)'; ctx.fillRect(bx - 4, by + 8, 1.5, 34);
    BAITS.forEach((b) => { const open = baitOpen(s, b), on = b.id === s.bait, r = { x: bx, y: by, w: bw, h: 50, b }; UI.baits.push(r);
      if (on) { rr(ctx, r.x, r.y, r.w, r.h, 16); ctx.fillStyle = vgrad(ctx, r.y, r.y + r.h, [[0, '#E6F8F2'], [1, '#C9EFE2']]); ctx.fill(); }
      baitIcon(ctx, b.id, r.x + bw / 2, r.y + 18, 1, !open); txt(ctx, open ? TQT(b.name) : `${s.n[b.need[0]] || 0}/${b.need[1]}`, r.x + bw / 2, r.y + 40, open ? 10 : 10.5, open ? INK : MUTED, on ? 700 : 600); bx += bw + gap; });
    if (s.flash > 0) { ctx.fillStyle = `rgba(255,230,150,${s.flash * .35})`; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    for (const q of s.pops) { const u = q.t / 1.6, a = Math.min(1, q.t * 6, (1.6 - q.t) * 2), sc = 1 + Math.max(0, .3 - q.t) * 2; ctx.save(); ctx.globalAlpha = a; ctx.translate(q.x, q.y - u * 50); ctx.scale(sc, sc); ctx.font = `700 22px ${FD}`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(34,50,79,.6)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(q.text, 0, 0); ctx.fillStyle = q.col; ctx.fillText(q.text, 0, 0); ctx.restore(); }
    s.toasts.forEach((t, i) => { const a = Math.min(1, t.t * 4, (2.8 - t.t) * 2), y = v.y0 + 150 + i * 44; ctx.globalAlpha = a; ctx.font = `700 15px ${FD}`; const w = ctx.measureText(t.text).width + 40; fillRR(ctx, 180 - w / 2, y, w, 36, 18, t.col); txt(ctx, t.text, 180, y + 18.5, 15, '#fff', 700); ctx.globalAlpha = 1; });
  }
  function fightBar(ctx, s, y) {
    const F = s.fight; rr(ctx, 16, y - 26, 328, 74, 22); ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fill();
    fitTxt(ctx, TQT(s.fight.jump > 0 ? '¡Salta! ¡Suelta!' : s.holding ? 'Recogiendo…' : 'Mantén para recoger'), 120, y - 10, 13, 190, s.fight.jump > 0 ? '#D9542F' : INK, 700);
    for (let i = 0; i < F.maxMiss; i++) { const x0 = 318 - i * 16; ctx.beginPath(); ctx.arc(x0, y - 10, 5.5, 0, 7); ctx.fillStyle = i < F.maxMiss - F.miss ? '#17A89A' : '#E3E7EC'; ctx.fill(); }
    const x = 32, w = 296, by = y + 4; fillRR(ctx, x, by, w, 14, 7, '#E7ECEF');
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#5BC0A8'); g.addColorStop(.6, '#F5C451'); g.addColorStop(.84, '#FF7A59'); g.addColorStop(1, '#E2413A');
    rr(ctx, x, by, Math.max(14, w * clamp(F.T, 0, 1)), 14, 7); ctx.fillStyle = g; ctx.fill();
    if (F.T > .82 && Math.sin(s.t * 30) > 0) { ctx.strokeStyle = '#E2413A'; ctx.lineWidth = 2; rr(ctx, x - 2, by - 2, w + 4, 18, 9); ctx.stroke(); }
    if (F.slack > .7) txt(ctx, TQT('¡Flojo!'), x + 26, by + 7.5, 10, MUTED, 700);
    ctx.fillStyle = 'rgba(34,50,79,.12)'; ctx.fillRect(x, by + 24, w - 40, 4); ctx.fillStyle = '#3B8FD0'; ctx.fillRect(x, by + 24, (w - 40) * F.prog, 4);
    txt(ctx, Math.max(0, Math.round(F.Z - 5)) + ' m', x + w, by + 26, 10.5, MUTED, 700, 'right');
  }
  function stamp(ctx, x, y, text, t, col) { const u = clamp(t / .45, 0, 1), sc = lerp(2.4, 1, easeOut(u)), a = Math.min(1, u * 1.6); ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(-.18); ctx.scale(sc, sc);
    ctx.strokeStyle = col; ctx.lineWidth = 3.4; rr(ctx, -66, -22, 132, 44, 10); ctx.stroke(); ctx.lineWidth = 1.4; rr(ctx, -60, -16, 120, 32, 7); ctx.stroke(); ctx.font = `700 24px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(text, 0, 1.5);
    ctx.fillStyle = 'rgba(255,250,240,.85)'; for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(((i * 53) % 130) - 65, ((i * 37) % 44) - 22, .8 + (i % 3) * .5, 0, 7); ctx.fill(); } ctx.restore(); } // textura de tinta (sin agujerear la tarjeta)
  function cardDraw(ctx, s, v) {
    const c = s.card, f = c.f, a = Math.min(1, c.t * 3), y0 = 110 + (1 - easeOut(a)) * 40;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(12,22,42,.5)'; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const h = 396 + c.unlocks.length * 30; fillRR(ctx, 30, y0 + 6, 300, h, 28, 'rgba(0,0,0,.14)'); rr(ctx, 30, y0, 300, h, 28); ctx.fillStyle = vgrad(ctx, y0, y0 + h, [[0, '#FFFFFF'], [1, '#FFF6E9']]); ctx.fill();
    const R = RAR[f.r]; rr(ctx, 130, y0 + 18, 100, 24, 12); ctx.fillStyle = vgrad(ctx, y0 + 18, y0 + 42, [[0, R.col2], [1, R.col]]); ctx.fill(); txt(ctx, TQT(R.name), 180, y0 + 30.5, 12.5, '#fff', 700);
    if (c.rec) { const u = clamp(c.t / .5, 0, 1); ctx.save(); ctx.translate(290, y0 + 30); ctx.rotate(.22 - (1 - u) * .8); ctx.scale(easeOut(u), easeOut(u)); rr(ctx, -40, -14, 80, 28, 14); ctx.fillStyle = vgrad(ctx, -14, 14, [[0, '#FF9A72'], [1, '#F2643F']]); ctx.fill(); txt(ctx, TQT('¡Récord!'), 0, 1, 13.5, '#fff', 700); ctx.restore(); }
    const gx = ctx.createRadialGradient(180, y0 + 118, 10, 180, y0 + 118, 130); gx.addColorStop(0, c.isNew ? 'rgba(255,200,90,.65)' : 'rgba(255,214,130,.5)'); gx.addColorStop(1, 'rgba(255,214,130,0)'); ctx.fillStyle = gx; ctx.fillRect(50, y0 + 46, 260, 150);
    for (let i = 0; i < (c.isNew ? 18 : 10); i++) { const an = i / (c.isNew ? 18 : 10) * 6.28 + c.t * .8, rr2 = 95 + Math.sin(c.t * 3 + i) * 8; ctx.fillStyle = `rgba(255,220,130,${.5 + .4 * Math.sin(c.t * 5 + i)})`; ctx.beginPath(); ctx.arc(180 + Math.cos(an) * rr2, y0 + 118 + Math.sin(an) * rr2 * .45, c.isNew ? 2.4 : 1.8, 0, 7); ctx.fill(); }
    drawFish(ctx, f, 180 + (f.sh === 'eel' ? 0 : 12), y0 + 120 + Math.sin(s.t * 2) * 3, fitLen(f, 230, 120) * (c.isNew ? 1 + .04 * Math.sin(c.t * 3) : 1), 1, s.t * 2, 'full');
    
    if (c.isNew && c.t > .35) stamp(ctx, 245, y0 + 158, TQT('¡NUEVO!'), c.t - .35, '#E8433A');
    txt(ctx, TQT(f.name), 180, y0 + 204, 26, INK, 700);
    txt(ctx, fmtKg(c.kg) + ' · ' + Math.round(lenM(f, c.kg) * 100) + ' cm' + (c.rec ? '  ·  ' + TQT('¡tu mejor pieza!') : ''), 180, y0 + 234, 16, '#E8833A', 700);
    para(ctx, TQT(f.cur), 180, y0 + 268, 252, 15, '#4A5068', 500, 1.35);
    let uy = y0 + 322; c.unlocks.forEach((u) => { rr(ctx, 50, uy - 13, 260, 26, 13); ctx.fillStyle = '#DDF3EC'; ctx.fill(); txt(ctx, u.k === 'bait' ? tf('¡Nuevo cebo: {a}!', TQT(u.b.name)) : u.k === 'place' ? tf('¡Nuevo lugar: {a}!', TQT(u.p.name)) : u.k === 'rod' ? tf('¡Nueva caña: {a}!', TQT(u.r.name)) : TQT('¡Libro completo! Eres maestro pescador'), 180, uy + 1, 13.5, '#1F7A5E', 700); uy += 30; });
    const B = UI.card; B.y = y0 + h - 68; gbutton(ctx, B.x, B.y, B.w, B.h, '#4FD1C1', '#17A89A', '#0F7F74', TQT(c.isNew ? 'Al libro de peces' : 'Seguir pescando'), 18);
    ctx.globalAlpha = 1;
  }
  function bookDraw(ctx, s, v) {
    const bk = s.book; bk.t = (bk.t || 0) + 1 / 60; const op = easeOut(clamp(bk.t / .35, 0, 1));
    ctx.fillStyle = `rgba(12,22,42,${.55 * op})`; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    ctx.save(); ctx.translate(180, 330); ctx.scale(lerp(.6, 1, op), lerp(.6, 1, op)); ctx.rotate((1 - op) * -.08); ctx.translate(-180, -330); ctx.globalAlpha = op;
    const top = Math.max(v.y0 + 12, 10), bot = Math.min(v.y1 - 12, 640); rr(ctx, 10, top, 340, bot - top, 26); ctx.fillStyle = vgrad(ctx, top, bot, [[0, '#FFFBF3'], [1, '#FFF1DD']]); ctx.fill();
    txt(ctx, TQT('Libro de peces'), 180, top + 26, 21, INK, 700); txt(ctx, tf('{a} especies', `${species(s)}/${FISH.length}`), 180, top + 48, 12.5, MUTED, 600);
    bk.close = { x: 304, y: top + 9, w: 36, h: 36 }; fillRR(ctx, 304, top + 9, 36, 36, 18, '#F0E6D4'); txt(ctx, '✕', 322, top + 28, 17, INK, 700);
    bk.tabs = []; [{ id: 'equipo', name: 'Equipo' }].concat(PLACES).forEach((p, i) => { const on = bk.place === p.id, w = 75, tx = 21 + (i % 4) * (w + 4), ty = top + 60 + Math.floor(i / 4) * 32; bk.tabs.push({ x: tx, y: ty, w, h: 28, p }); rr(ctx, tx, ty, w, 28, 14); ctx.fillStyle = on ? vgrad(ctx, ty, ty + 28, [[0, '#4FD1C1'], [1, '#17A89A']]) : '#F0E6D4'; ctx.fill(); ctx.font = `700 12px ${FD}`; const nm = TQT(p.name); const nm2 = ctx.measureText(nm).width > w - 10 ? nm.replace(/^(El|La) /, '') : nm; const lk = p.need && !placeOpen(s, p); if (lk) padlock(ctx, tx + 12, ty + 14, .72, on ? '#fff' : MUTED); fitTxt(ctx, nm2.charAt(0).toUpperCase() + nm2.slice(1), tx + w / 2 + (lk ? 7 : 0), ty + 14.5, 12, w - (lk ? 26 : 10), on ? '#fff' : lk ? MUTED : INK, 700); });
    if (bk.place === 'equipo') { bk.cells = []; let y = top + 134; txt(ctx, TQT('Cañas'), 30, y, 14, INK, 700, 'left'); y += 14;
      RODS.forEach((r) => { const open = rodOpen(s, r); rr(ctx, 22, y, 316, 50, 14); ctx.fillStyle = '#FFFFFF'; ctx.fill(); rodIcon(ctx, r, 48, y + 25, !open); txt(ctx, TQT(r.name), 76, y + 17, 14, open ? INK : MUTED, 700, 'left'); fitTxt(ctx, open ? `${TQT('Hasta')} ${Math.round(48 * r.dist)} m · ${TQT('aguanta')} ${r.kg} kg` : rodNeed(r), 76, y + 35, 11.5, open ? 250 : 222, open ? '#17A89A' : '#E8833A', open ? 600 : 700, 'left'); if (!open) padlock(ctx, 316, y + 25, 1, MUTED); y += 56; });
      y += 8; txt(ctx, TQT('Cebos'), 30, y, 14, INK, 700, 'left'); y += 14;
      const BD = { lombriz: 'Gusta a casi todos los peces de agua dulce.', maiz: 'Dulce y vistoso: carpas, bogas y koi.', grillo: 'Salta en la superficie: percas y black bass.', gamba: 'El cebo del mar y de los peces grandes.', cuchara: 'Brilla al recogerla: para los cazadores.' };
      BAITS.forEach((b) => { const open = baitOpen(s, b); rr(ctx, 22, y, 316, 44, 14); ctx.fillStyle = '#FFFFFF'; ctx.fill(); baitIcon(ctx, b.id, 48, y + 22, 1, !open); txt(ctx, TQT(b.name), 76, y + 15, 13.5, open ? INK : MUTED, 700, 'left'); fitTxt(ctx, open ? TQT(BD[b.id]) : baitNeed(s, b), 76, y + 31, 11, open ? 252 : 222, open ? '#4A5068' : '#E8833A', open ? 500 : 700, 'left'); if (!open) padlock(ctx, 316, y + 22, 1, MUTED); y += 48; });
      ctx.restore(); ctx.globalAlpha = 1; return; }
    const list = FISH.filter((f) => f.p === bk.place), ch = chances(s, bk.place); bk.cells = [];
    const cw = 101, chh = 80, gx = 23, gy = top + 130;
    list.forEach((f, i) => { const x = gx + (i % 3) * (cw + 6), y = gy + Math.floor(i / 3) * (chh + 5), got = s.n[f.id] > 0, sel = bk.sel === f.id, an = bk.anim && bk.anim.id === f.id ? clamp((bk.t - .5) / .9, 0, 1) : 1; bk.cells.push({ x, y, w: cw, h: chh, f });
      rr(ctx, x, y, cw, chh, 15); ctx.fillStyle = sel ? '#DDF3EC' : '#FFFFFF'; ctx.fill(); if (got) fillRR(ctx, x + 8, y + 8, 8, 8, 4, RAR[f.r].col);
      ctx.save(); rr(ctx, x + 2, y + 2, cw - 4, 50, 13); ctx.clip(); const L = fitLen(f, cw - 22, 40);
      if (got && an < 1) { drawFish(ctx, f, x + cw / 2 + 5, y + 29, L, 1, 0, 'unknown'); ctx.globalAlpha = op * an; ctx.save(); ctx.translate(x + cw / 2 + 5, y + 29); ctx.scale(1 + (1 - an) * .6, 1 + (1 - an) * .6); drawFish(ctx, f, 0, 0, L, 1, 0, 'full'); ctx.restore(); ctx.globalAlpha = op; }
      else drawFish(ctx, f, x + cw / 2 + (f.sh === 'eel' ? 0 : 5), y + 29, L, 1, 0, got ? 'full' : 'unknown'); ctx.restore();
      if (bk.anim && bk.anim.id === f.id && bk.t > .5 && bk.t < 2.2) { const u = (bk.t - .5) / 1.7; for (let k = 0; k < 10; k++) { const a2 = k / 10 * 6.28 + u * 3; ctx.fillStyle = `rgba(255,200,80,${1 - u})`; ctx.beginPath(); ctx.arc(x + cw / 2 + Math.cos(a2) * (20 + u * 40), y + 29 + Math.sin(a2) * (12 + u * 24), 2.4, 0, 7); ctx.fill(); } ctx.strokeStyle = `rgba(255,190,60,${1 - u})`; ctx.lineWidth = 3; rr(ctx, x - 2, y - 2, cw + 4, chh + 4, 17); ctx.stroke(); }
      ctx.font = `700 12px ${FD}`; const nm = got ? TQT(f.name) : '???', fs = ctx.measureText(nm).width > cw - 10 ? 10 : 12; txt(ctx, nm, x + cw / 2, y + 58, fs, got ? INK : MUTED, 700);
      const pc = ch[f.id] > 0 ? Math.max(1, Math.round(ch[f.id] * 100)) + ' %' : '—'; txt(ctx, (got ? `×${s.n[f.id]} · ` : '') + pc, x + cw / 2, y + 71, 10.5, ch[f.id] > 0 ? '#17A89A' : MUTED, 700); });
    // ficha grande: dibujo del pez, curiosidad, récord, tamaño máximo
    const f = FBY[bk.sel] || list[0], dy = gy + Math.ceil(list.length / 3) * (chh + 5) + 2, got = s.n[f.id] > 0, dh = bot - dy - 30;
    if (dh > 90) { rr(ctx, 20, dy, 320, dh, 18); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      // 7.3: el texto nunca se sale de la ficha: se mide primero y el dibujo del pez se queda con lo que sobra
      const maxCm = Math.round(lenM(f, f.kg[1]) * 100), info = got ? `${TQT('Récord')}: ${fmtKg(s.best[f.id])} · ${TQT('Hasta')} ${maxCm} cm ${TQT('y')} ${fmtKg(f.kg[1])}` : `${TQT('Rareza')}: ${TQT(RAR[f.r].name)} · ${TQT('Hasta')} ${maxCm} cm`;
      const curT = got ? TQT(f.cur) : TQT('Aún no lo has pescado.'), tipT = `${TQT(TIMEN[f.t])} · ${TQT(tec(f) === 'recogida' ? 'Pica mientras recoges' : 'Pica con el cebo quieto')} · ${tf('Cebos: {a}', BAITS.filter((b) => f.b[b.id]).map((b) => TQT(b.name)).join(', '))}`;
      ctx.font = `500 12.5px ${FD}`; const curL = wrap(ctx, curT, 296).length; ctx.font = `600 11.5px ${FD}`; const tipL = wrap(ctx, tipT, 296).length;
      const need = (c1, t1) => 70 + (c1 ? curL * 16.25 + 4 : 0) + (t1 ? tipL * 14.95 + 2 : 0); let sc = true, stp = true;
      if (dh - need(1, 1) < 58) sc = false; if (!sc && dh - need(0, 1) < 46) stp = false;
      const big = Math.max(34, Math.min(120, dh - need(sc, stp)));
      ctx.save(); rr(ctx, 20, dy, 320, dh, 18); ctx.clip();
      ctx.save(); rr(ctx, 26, dy + 6, 308, big, 14); ctx.clip(); ctx.fillStyle = vgrad(ctx, dy, dy + big, [[0, '#EAF6FB'], [1, '#D3ECF5']]); ctx.fillRect(26, dy + 6, 308, big); drawFish(ctx, f, 180, dy + 6 + big / 2, fitLen(f, 250, big - 18), 1, s.t * 1.5, got ? 'full' : 'unknown'); ctx.restore();
      let ly = dy + big + 22; fitTxt(ctx, got ? TQT(f.name) : '???', 180, ly, 16, 296, INK, 700); ly += 20;
      fitTxt(ctx, info, 180, ly, 12, 300, '#E8833A', 700); ly += 18;
      if (sc) ly += para(ctx, curT, 180, ly, 296, 12.5, '#4A5068', 500, 1.3) + 4;
      if (stp) para(ctx, tipT, 180, ly + 2, 296, 11.5, '#17A89A', 600, 1.3);
      ctx.restore(); }
    const lockP = PLACES.find((q) => q.id === bk.place);
    if (lockP && lockP.need && !placeOpen(s, lockP)) { ctx.font = `700 11px ${FD}`; const lt = placeNeed(lockP), lw = Math.min(280, ctx.measureText(lt).width); padlock(ctx, 180 - lw / 2 - 9, bot - 14, .72, '#E8833A'); fitTxt(ctx, lt, 186, bot - 13, 11, 280, '#E8833A', 700); }
    else txt(ctx, tf('% con {a} a esta hora', TQT((BAITS.find((b) => b.id === s.bait) || BAITS[0]).name)), 180, bot - 13, 10.5, MUTED, 600);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function pickerDraw(ctx, s, v) { // elegir lugar
    ctx.fillStyle = 'rgba(12,22,42,.5)'; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); const y0 = 120; rr(ctx, 20, y0, 320, 330, 26); ctx.fillStyle = vgrad(ctx, y0, y0 + 330, [[0, '#FFFFFF'], [1, '#FFF4E4']]); ctx.fill();
    txt(ctx, TQT('¿Dónde pescamos?'), 180, y0 + 30, 19, INK, 700); s.pickHits = [];
    PLACES.forEach((p, i) => { const x = 34 + (i % 2) * 150, y = y0 + 56 + Math.floor(i / 2) * 86, open = placeOpen(s, p), on = p.id === s.place, b = { x, y, w: 142, h: 78, p }; s.pickHits.push(b);
      rr(ctx, x, y, 142, 78, 18); ctx.fillStyle = on ? vgrad(ctx, y, y + 78, [[0, '#4FD1C1'], [1, '#17A89A']]) : open ? '#FFFFFF' : '#F1ECE3'; ctx.fill();
      const n = species(s, p.id), tot = FISH.filter((f) => f.p === p.id).length; txt(ctx, TQT(p.name), x + 71, y + 30, 14.5, on ? '#fff' : open ? INK : MUTED, 700);
      if (!open) { padlock(ctx, x + 71, y + 13, .72, MUTED); fitTxt(ctx, placeNeedS(p), x + 71, y + 54, 11.5, 128, '#E8833A', 700); } else txt(ctx, `${n}/${tot} ${TQT('especies')}`, x + 71, y + 54, 11.5, on ? '#E8FFFA' : '#17A89A', 600); });
  }
  function placeThumb(ctx, id, x, y, w, h, night) {
    ctx.save(); rr(ctx, x, y, w, h, 16); ctx.clip(); const hy = y + h * .55, g = (y0, y1, st) => vgrad(ctx, y0, y1, st);
    const pal = { lago: ['#6FB6EE', '#E8F6FF', '#4FA7C7', '#1E5A7E'], rio: ['#7DB7E8', '#E6F4FF', '#5FA9C4', '#2A6A6E'], mar: ['#4E78B0', '#FFB98A', '#5C8CB8', '#1E3A5E'], tropical: ['#58B4F0', '#E2F6FF', '#5FD6D0', '#138C9A'], helado: ['#8FB8E6', '#F2F8FF', '#B9CFE2', '#3E6080'], pantano: ['#9DB6A0', '#F3E2C2', '#6F8A5A', '#2C4426'] }[id] || ['#6FB6EE', '#E8F6FF', '#4FA7C7', '#1E5A7E'];
    ctx.fillStyle = g(y, hy, [[0, pal[0]], [1, pal[1]]]); ctx.fillRect(x, y, w, h); ctx.fillStyle = g(hy, y + h, [[0, pal[2]], [1, pal[3]]]); ctx.fillRect(x, hy, w, h);
    const mt = (cx, mh, mw, c, snow) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx - mw, hy); ctx.lineTo(cx, hy - mh); ctx.lineTo(cx + mw, hy); ctx.fill(); if (snow) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(cx - mw * .28, hy - mh * .72); ctx.lineTo(cx, hy - mh); ctx.lineTo(cx + mw * .28, hy - mh * .72); ctx.lineTo(cx + mw * .1, hy - mh * .78); ctx.lineTo(cx - mw * .1, hy - mh * .74); ctx.fill(); } };
    if (id === 'lago' || id === 'helado') { mt(x + w * .3, h * .38, w * .3, id === 'helado' ? '#9FB4D2' : '#8EA2C8', true); mt(x + w * .7, h * .3, w * .28, id === 'helado' ? '#B4C6DE' : '#9AAED0', true); for (let k = 0; k < 14; k++) { const tx = x + k * w / 13, th = 6 + (k % 3) * 2; ctx.fillStyle = id === 'helado' ? '#3E5E5E' : '#3F6E55'; ctx.beginPath(); ctx.moveTo(tx, hy - th); ctx.lineTo(tx + 3, hy); ctx.lineTo(tx - 3, hy); ctx.fill(); if (id === 'helado') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(tx, hy - th); ctx.lineTo(tx + 1.4, hy - th * .55); ctx.lineTo(tx - 1.4, hy - th * .55); ctx.fill(); } } }
    else if (id === 'rio') { ctx.fillStyle = '#86AE78'; ctx.fillRect(x, hy - 10, w, 10); for (let k = 0; k < 9; k++) { const tx = x + 6 + k * w / 9; ctx.fillStyle = '#EDEAE0'; ctx.fillRect(tx, hy - 22, 1.5, 14); ell(ctx, tx, hy - 24, 5, 7, k % 2 ? '#B9D97C' : '#9CC46A'); } }
    else if (id === 'mar') { ctx.fillStyle = '#C8B48C'; ctx.beginPath(); ctx.moveTo(x, hy); ctx.quadraticCurveTo(x + w * .2, hy - h * .2, x + w * .45, hy); ctx.fill(); ctx.fillStyle = '#F4F1E8'; ctx.fillRect(x + w * .18, hy - h * .4, 6, h * .22); ctx.fillStyle = '#E2574C'; ctx.fillRect(x + w * .18, hy - h * .33, 6, 4); ell(ctx, x + w * .75, hy - h * .3, 9, 9, '#FFC27A'); }
    else if (id === 'tropical') { ctx.fillStyle = '#7BBF8A'; ctx.beginPath(); ctx.moveTo(x + w * .3, hy); ctx.quadraticCurveTo(x + w * .65, hy - h * .25, x + w, hy - h * .05); ctx.lineTo(x + w, hy); ctx.fill(); for (const tx of [.5, .62, .78]) { ctx.strokeStyle = '#8A6A44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * tx, hy); ctx.quadraticCurveTo(x + w * tx + 3, hy - 14, x + w * tx + 2, hy - 22); ctx.stroke(); ctx.fillStyle = '#3F8A52'; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .65; ctx.beginPath(); ctx.moveTo(x + w * tx + 2, hy - 22); ctx.lineTo(x + w * tx + 2 + Math.cos(a) * 11, hy - 22 + Math.sin(a) * 11 + 6); ctx.lineTo(x + w * tx + 2, hy - 20); ctx.fill(); } } }
    else if (id === 'pantano') { for (let k = 0; k < 5; k++) { const tx = x + 10 + k * w / 4.5; ctx.fillStyle = '#3F5A3A'; ctx.fillRect(tx - 1.5, hy - 14, 3, 14); ell(ctx, tx, hy - 20, 13, 8, k % 2 ? '#6E8C52' : '#7E9A5E'); ctx.strokeStyle = 'rgba(110,140,80,.8)'; ctx.lineWidth = 1; for (let q = -3; q <= 3; q++) { ctx.beginPath(); ctx.moveTo(tx + q * 3, hy - 16); ctx.lineTo(tx + q * 3.4, hy - 4); ctx.stroke(); } } }
    if (night) { ctx.fillStyle = 'rgba(10,22,58,.45)'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
  // carrusel: el elegido grande en el centro y los vecinos pequeños a los lados; se cambia deslizando o tocando
  // CARRUSEL tipo portadas (reutilizable en otros juegos): infinito, se arrastra con el dedo y se anima al soltar;
  // el elegido grande en el centro y UN vecino pequeño y más transparente a cada lado; todo recortado dentro de la tarjeta.
  function carousel(ctx, s, key, items, idx, y, h, drawItem) {
    const n = items.length, cx = 180, bw = h * 1.5, gap = bw * .78; s.car = s.car || {}; const C = s.car[key] || (s.car[key] = { pos: idx });
    let d = idx - C.pos; d -= Math.round(d / n) * n; C.pos += d * Math.min(1, 1 / 60 * 10); if (Math.abs(d) < .002) C.pos = idx; // se acerca al objetivo por el camino más corto
    const drag = s.carDown && s.carDown.key === key ? (s.carDown.x - s.carDown.cx) / gap : 0, pos = C.pos + drag;
    s.carRects = s.carRects || {}; s.carRects[key] = { y, h, n };
    ctx.save(); rr(ctx, 18, y - 6, 324, h + 12, 18); ctx.clip();
    const slots = []; for (let k = Math.floor(pos) - 2; k <= Math.floor(pos) + 2; k++) { const u = k - pos; if (Math.abs(u) > 1.7) continue; slots.push([u, ((k % n) + n) % n]); }
    slots.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])); // lo lejano primero, el del centro encima
    for (const [u, i] of slots) { const a = Math.min(1, Math.abs(u)), sc = 1 - .36 * a, w = bw * sc, hh = h * sc, x = cx + u * gap - w / 2;
      ctx.globalAlpha = 1 - .55 * a;
      rr(ctx, x, y + (h - hh) / 2 + 4, w, hh, 16); ctx.fillStyle = `rgba(20,30,50,${.12 * (1 - a)})`; ctx.fill();
      drawItem(ctx, items[i], x, y + (h - hh) / 2, w, hh, a < .5); }
    ctx.restore(); ctx.globalAlpha = 1;
    for (let i = 0; i < n; i++) { ctx.fillStyle = i === idx ? '#17A89A' : 'rgba(34,50,79,.2)'; ctx.beginPath(); ctx.arc(cx + (i - (n - 1) / 2) * 10, y + h + 12, i === idx ? 3.2 : 2.4, 0, 7); ctx.fill(); }
  }
  const TODS = [['Amanecer', .02], ['Día', .3], ['Atardecer', .71], ['Noche', .88]];
  const todIdx = (t) => { const n = todName(t); return n === 'Amanecer' ? 0 : n === 'Atardecer' ? 2 : n === 'Noche' ? 3 : 1; };
  function menuDraw(ctx, s, v) {
    ctx.fillStyle = vgrad(ctx, v.y0, v.y1, [[0, 'rgba(12,22,42,0)'], [1, 'rgba(12,22,42,.35)']]); ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const y = 92, h = 516; rr(ctx, 14, y + 6, 332, h, 28); ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fill(); rr(ctx, 14, y, 332, h, 28); ctx.fillStyle = vgrad(ctx, y, y + h, [[0, '#FFFFFF'], [1, '#FFF4E4']]); ctx.fill();
    txt(ctx, TQT('Pesca con Tiny'), 180, y + 30, 24, INK, 700);
    const tot = Object.values(s.n).reduce((a, b) => a + b, 0); let bestF = null, bk = 0; for (const k in s.best) if (s.best[k] > bk) { bk = s.best[k]; bestF = FBY[k]; }
    fitTxt(ctx, `${species(s)}/${FISH.length} ${TQT('especies')} · ${tot} ${TQT('capturas')}` + (bestF ? ` · ${TQT(bestF.name)} ${fmtKg(bk)}` : ''), 180, y + 56, 12.5, 300, MUTED, 600);
    s.carSel = s.carSel || {}; const pi = s.carSel.place != null ? s.carSel.place : PLACES.findIndex((q) => q.id === s.place), night = todIdx(s.tod) === 3;
    carousel(ctx, s, 'place', PLACES, pi, y + 72, 118, (c, p, x, yy, w, hh, big) => { placeThumb(ctx, p.id, x, yy, w, hh, night); const open = placeOpen(s, p); rr(ctx, x, yy + hh - (big ? 30 : 22), w, big ? 30 : 22, 0); ctx.save(); rr(ctx, x, yy, w, hh, 16); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x, yy + hh - (big ? 30 : 22), w, 30); ctx.restore(); const n = species(s, p.id), tt = FISH.filter((f) => f.p === p.id).length; if (!open) { ctx.save(); rr(ctx, x, yy, w, hh, 16); ctx.clip(); ctx.fillStyle = 'rgba(236,232,224,.5)'; ctx.fillRect(x, yy, w, hh); ctx.restore(); padlock(ctx, x + w / 2, yy + (hh - (big ? 30 : 22)) / 2, big ? 2.1 : 1.4, '#6E7891'); } fitTxt(ctx, TQT(p.name) + (big && open ? `  ·  ${n}/${tt}` : ''), x + w / 2, yy + hh - (big ? 15 : 11), big ? 14 : 10, w - 12, open ? INK : MUTED, 700); if (big) { ctx.strokeStyle = '#17A89A'; ctx.lineWidth = 3; rr(ctx, x, yy, w, hh, 16); ctx.stroke(); } });
    const ti = todIdx(s.tod);
    carousel(ctx, s, 'tod', TODS, ti, y + 216, 82, (c, it, x, yy, w, hh, big) => { rr(ctx, x, yy, w, hh, 16); ctx.fillStyle = big ? vgrad(ctx, yy, yy + hh, [[0, '#4FD1C1'], [1, '#17A89A']]) : '#F2EEE6'; ctx.fill(); ctx.save(); ctx.translate(x + w / 2, yy + hh * .38); ctx.scale(big ? 1.3 : .9, big ? 1.3 : .9); todIcon(ctx, 0, 0, it[1]); ctx.restore(); fitTxt(ctx, TQT(it[0]), x + w / 2, yy + hh * .78, big ? 13 : 10, w - 8, big ? '#fff' : INK, 700); });
    const ri = s.carSel.rod != null ? s.carSel.rod : Math.max(0, RODS.findIndex((r) => r.id === s.rodId));
    carousel(ctx, s, 'rod', RODS, ri, y + 326, 72, (c, r, x, yy, w, hh, big) => { const open = rodOpen(s, r); rr(ctx, x, yy, w, hh, 16); ctx.fillStyle = big ? vgrad(ctx, yy, yy + hh, [[0, '#FFE7B8'], [1, '#FCD58C']]) : '#F2EEE6'; ctx.fill(); if (big) { ctx.save(); ctx.translate(x + w * .2, yy + hh / 2); ctx.scale(1.1, 1.1); rodIcon(ctx, r, 0, 0, !open); ctx.restore(); fitTxt(ctx, TQT(r.name), x + w * .65, yy + hh * .4, 14, w * .44, INK, 700); fitTxt(ctx, `${Math.round(48 * r.dist)} m · ${r.kg} kg`, x + w * .65, yy + hh * .68, 11, w * .44, MUTED, 600); } else { ctx.save(); ctx.translate(x + w / 2, yy + hh * .4); ctx.scale(.8, .8); rodIcon(ctx, r, 0, 0, !open); ctx.restore(); fitTxt(ctx, TQT(r.name), x + w / 2, yy + hh * .8, 9, w - 10, INK, 700); } if (!open) padlock(ctx, x + w - 16, yy + 16, big ? 1.1 : .8, '#6E7891'); });
    // 7.3: se ve todo (lugares y cañas bloqueados con candado) y, si el elegido está cerrado, cómo se abre
    const lp = PLACES[pi], lr = RODS[ri], lkT = !placeOpen(s, lp) ? placeNeed(lp) : !rodOpen(s, lr) ? rodNeed(lr) : ''; s.menuLocked = !!lkT;
    s.hintShake = Math.max(0, (s.hintShake || 0) - 1 / 60); const shx = Math.sin(s.hintShake * 40) * s.hintShake * 14;
    if (lkT) { ctx.font = `700 12px ${FD}`; const lw = Math.min(290, ctx.measureText(lkT).width); padlock(ctx, 180 + shx - lw / 2 - 10, y + 421, .8, '#E8833A'); fitTxt(ctx, lkT, 186 + shx, y + 422, 12, 290, '#E8833A', 700); }
    else txt(ctx, TQT('Desliza para cambiar'), 180, y + 422, 11, MUTED, 600);
    s.goB = { x: 80, y: y + 440, w: 200, h: 52 }; if (lkT) gbutton(ctx, s.goB.x, s.goB.y, s.goB.w, s.goB.h, '#D5DCE5', '#B9C3D0', '#98A3B3', TQT('Bloqueado'), 19); else gbutton(ctx, s.goB.x, s.goB.y, s.goB.w, s.goB.h, '#4FD1C1', '#17A89A', '#0F7F74', TQT('¡A pescar!'), 19);
  }
  const TUT = [['Lanza', 'Mantén pulsado y suelta en la franja dorada. Mueve el dedo a los lados para apuntar (a ojo: ¡cuesta pillarle el truco!).'], ['Busca los peces', 'Lanza cerca de las sombras o saltos. Al recoger, mueve el dedo a los lados para guiar el sedal hacia ellos.'], ['¡A pelear!', 'Cuando vibre fuerte, toca. Mantén para recoger, suelta si la tensión sube y desliza hacia donde marque la flecha.']];
  function tutDraw(ctx, s, v) { const [t, b] = TUT[s.tutStep], y = 200; ctx.fillStyle = 'rgba(12,22,42,.45)'; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); rr(ctx, 40, y + 5, 280, 210, 26); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fill(); rr(ctx, 40, y, 280, 210, 26); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    txt(ctx, `${s.tutStep + 1}/3`, 180, y + 24, 12, MUTED, 700); txt(ctx, TQT(t), 180, y + 50, 20, INK, 700); para(ctx, TQT(b), 180, y + 80, 236, 13, '#4A5068', 500, 1.32);
    s.tutB = { x: 100, y: y + 146, w: 160, h: 44 }; gbutton(ctx, 100, y + 146, 160, 44, '#4FD1C1', '#17A89A', '#0F7F74', TQT(s.tutStep < 2 ? 'Siguiente' : '¡Vamos!'), 16); }
  // ------------------------------------------------------------------ marco
  let H = null;
  function draw(ctx, s) {
    const v = s.view, C = sky(s.tod), cam = s.cam, z = cam.z, ox = lerp(0, CX - cam.fx, (z - 1) / .75 * .7), oy = lerp(0, 330 - cam.fy, (z - 1) / .75 * .5);
    s.zw = (p) => ({ x: (p.x - cam.fx) * z + cam.fx + ox, y: (p.y - cam.fy) * z + cam.fy + oy }); // mundo → pantalla con el zoom
    ctx.save(); ctx.translate(cam.fx + ox, cam.fy + oy); ctx.scale(z, z); ctx.translate(-cam.fx, -cam.fy); world(ctx, s, v, C); ctx.restore();
    foreground(ctx, s, v, C);
    if (s.phase === 'lifted') { const u = clamp(s.lift.t / 1.0, 0, 1), f = s.lift.f, x = lerp(s.zw(proj(s.lift.X, 0, s.lift.Z)).x, 200, easeOut(u)), y = lerp(s.zw(proj(s.lift.X, 0, s.lift.Z)).y, 300, easeOut(u)), L2 = lerp(40, fitLen(f, 220, 130), easeOut(u)); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(s.t * 9) * .15 * (1 - u) - .1); drawFish(ctx, f, 0, 0, L2, 1, s.t * 8, 'full'); ctx.restore(); for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(200,235,255,.8)'; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.1) * L2 * .4, y + L2 * .2 + ((s.t * 120 + i * 30) % 80), 2, 0, 7); ctx.fill(); } }
    const nA = clamp((.85 - C.L) * .42, 0, .3); if (nA > 0) { ctx.fillStyle = `rgba(10,22,58,${nA})`; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    fireflies(ctx, s, C);
    if (s.phase === 'bite') { const k = 1 + Math.sin(s.t * 20) * .08; ctx.save(); ctx.translate(92, 380); ctx.scale(k, k); rr(ctx, -16, -16, 32, 32, 16); ctx.fillStyle = vgrad(ctx, -16, 16, [[0, '#FF9A72'], [1, '#F2643F']]); ctx.fill(); txt(ctx, '!', 0, 1, 24, '#fff', 700); ctx.restore(); }
    hud(ctx, s, C, v);
    if (s.phase === 'fight' && s.fight.qte) { const Q = s.fight.qte, u = Q.t / Q.win, cx = 180, cy = 330, pop2 = 1 + Math.max(0, .12 - Q.t) * 3; ctx.save(); ctx.translate(cx, cy); ctx.scale(pop2, pop2);
      ctx.fillStyle = 'rgba(20,34,60,.28)'; ctx.beginPath(); ctx.arc(0, 0, 54, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 54, 0, 7); ctx.stroke();
      ctx.strokeStyle = u > .7 ? '#FF7A59' : '#FFFFFF'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 54, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - u)); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.62)';
      if (Q.dir === 'TAP') { for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-21 + i * 14, 22, 4.5, 0, 7); ctx.fillStyle = i < Q.taps ? '#FFD45C' : 'rgba(255,255,255,.5)'; ctx.fill(); } ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(0, -6, 16 + Math.sin(s.t * 20) * 2, 0, 7); ctx.fill(); }
      else { const a = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 }[Q.dir], sl = Math.sin(s.t * 9) * 5; ctx.rotate(a); ctx.translate(sl, 0); ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(4, -24); ctx.lineTo(4, -11); ctx.lineTo(-28, -11); ctx.lineTo(-28, 11); ctx.lineTo(4, 11); ctx.lineTo(4, 24); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
    if (s.menu) menuDraw(ctx, s, v);
    if (s.tutStep != null) tutDraw(ctx, s, v);
    if (s.phase === 'card' && s.card) cardDraw(ctx, s, v);
    if (s.pick) pickerDraw(ctx, s, v);
    if (s.book) bookDraw(ctx, s, v);
  }
  function fireflies(ctx, s, C) { const n = clamp((.6 - C.L) / .3, 0, 1); if (n <= 0 || s.place === 'mar') return; for (const f of s.flies) { const x = f.x + Math.sin(s.t * f.sp + f.ph) * 14, y = f.y + Math.cos(s.t * f.sp * 1.3 + f.ph) * 8, a = n * (.5 + .5 * Math.sin(s.t * 3 * f.sp + f.ph)); const g = ctx.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, `rgba(250,255,170,${a})`); g.addColorStop(1, 'rgba(250,255,170,0)'); ctx.fillStyle = g; ctx.fillRect(x - 7, y - 7, 14, 14); } }
  function toL(e) { const r = H.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - H.ox) / H.k, y: (e.clientY - r.top - H.oy) / H.k }; }
  const hit = (b, p, pad) => b && p.x >= b.x - (pad || 4) && p.x <= b.x + b.w + (pad || 4) && p.y >= b.y - (pad || 4) && p.y <= b.y + b.h + (pad || 4);
  function onDown(e) {
    if (!H) return; e.preventDefault(); ac(); const s = H.s, p = toL(e);
    try { H.canvas.setPointerCapture(e.pointerId); } catch (er) { /* nada */ }
    if (s.book) { const bk = s.book; if (hit(bk.close, p, 8)) { s.book = null; return; } for (const t of bk.tabs) if (hit(t, p)) { bk.place = t.p.id; bk.sel = null; bk.anim = null; return; } for (const c of bk.cells) if (hit(c, p, 2)) { bk.sel = c.f.id; return; } return; }
    if (s.pick) { for (const b of s.pickHits || []) if (hit(b, p)) { if (placeOpen(s, b.p)) { if (s.place !== b.p.id) { s.place = b.p.id; initPlace(s); save(s); } s.pick = false; } else { const pf = PLACES.find((q) => q.id === b.p.from); say(s, tf('Se abre con {a}', `${b.p.need} ${TQT('especies de')} ${TQT(pf.name).toLowerCase()}`), 2.4); } return; } s.pick = false; return; }
    if (s.phase === 'card') { if (hit(UI.card, p, 8) && s.card.t > .4) { const c = s.card; s.card = null; s.phase = 'idle'; setFace(s, 'calm'); if (c.isNew) s.book = { place: c.f.p, sel: c.f.id, anim: { id: c.f.id }, t: 0 }; } return; }
    for (const b of UI.top) if (hit(b, p, 2)) { const calm = s.phase === 'idle';
      if (b.k === 'sound') music(s, !s.playing);
      else if (b.k === 'menu') { if (s.menu) return; if (calm) { s.menu = true; s.carSel = {}; s.book = null; s.pick = false; } else say(s, 'Termina de pescar para volver al menú', 1.5); }
      else if (b.k === 'book') { if (calm) s.book = { place: s.place, sel: null, t: 0 }; else say(s, 'Termina de pescar para abrir el libro', 1.5); }
      else if (b.k === 'place') { if (calm) s.pick = true; else say(s, 'Termina de pescar para cambiar de lugar', 1.5); }
      else say(s, 'El día pasa solo: algunos peces solo salen a ciertas horas', 2.2);
      return; }
    if (s.tutStep != null) { if (hit(s.tutB, p, 6)) { s.tutStep++; if (s.tutStep > 2) { s.tutStep = null; s.tut = 1; save(s); } } return; }
    if (s.menu) { for (const key in s.carRects || {}) { const R = s.carRects[key]; if (p.y >= R.y - 6 && p.y <= R.y + R.h + 14) { s.carDown = { key, x: p.x, cx: p.x }; return; } }
      if (hit(s.goB, p, 6)) { if (s.menuLocked) { s.hintShake = .5; vib(25); return; } s.carSel = {}; s.menu = false; if (s.mus) music(s, true); if (!s.tut) s.tutStep = 0; } return; }
    if (s.phase === 'lifted' || s.phase === 'fly') return;
    const calm = s.phase === 'idle';
    if (hit(UI.rodB, p, 2)) { s.baitSwing = .8; if (!calm) { say(s, 'Cambia de caña cuando no estés pescando', 1.6); return; } const open = RODS.filter((r) => rodOpen(s, r)), i = open.findIndex((r) => r.id === s.rodId), nx = open[(i + 1) % open.length]; s.rodId = nx.id; save(s); say(s, tf('Caña de {a}', TQT(nx.name).toLowerCase()) + ` · ${TQT('hasta')} ${Math.round(48 * nx.dist)} m`, 1.8); const locked = RODS.find((r) => !rodOpen(s, r)); if (locked && open.length === 1) say(s, tf('La caña de {a} se consigue con', TQT(locked.name).toLowerCase()) + ` ${locked.need} ${TQT('especies')}`, 2.4); return; }
    for (const b of UI.baits) if (hit(b, p, 2)) { if (!calm) { say(s, 'Cambia de cebo cuando no estés pescando', 1.6); return; } if (baitOpen(s, b.b)) { s.bait = b.b.id; s.baitSwing = 1; save(s); vib(10); } else say(s, tf('Pesca {a} para conseguirlo', `${b.b.need[1]} × ${TQT(FBY[b.b.need[0]].name)}`), 2.4); return; }
    s.px = p.x; s.py = p.y;
    if (s.phase === 'fight' && s.fight.qte) { const Q = s.fight.qte; if (Q.dir === 'TAP') Q.taps++; else { Q.ox = p.x; Q.oy = p.y; } }
    s.holding = true; s.downX = p.x; s.drag = 0; s.aim0 = 0; s.aim = 0;
    if (s.phase === 'idle') startCast(s); else if (s.phase === 'wait' || s.phase === 'bite') tapDuringWait(s);
  }
  function onMove(e) { if (!H) return; const s = H.s, p = toL(e); s.px = p.x; s.py = p.y; if (s.carDown) { const now = performance.now(), cd = s.carDown, dtm = Math.max(1, now - (cd.lt || now - 16)); cd.v = (cd.v || 0) * .6 + ((p.x - cd.cx) / dtm) * .4; cd.lt = now; cd.cx = p.x; return; } if (s.holding) { s.drag = clamp((p.x - s.downX) / 70, -1, 1); if (s.phase === 'charge') s.aim = clamp(s.aim0 + (p.x - s.downX) / 260, -.28, .28); } }
  const wrapI = (i, n) => ((i % n) + n) % n; // carrusel infinito
  function carStep(s, key, d) { s.carSel = s.carSel || {};
    if (key === 'place') { const cur = s.carSel.place != null ? s.carSel.place : PLACES.findIndex((q) => q.id === s.place), i = wrapI(cur + d, PLACES.length), pl = PLACES[i]; s.carSel.place = i; if (placeOpen(s, pl) && pl.id !== s.place) { s.place = pl.id; initPlace(s); save(s); } if (d) vib(8); }
    else if (key === 'tod') { const i = wrapI(todIdx(s.tod) + d, 4); s.tod = TODS[i][1]; initPlace(s); vib(8); }
    else { const cur = s.carSel.rod != null ? s.carSel.rod : Math.max(0, RODS.findIndex((r) => r.id === s.rodId)), i = wrapI(cur + d, RODS.length); s.carSel.rod = i; if (rodOpen(s, RODS[i])) { s.rodId = RODS[i].id; save(s); } if (d) vib(8); } }
  function onUp(e) { if (!H) return; const s = H.s; if (s.carDown) { const p = toL(e), dx = p.x - s.carDown.x, C = s.car && s.car[s.carDown.key], gap = (s.carRects[s.carDown.key].h * 1.5) * .78; if (C) C.pos -= dx / gap; const fl = dx + clamp((s.carDown.lt && performance.now() - s.carDown.lt < 90 ? s.carDown.v || 0 : 0) * 220, -gap * 3, gap * 3), steps = Math.abs(dx) > 28 || Math.abs(fl) > 40 ? -Math.round(fl / gap) || (fl < 0 ? 1 : -1) : p.x < 92 ? -1 : p.x > 268 ? 1 : 0; /* 7.3: con inercia */ carStep(s, s.carDown.key, steps); s.carDown = null; return; } s.holding = false; s.drag = 0; if (s.phase === 'charge') release(s); }
  function resize() {
    if (!H) return; const c = H.container, cw = c.clientWidth || W; H.canvas.style.height = '0px';
    let ch = c.clientHeight; if (ch < 50) ch = (cw * LH) / W; const dpr = Math.min(3, root.devicePixelRatio || 1);
    H.canvas.style.width = cw + 'px'; H.canvas.style.height = ch + 'px'; H.canvas.width = Math.round(cw * dpr); H.canvas.height = Math.round(ch * dpr);
    H.k = Math.min(cw / W, ch / LH); H.ox = (cw - W * H.k) / 2; H.oy = (ch - LH * H.k) / 2; H.dpr = dpr;
    H.s.view = { x0: -H.ox / H.k, y0: -H.oy / H.k, x1: (cw - H.ox) / H.k, y1: (ch - H.oy) / H.k };
  }
  function frame(now) {
    if (!H) return; const dt = Math.min(0.05, Math.max(0, (now - (H.last || now)) / 1000)); H.last = now;
    if (!root.TQ_PAUSE) update(H.s, dt);
    const ctx = H.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, H.canvas.width, H.canvas.height);
    ctx.setTransform(H.k * H.dpr, 0, 0, H.k * H.dpr, H.ox * H.dpr, H.oy * H.dpr); draw(ctx, H.s);
    H.raf = root.requestAnimationFrame(frame);
  }
  function mount(el) {
    if (H) unmount();
    const canvas = document.createElement('canvas'); canvas.style.display = 'block'; canvas.style.touchAction = 'none'; canvas.setAttribute('aria-label', TQT('Pesca con Tiny'));
    el.appendChild(canvas);
    H = { container: el, canvas, ctx: canvas.getContext('2d'), s: createState(), raf: 0, last: 0, k: 1, ox: 0, oy: 0, dpr: 1 };
    resize(); canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    if (root.ResizeObserver) { H.ro = new root.ResizeObserver(resize); H.ro.observe(el); } else root.addEventListener('resize', resize);
    H.raf = root.requestAnimationFrame(frame);
  }
  function unmount() {
    if (!H) return; save(H.s); root.cancelAnimationFrame(H.raf);
    H.canvas.removeEventListener('pointerdown', onDown); H.canvas.removeEventListener('pointerup', onUp); H.canvas.removeEventListener('pointercancel', onUp);
    if (H.ro) H.ro.disconnect(); else root.removeEventListener('resize', resize);
    if (H.canvas.parentNode) H.canvas.parentNode.removeChild(H.canvas); H = null;
  }
  root.TQPesca = { mount, unmount, again: () => { if (H) { H.s.phase = 'idle'; H.s.card = null; H.s.book = null; } }, FISH, BAITS, PLACES, drawFish, fitLen,
    RODS, _debug: { get s() { return H && H.s; }, setTod: (t) => { if (H) H.s.tod = t; }, step: (dt) => H && update(H.s, dt), tap: () => H && tapDuringWait(H.s), release: () => H && release(H.s) } };
})(typeof window !== 'undefined' ? window : this);
