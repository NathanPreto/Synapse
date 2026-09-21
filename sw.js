// Service worker do Synapse: cache do app shell para abertura instantânea
// e uso básico offline. Chamadas para APIs externas não são interceptadas.
const CACHE_VERSION = 'v16';
const CACHE_NAME = `synapse-shell-${CACHE_VERSION}`;
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './synapse-runtime.js',
  './backend.js',
  './tailwind.css?v=16',
  './src/money.js?v=16',
  './src/safety.js?v=16',
  './src/whatsapp.js?v=16',
  './src/vault.js?v=16',
  './src/common.js?v=16',
  './src/auth.js?v=16',
  './src/workspace.js?v=16',
  './src/shell.js?v=16',
  './src/modals.js?v=16',
  './src/assistant.js?v=16',
  './src/header.js?v=16',
  './src/panels.js?v=16',
  './src/mental.js?v=16',
  './src/clients.js?v=16',
  './src/reminders.js?v=16',
  './src/calm.js?v=16',
  './src/account.js?v=16',
  './src/main.js?v=16',
  './services/supabase.js',
  './services/persistence.js',
  './manifest.json?v=16',
  './synapse-logo.svg?v=16',
  './standard-logo.svg?v=16',
  './splash-logo.svg?v=16',
  './icon-192.png?v=16',
  './icon-512.png?v=16',
  './icon-maskable.png?v=16',
  './apple-touch-icon.png?v=16',
  './favicon-32.png?v=16'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(
          names
            .filter(name => name.startsWith('synapse-shell-') && name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches
            .open(CACHE_NAME)
            .then(cache => cache.put(req, copy))
            .catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
