// Service worker do Synapse: cache do app shell para abertura instantânea
// e uso básico offline. Chamadas para APIs externas não são interceptadas.
const CACHE_VERSION = 'v18';
const CACHE_NAME = `synapse-shell-${CACHE_VERSION}`;
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './synapse-runtime.js',
  './backend.js',
  './tailwind.css?v=18',
  './src/money.js?v=18',
  './src/safety.js?v=18',
  './src/whatsapp.js?v=18',
  './src/vault.js?v=18',
  './src/common.js?v=18',
  './src/auth.js?v=18',
  './src/workspace.js?v=18',
  './src/shell.js?v=18',
  './src/modals.js?v=18',
  './src/assistant.js?v=18',
  './src/header.js?v=18',
  './src/panels.js?v=18',
  './src/mental.js?v=18',
  './src/clients.js?v=18',
  './src/reminders.js?v=18',
  './src/calm.js?v=18',
  './src/account.js?v=18',
  './src/main.js?v=18',
  './services/supabase.js',
  './services/persistence.js',
  './manifest.json?v=18',
  './synapse-logo.svg?v=18',
  './standard-logo.svg?v=18',
  './splash-logo.svg?v=18',
  './icon-192.png?v=18',
  './icon-512.png?v=18',
  './icon-maskable.png?v=18',
  './apple-touch-icon.png?v=18',
  './favicon-32.png?v=18'
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
