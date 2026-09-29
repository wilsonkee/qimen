// 离线缓存：有网时先取最新版，没网时用缓存
const CACHE = 'qimen-3f268579';
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "app.js?v=3f268579", "engine.js?v=3f268579", "lunar.js?v=3f268579", "bamen.json", "cases.json", "ganke.json", "kb.json", "scene.json", "symbols.json"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  e.respondWith(fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true })).then(r => r || caches.match('index.html'))));
});
