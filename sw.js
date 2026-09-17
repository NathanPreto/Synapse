// Service worker do Synapse: cache do "app shell" para abertura instantânea
// e uso básico offline. Não intercepta chamadas ao Supabase nem ao Gemini —
// essas continuam sempre indo direto para a rede.
const CACHE_NAME = 'synapse-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './synapse-runtime.js',
  './app.js',
  './core/logger.js',
  './core/sanitize.js',
  './services/storage.js',
  './services/supabase.js',
  './services/spreadsheet.js',
  './manifest.json',
  './synapse-mark.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Estratégia: network-first para todo mundo (pra não servir uma versão velha
// do app.js sem querer), com fallback pro cache quando estiver offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Nunca cachear/interceptar chamadas a APIs externas (Supabase, Gemini, CDNs).
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
