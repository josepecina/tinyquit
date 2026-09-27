/* TinyQuit · runtime propio para las pantallas (plantillas con {{huecos}}, <sc-if> y <sc-for>).
   Usa React (licencia MIT) para pintar. */
(function () {
  'use strict';
  var h = React.createElement;
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  var SVG_TAGS = { svg: 1, g: 1, path: 1, circle: 1, ellipse: 1, rect: 1, line: 1, polyline: 1, polygon: 1, text: 1, tspan: 1, defs: 1, linearGradient: 1, radialGradient: 1, stop: 1, clipPath: 1, mask: 1, pattern: 1, use: 1, symbol: 1, filter: 1, feGaussianBlur: 1, feOffset: 1, feMerge: 1, feMergeNode: 1, feColorMatrix: 1, feBlend: 1, feFlood: 1, feComposite: 1, animate: 1, animateTransform: 1, foreignObject: 1, title: 1, desc: 1 };
  var ATTR_MAP = { 'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength', autocomplete: 'autoComplete', autofocus: 'autoFocus', spellcheck: 'spellCheck', inputmode: 'inputMode', enterkeyhint: 'enterKeyHint', contenteditable: 'contentEditable', crossorigin: 'crossOrigin', colspan: 'colSpan', rowspan: 'rowSpan', 'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace' };

  var decoder = document.createElement('textarea');
  function decode(s) { if (s.indexOf('&') < 0) return s; decoder.innerHTML = s; return decoder.value; }
  function camel(s) { return s.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); }); }

  // ---------- parser tolerante (conserva mayúsculas de atributos) ----------
  function parse(src) {
    var root = { tag: '#root', attrs: [], children: [] }, stack = [root], i = 0, n = src.length;
    function top() { return stack[stack.length - 1]; }
    while (i < n) {
      if (src.startsWith('<!--', i)) { var e = src.indexOf('-->', i); i = e < 0 ? n : e + 3; continue; }
      if (src[i] === '<' && src[i + 1] === '/') {
        var e2 = src.indexOf('>', i), name = src.slice(i + 2, e2).trim();
        for (var k = stack.length - 1; k > 0; k--) { if (stack[k].tag === name) { stack.length = k; break; } }
        i = e2 + 1; continue;
      }
      if (src[i] === '<' && /[A-Za-z]/.test(src[i + 1] || '')) {
        var j = i + 1; while (j < n && /[^\s/>]/.test(src[j])) j++;
        var tag = src.slice(i + 1, j), attrs = [], selfClose = false;
        while (j < n) {
          while (j < n && /\s/.test(src[j])) j++;
          if (src[j] === '>') { j++; break; }
          if (src[j] === '/' && src[j + 1] === '>') { selfClose = true; j += 2; break; }
          var a0 = j; while (j < n && /[^\s=/>]/.test(src[j])) j++;
          var an = src.slice(a0, j), av = '';
          while (j < n && /\s/.test(src[j])) j++;
          if (src[j] === '=') {
            j++; while (j < n && /\s/.test(src[j])) j++;
            var q = src[j];
            if (q === '"' || q === "'") { var e3 = src.indexOf(q, j + 1); av = src.slice(j + 1, e3); j = e3 + 1; }
            else { var v0 = j; while (j < n && /[^\s>]/.test(src[j])) j++; av = src.slice(v0, j); }
          } else if (!an) { j++; continue; }
          attrs.push([an, decode(av)]);
        }
        var node = { tag: tag, attrs: attrs, children: [] };
        top().children.push(node);
        if (tag === 'style' || tag === 'script') {
          var endT = src.indexOf('</' + tag, j); node.text = src.slice(j, endT); i = src.indexOf('>', endT) + 1; continue;
        }
        if (!selfClose && !VOID[tag.toLowerCase()]) stack.push(node);
        i = j; continue;
      }
      var lt = src.indexOf('<', i + 1); if (lt < 0) lt = n;
      if (src[i] === '<') lt = Math.max(lt, i + 1);
      top().children.push({ text: decode(src.slice(i, lt)) });
      i = lt;
    }
    return root;
  }

  // ---------- traducción (las pantallas están escritas en español) ----------
  var I18N = { lang: 'es', dicts: {}, name: '', miss: null, cache: new Map(), words: [], wre: null };
  function setWords(ws) { I18N.words = ws.slice().sort(function (a, b) { return b.length - a.length; }); I18N.wre = ws.length ? new RegExp('(?<![\\p{L}])(' + I18N.words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')(?![\\p{L}])', 'gu') : null; I18N.cache.clear(); }
  var NUM = /\d+(?:[.,]\d+)*/g;
  function normKey(t) {
    var nums = [], k = t.replace(/\s+/g, ' ').trim();
    if (I18N.name && I18N.name.length > 1) k = k.split(I18N.name).join('{name}');
    k = k.replace(NUM, function (m) { nums.push(m); return '{' + (nums.length - 1) + '}'; });
    var ws = []; if (I18N.wre) k = k.replace(I18N.wre, function (m) { ws.push(m); return '{w' + (ws.length - 1) + '}'; });
    return { k: k, nums: nums, ws: ws };
  }
  function fill(tpl, nums, name, ws) { return tpl.replace(/\{(\d+)\}/g, function (m, i) { return nums[+i] !== undefined ? nums[+i] : m; }).replace(/\{w(\d+)\}/g, function (m, i) { return ws && ws[+i] !== undefined ? ws[+i] : m; }).replace(/\{name\}/g, name || ''); }
  function TR(t) {
    if (typeof t !== 'string' || I18N.lang === 'es' || !/[A-Za-zÁÉÍÓÚáéíóúñÑ¡¿]/.test(t)) return t;
    var c = I18N.cache.get(t); if (c !== undefined) return c;
    var d = I18N.dicts[I18N.lang] || {}, lead = t.match(/^\s*/)[0], trail = t.match(/\s*$/)[0], core = t.trim(), out = null;
    if (d[core] !== undefined) out = d[core];
    else { var nk = normKey(core); if (d[nk.k] !== undefined) out = fill(d[nk.k], nk.nums, I18N.name, nk.ws); else if (I18N.miss) I18N.miss[nk.k] = (I18N.miss[nk.k] || 0) + 1; }
    var res = out === null ? t : lead + out + trail;
    if (I18N.cache.size > 20000) I18N.cache.clear();
    I18N.cache.set(t, res); return res;
  }
  // texto con huecos: se traduce la frase completa con los huecos como {0}, {1}… y luego cada valor
  function trMixed(tplKey, vals) {
    if (I18N.lang === 'es') return null;
    var d = I18N.dicts[I18N.lang] || {};
    if (d[tplKey] === undefined) { if (I18N.miss) I18N.miss['@' + tplKey] = (I18N.miss['@' + tplKey] || 0) + 1; return null; }
    return d[tplKey].replace(/\{h(\d+)\}/g, function (m, i) { var v = vals[+i]; return v == null ? '' : TR(String(v)); });
  }

  // ---------- huecos ----------
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  function lookup(path, scope) {
    if (path === 'true') return true; if (path === 'false') return false;
    var parts = path.split('.'), v = scope;
    for (var p = 0; p < parts.length; p++) { if (v == null) return undefined; v = v[parts[p]]; }
    return v;
  }
  function compileStr(s) {
    HOLE.lastIndex = 0;
    var m = /^\{\{\s*([^}]+?)\s*\}\}$/.exec(s);
    if (m) { var path = m[1]; return { single: true, fn: function (sc) { return lookup(path, sc); } }; }
    if (s.indexOf('{{') < 0) return { stat: true, fn: function () { return s; } };
    var parts = [], last = 0, mm; HOLE.lastIndex = 0;
    while ((mm = HOLE.exec(s))) { parts.push(s.slice(last, mm.index)); parts.push({ p: mm[1] }); last = HOLE.lastIndex; }
    parts.push(s.slice(last));
    var hp = [], hk = parts.map(function (x) { if (typeof x === 'string') return x; hp.push(x.p); return '{h' + (hp.length - 1) + '}'; }).join('').replace(/\s+/g, ' ').trim();
    return { mixed: /[A-Za-zÁÉÍÓÚáéíóúñÑ¡¿]/.test(hk.replace(/\{h\d+\}/g, '')) ? { key: hk, paths: hp } : null, fn: function (sc) { var o = ''; for (var q = 0; q < parts.length; q++) { var x = parts[q]; if (typeof x === 'string') o += x; else { var v = lookup(x.p, sc); o += v == null ? '' : v; } } return o; } };
  }
  var styleCache = new Map();
  function parseStyle(str) {
    var c = styleCache.get(str); if (c) return c;
    var o = {}, depth = 0, cur = '', list = [];
    for (var i = 0; i < str.length; i++) { var ch = str[i]; if (ch === '(') depth++; else if (ch === ')') depth--; if (ch === ';' && depth === 0) { list.push(cur); cur = ''; } else cur += ch; }
    list.push(cur);
    list.forEach(function (d) { var k = d.indexOf(':'); if (k < 0) return; var prop = d.slice(0, k).trim(), val = d.slice(k + 1).trim(); if (!prop || val === '') return; if (prop.indexOf('--') !== 0) { prop = prop.indexOf('-webkit-') === 0 ? 'Webkit' + camel(prop.slice(8)) : camel(prop); } o[prop] = val; });
    if (styleCache.size > 5000) styleCache.clear();
    styleCache.set(str, o); return o;
  }

  // ---------- compilar a funciones que devuelven elementos React ----------
  function compileChildren(list, inSvg) {
    var out = [];
    list.forEach(function (c) {
      if (c.tag === undefined) { if (!c.text || (/^\s*$/.test(c.text) && (c.text.indexOf('\n') >= 0 || inSvg))) return; var cs = compileStr(c.text); if (cs.mixed) { var mk = cs.mixed; out.push(function (sc) { var vals = mk.paths.map(function (pp) { return lookup(pp, sc); }); var r = trMixed(mk.key, vals); return r === null ? TR(cs.fn(sc)) : r; }); } else out.push(function (sc) { return TR(cs.fn(sc)); }); return; }
      var f = compileNode(c, inSvg); if (f) out.push(f);
    });
    return out;
  }
  // los huecos vacíos se quedan como null: así cada hijo conserva su sitio y React no vuelve a montar lo que viene detrás (antes, al cambiar a modo noche, se reconstruía toda la pantalla y el scroll saltaba arriba)
  function runKids(kids, sc) { var r = new Array(kids.length); for (var i = 0; i < kids.length; i++) { var v = kids[i](sc); r[i] = (v === undefined || v === '') ? null : v; } return r; }
  function compileNode(node, inSvg) {
    var tag = node.tag;
    if (tag === 'script' || tag === 'helmet') return null;
    if (tag === 'sc-if') {
      var cond = compileStr((node.attrs.find(function (a) { return a[0] === 'value'; }) || [0, ''])[1]);
      var kidsI = compileChildren(node.children, inSvg);
      return function (sc) { return cond.fn(sc) ? h.apply(null, [React.Fragment, null].concat(runKids(kidsI, sc))) : null; };
    }
    if (tag === 'sc-for') {
      var listA = compileStr((node.attrs.find(function (a) { return a[0] === 'list'; }) || [0, ''])[1]);
      var as = (node.attrs.find(function (a) { return a[0] === 'as'; }) || [0, 'item'])[1];
      var kidsF = compileChildren(node.children, inSvg);
      return function (sc) {
        var arr = listA.fn(sc) || [];
        return h(React.Fragment, null, arr.map(function (it, ix) { var s2 = Object.create(sc); s2[as] = it; s2.$index = ix; return h.apply(null, [React.Fragment, { key: ix }].concat(runKids(kidsF, s2))); }));
      };
    }
    var svg = inSvg || tag === 'svg';
    var attrs = [];
    node.attrs.forEach(function (a) {
      var name = a[0];
      if (name.indexOf('hint-') === 0) return;
      var key = ATTR_MAP[name] || ATTR_MAP[name.toLowerCase()] || name;
      if (svg && key.indexOf('-') > 0 && key.indexOf('data-') !== 0 && key.indexOf('aria-') !== 0) key = camel(key);
      attrs.push({ key: key, isStyle: name === 'style', isEvt: /^on[A-Z]/.test(name), v: compileStr(a[1]) });
    });
    if (tag === 'style') { var css = node.text || ''; return function () { return h('style', { dangerouslySetInnerHTML: { __html: css } }); }; }
    var kids = compileChildren(node.children, svg);
    return function (sc) {
      var props = {};
      for (var i = 0; i < attrs.length; i++) {
        var at = attrs[i], val = at.v.fn(sc);
        if (at.isStyle) { props.style = parseStyle(String(val == null ? '' : val)); continue; }
        if (at.isEvt) { if (typeof val === 'function') props[at.key] = val; continue; }
        if (val === false || val === null || val === undefined) continue;
        if (at.key === 'aria-label' || at.key === 'placeholder' || at.key === 'title' || at.key === 'alt') val = TR(String(val));
        if (val === true && at.v.single && !/^aria-/.test(at.key)) val = true;
        props[at.key] = val;
      }
      if (tag === 'input' || tag === 'textarea' || tag === 'select') { if ('value' in props && !props.onChange && !props.onInput) props.readOnly = props.readOnly || tag !== 'select'; if (props.onInput && !props.onChange) props.onChange = props.onInput; if ('value' in props && props.value == null) props.value = ''; }
      var k = runKids(kids, sc);
      return h.apply(null, [tag, props].concat(k));
    };
  }

  // ---------- lógica (API igual a la del prototipo) ----------
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (upd, cb) {
    var u = typeof upd === 'function' ? upd(this.state, this.props) : upd;
    if (u) this.state = Object.assign({}, this.state, u);
    if (this.__onState) this.__onState(this.state);
    if (this.__schedule) this.__schedule();
    if (cb) cb();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__schedule) this.__schedule(); };

  // ---------- cargar una pantalla ----------
  function loadScreen(src) {
    var root = parse(src), helmet = null, script = null, body = [], xdc = null;
    (function find(list) { list.forEach(function (n) { if (!n.tag) return; if (n.tag === 'x-dc' && !xdc) xdc = n; if (n.tag === 'script' && (n.attrs.find(function (a) { return a[0] === 'type'; }) || [])[1] === 'text/x-dc') script = n.text; if (n.children) find(n.children); }); })(root.children);
    (xdc ? xdc.children : []).forEach(function (n) { if (n.tag === 'helmet') { helmet = n; return; } if (n.tag === 'script') return; body.push(n); });
    var headHTML = '';
    if (helmet) {
      var m = /<helmet>([\s\S]*?)<\/helmet>/.exec(src); headHTML = m ? m[1] : '';
    }
    var Logic = new Function('DCLogic', script + '\n;return Component;')(DCLogic);
    var render = compileChildren(body, false);
    return { headHTML: headHTML, Logic: Logic, render: render };
  }

  function makeView(screen, opts) {
    return function View() {
      var ref = React.useRef(null), pair = React.useState(0), bump = pair[1];
      if (!ref.current) {
        var inst = new screen.Logic({});
        if (opts.restore) opts.restore(inst);
        var pending = false;
        inst.__schedule = function () { if (pending) return; pending = true; Promise.resolve().then(function () { pending = false; bump(function (x) { return x + 1; }); }); };
        inst.__onState = opts.onState || null;
        ref.current = inst;
      }
      var logic = ref.current;
      React.useEffect(function () { if (logic.componentDidMount) logic.componentDidMount(); if (opts.onMount) opts.onMount(logic); return function () { logic.__schedule = null; if (logic.componentWillUnmount) logic.componentWillUnmount(); }; }, []);
      var vals = logic.renderVals ? logic.renderVals() : {};
      return h.apply(null, [React.Fragment, null].concat(runKids(screen.render, vals)));
    };
  }

  window.TQRuntime = { loadScreen: loadScreen, makeView: makeView, DCLogic: DCLogic, i18n: I18N, tr: TR, normKey: normKey, setWords: setWords, setLang: function (l) { if (I18N.lang !== l) { I18N.lang = l; I18N.cache.clear(); } } };
  window.TQtr = TR;
})();
