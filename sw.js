/* TinyQuit · funciona sin conexión. Primero intenta la red (para recibir versiones nuevas) y si no hay, usa la copia guardada. */
var CACHE = 'tinyquit-v0.2.0';
var CORE = ['./', 'index.html', 'app.js', 'tq-runtime.js', 'vendor/react.production.min.js', 'vendor/react-dom.production.min.js', 'screens/main.html', 'screens/onboarding.html', 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); if (r.ok) caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
