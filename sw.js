// Service worker do Synapse: cache do app shell para abertura instantânea
// e uso básico offline. Não intercepta chamadas ao Supabase nem ao Gemini.
const CACHE_NAME = 'synapse-shell-v5';
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
  './manifest.json?v=5',
  './synapse-mark.png',
  './icon-192.png?v=5',
  './icon-512.png?v=5',
  './icon-maskable.png?v=5',
  './apple-touch-icon.png?v=5',
  './favicon-32.png?v=4'
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

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
