// Service worker do Synapse: cache do app shell para abertura instantânea
// e uso básico offline. Chamadas para APIs externas não são interceptadas.
const CACHE_VERSION = 'v15';
const CACHE_NAME = `synapse-shell-${CACHE_VERSION}`;
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './synapse-runtime.js',
  './backend.js',
  './tailwind.css?v=15',
  './src/safety.js?v=15',
  './src/whatsapp.js?v=15',
  './src/vault.js?v=15',
  './src/common.js?v=15',
  './src/auth.js?v=15',
  './src/workspace.js?v=15',
  './src/shell.js?v=15',
  './src/modals.js?v=15',
  './src/assistant.js?v=15',
  './src/header.js?v=15',
  './src/panels.js?v=15',
  './src/mental.js?v=15',
  './src/clients.js?v=15',
  './src/reminders.js?v=15',
  './src/calm.js?v=15',
  './src/account.js?v=15',
  './src/main.js?v=15',
  './services/supabase.js',
  './services/persistence.js',
  './manifest.json?v=15',
  './synapse-logo.svg?v=15',
  './standard-logo.svg?v=15',
  './splash-logo.svg?v=15',
  './icon-192.png?v=15',
  './icon-512.png?v=15',
  './icon-maskable.png?v=15',
  './apple-touch-icon.png?v=15',
  './favicon-32.png?v=15'
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
