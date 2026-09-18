// Service worker do Synapse: cache do app shell para abertura instantânea
// e uso básico offline. Chamadas para APIs externas não são interceptadas.
const CACHE_VERSION = 'v13';
const CACHE_NAME = `synapse-shell-${CACHE_VERSION}`;
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './synapse-runtime.js',
  './backend.js',
  './app.js',
  './services/supabase.js',
  './services/persistence.js',
  './manifest.json?v=12',
  './synapse-logo.svg?v=12',
  './standard-logo.svg?v=12',
  './splash-logo.svg?v=12',
  './icon-192.png?v=12',
  './icon-512.png?v=12',
  './icon-maskable.png?v=12',
  './apple-touch-icon.png?v=12',
  './favicon-32.png?v=12'
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
          .filter((name) => name.startsWith('synapse-shell-') && name !== CACHE_NAME)
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
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
