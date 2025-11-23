const VERSION = "v202511231725"; const CACHE_NAME = `prep-pep-pwa-cache-${VERSION}`;

/**
 * Only precache same-origin assets. Do NOT precache external CDNs to avoid CORS issues.
 * All paths are relative so it works both locally and on GitHub Pages subpaths.
 */
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./data/presentation.json",
  "./data/faq.json",
  "./assets/img/hero.png",
  "./assets/audio/presentation.mp3",
  // PEP audio files
  "./assets/audio/pep1.mp3",
  "./assets/audio/pep2.mp3",
  "./assets/audio/pep3.mp3",
  "./assets/audio/pep4.mp3",
  "./assets/audio/pep5.mp3",
  "./assets/audio/pep6.mp3",
  "./assets/audio/pep7.mp3",
  "./assets/audio/pep8.mp3",
  "./assets/audio/pep9.mp3",
  "./assets/audio/pep10.mp3",
  // PREP audio files (frequently used)
  "./assets/audio/prep1.mp3",
  "./assets/audio/prep2.mp3",
  "./assets/audio/prep3.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // same-origin only
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // cache-first for precached items
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return res;
          })
          .catch(() => caches.match("./index.html"));
      })
    );
  } else {
    // network-first for cross-origin (don’t precache)
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});
