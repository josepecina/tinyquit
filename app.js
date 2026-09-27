/* TinyQuit web app · v0.3: toda la app en 12 idiomas, datos anónimos opcionales */
(function () {
  'use strict';
  var VERSION = '0.3.1';
  // beta: Premium gratis para todos; ?tester=1 muestra los botones de prueba (solo para el equipo)
  var TESTER = /[?&]tester=1/.test(location.search);
  // servidor de datos anónimos (Supabase): se rellena cuando creemos la cuenta
  window.TQ_DATA = window.TQ_DATA || null;
  var KEY = { onb: 'tq.onboarded', onbState: 'tq.onb', main: 'tq.main' };
  var TRANSIENT = ['crave', 'craveMode', 'craveT', 'mth', 'bnc', 'golf', 'pop', 'slots', 'toast', 'toastT', 'adOpen', 'adT', 'sheet', 'celebrate', 'unlockPop', 'mTick', 'uTick', 'bump'];

  function store(k, v) { try { if (v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  if (/[?&]reset=1/.test(location.search)) { [KEY.onb, KEY.onbState, KEY.main].forEach(function (k) { store(k); }); history.replaceState(null, '', location.pathname); }

  // tamaño: el diseño mide 390 px de ancho; se escala al ancho de la pantalla
  function fit() {
    var w = Math.min(window.innerWidth, 520), hgt = window.innerHeight, sc = w / 390;
    var root = document.documentElement;
    root.style.setProperty('--appH', Math.round(hgt / sc) + 'px');
    root.style.setProperty('--appScale', sc);
    root.style.setProperty('--appW', w + 'px');
  }
  window.addEventListener('resize', fit); fit();

  function setHead(html) {
    Array.prototype.slice.call(document.head.querySelectorAll('[data-screen-head]')).forEach(function (n) { n.remove(); });
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    Array.prototype.slice.call(tmp.childNodes).forEach(function (n) {
      if (n.nodeType !== 1) return;
      var el = document.createElement(n.tagName.toLowerCase());
      Array.prototype.slice.call(n.attributes).forEach(function (at) { el.setAttribute(at.name, at.value); });
      el.textContent = n.textContent;
      el.setAttribute('data-screen-head', '');
      document.head.appendChild(el);
    });
  }

  // respuestas del alta -> estado inicial real de la app (sin datos de ejemplo)
  function fromOnb(o) {
    var now = new Date(), cut = String(o.cutoff || '00:00').split(':');
    var sh = new Date(now.getTime() - ((+cut[0]) * 60 + (+cut[1] || 0)) * 60000);
    var prod = o.kind === 'vaper' ? 'vape' : (o.kind === 'calentado' ? 'iqos' : 'cig');
    var week = o.period === 'week', cur = +o.current || (prod === 'vape' ? 150 : 15);
    var perDay = week ? Math.max(1, Math.round(cur / 7)) : cur;
    return {
      live: true, tester: false, startY: sh.getFullYear(), startM: sh.getMonth(), startD: sh.getDate(), day: 1, seenDay: 1, history: {}, times: [], selDay: 1, missed: [], calOff: 0, fixOpen: false,
      userName: o.name || '', product: prod, countMode: week ? 'week' : 'day', baseline: perDay, limit: perDay, weekLimit: week ? cur : perDay * 7,
      autoOn: o.pace !== 'libre', autoN: +o.autoN || 1, autoDays: +o.autoD || 7, lastDrop: 1,
      shareData: !!o.shareData, shareAskedAt: Date.now(), anonId: 'a' + Math.random().toString(36).slice(2) + Date.now().toString(36), dataQ: [], lang: o.lang || 'es', price: +o.price || 5.2, pack: +o.pack || 20, cutoff: o.cutoff || '00:00', notif: o.notif || { fast: true, before: true, drop: true, night: false, morning: false }, sound: o.sound !== false,
      premium: true, shields: 1, cravesBeaten: 0, cravesToday: 0, streakBoost: 0, rescuesUsed: 0, tab: 'hoy', quitAt: 0, goalStart: 0, tagEver: false, tagDay: 0, tipOffset: 0,
      forced: {}, skips: {}, adsFor: {}, widgetAdded: false, shares: 0, offerSim: false, popBest: 0, popTotal: 0, reboteBest: 0, reboteTotal: 0, golfBest: 0, golfBestStrokes: 0, golfPlays: 0, mathBest: 0, mathPlays: 0, activeSec: 0, adsToday: 0
    };
  }

  // idiomas: la app está escrita en español y se traduce al pintar
  var LOC = { en: 'en-GB', pt: 'pt-PT', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', nl: 'nl-NL', pl: 'pl-PL', tr: 'tr-TR', id: 'id-ID', ja: 'ja-JP', zh: 'zh-CN' };
  var dictP = {}, curLang = 'es', mainLogic = null;
  function loadDict(l) { if (l === 'es' || !LOC[l]) return Promise.resolve(); if (!dictP[l]) dictP[l] = fetch('i18n/' + l + '.json?v=' + VERSION).then(function (r) { return r.json(); }).then(function (d) { TQRuntime.i18n.dicts[l] = d; }).catch(function () {}); return dictP[l]; }
  function applyLang(l, name) {
    l = LOC[l] ? l : 'es';
    TQRuntime.i18n.name = name || '';
    if (l === curLang) return Promise.resolve(false);
    return loadDict(l).then(function () {
      curLang = l; document.documentElement.lang = l;
      if (l !== 'es') { var ws = []; try { var fW = new Intl.DateTimeFormat(LOC[l], { weekday: 'long' }), fM = new Intl.DateTimeFormat(LOC[l], { month: 'long' }); for (var i = 0; i < 7; i++) { var w = fW.format(new Date(2026, 8, 7 + i)); ws.push(w, w.toLowerCase(), w.charAt(0).toUpperCase() + w.slice(1)); } for (var m = 0; m < 12; m++) { var mo = fM.format(new Date(2026, m, 1)); ws.push(mo, mo.toLowerCase(), mo.charAt(0).toUpperCase() + mo.slice(1)); } } catch (e) {} TQRuntime.setWords(ws.filter(function (x, i, a) { return a.indexOf(x) === i; })); }
      TQRuntime.setLang(l);
      return true;
    });
  }

  // textos largos (alemán, polaco…): encoge la letra hasta que quepa
  var fitQ = 0;
  function fitAll() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-fit]'), function (el) {
      var base = +el.getAttribute('data-fit') || 14, fs = base, min = Math.max(8, base * 0.6);
      el.style.fontSize = fs + 'px';
      while (el.scrollWidth > el.clientWidth + 0.5 && fs > min) { fs -= 0.5; el.style.fontSize = fs + 'px'; }
    });
  }
  function fitSoon() { cancelAnimationFrame(fitQ); fitQ = requestAnimationFrame(function () { fitQ = requestAnimationFrame(fitAll); }); }
  new MutationObserver(fitSoon).observe(document.getElementById('app'), { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', fitSoon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);

  var cache = {};
  function getScreen(name) {
    if (cache[name]) return Promise.resolve(cache[name]);
    return fetch('screens/' + name + '.html?v=' + VERSION).then(function (r) { return r.text(); }).then(function (src) { cache[name] = TQRuntime.loadScreen(src); return cache[name]; });
  }

  var mountEl = document.getElementById('app'), reactRoot = ReactDOM.createRoot(mountEl), saveT = null;

  function show(name) {
    return getScreen(name).then(function (scr) {
      setHead(scr.headHTML);
      var View;
      if (name === 'onboarding') {
        TQRuntime.setLang('es'); curLang = 'es';
        var doneT = null;
        View = TQRuntime.makeView(scr, {
          onState: function (st) {
            if (st.step === 11 && !doneT) {
              store(KEY.onbState, st);
              doneT = setTimeout(function () { store(KEY.onb, true); show('main'); }, 2200);
            }
          }
        });
      } else {
        View = TQRuntime.makeView(scr, {
          restore: function (inst) {
            var saved = load(KEY.main);
            if (saved && saved.live) { TRANSIENT.forEach(function (k) { delete saved[k]; }); Object.keys(saved).forEach(function (k) { if (k in inst.state) inst.state[k] = saved[k]; }); if (!saved.tester) inst.state.premium = true; if (TESTER) inst.state.tester = true; return; }
            var o = load(KEY.onbState) || {};
            Object.assign(inst.state, fromOnb(o)); if (TESTER) inst.state.tester = true;
          },
          onMount: function (lg) { mainLogic = lg; applyLang(lg.state.lang || 'es', lg.state.userName).then(function (ch) { if (ch && mainLogic) mainLogic.forceUpdate(); }); },
          onState: function (st) {
            if ((st.lang || 'es') !== curLang || TQRuntime.i18n.name !== (st.userName || '')) applyLang(st.lang || 'es', st.userName).then(function (ch) { if (ch && mainLogic) mainLogic.forceUpdate(); });
            clearTimeout(saveT);
            saveT = setTimeout(function () { var o = {}; Object.keys(st).forEach(function (k) { if (TRANSIENT.indexOf(k) < 0) o[k] = st[k]; }); try { JSON.stringify(o); store(KEY.main, o); } catch (e) {} }, 600);
          }
        });
      }
      reactRoot.render(React.createElement(View, { key: name }));
      document.body.dataset.screen = name;
    });
  }

  show(load(KEY.onb) ? 'main' : 'onboarding').catch(function (e) {
    mountEl.innerHTML = '<p style="padding:24px;font-family:system-ui">No se ha podido cargar TinyQuit. Revisa tu conexión y vuelve a abrir.</p>';
    console.error(e);
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  window.TQApp = { version: VERSION, reset: function () { location.search = '?reset=1'; } };
})();
