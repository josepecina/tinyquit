/* TinyQuit web app · v0.1 (versión de prueba: el prototipo funcionando en el móvil) */
(function () {
  'use strict';
  var VERSION = '0.1.0';
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
            if (saved) { TRANSIENT.forEach(function (k) { delete saved[k]; }); Object.keys(saved).forEach(function (k) { if (k in inst.state) inst.state[k] = saved[k]; }); }
          },
          onState: function (st) {
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
