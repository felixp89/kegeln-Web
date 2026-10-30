// Einfacher Offline-Speicher: Dateien der App werden gemerkt, Updates kommen automatisch (erst Netz, dann Speicher).
const NAME = "taktik-web-v1";
const DATEIEN = ["./", "index.html", "config.js", "demo.js", "web-bridge.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(NAME).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const k = res.clone(); caches.open(NAME).then(c => c.put(r, k)); return res; }).catch(() => caches.match(r)));
});
