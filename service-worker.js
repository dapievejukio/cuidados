/* ORAQUI — Service Worker | 08/10/2026
 * Cache do aplicativo e recebimento de notificações Web Push.
 * Registros e fotografias offline são gerenciados pelo colaborador.html (IndexedDB).
 */
const CACHE_NAME = 'oraqui-shell-v1-20261008';
const APP_SHELL = ['/', '/index.html', '/colaborador.html', '/gestor.html'];
const SAME_ORIGIN = self.location.origin;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Uma página temporariamente indisponível não deve impedir a instalação.
    await Promise.allSettled(APP_SHELL.map(async (path) => {
      const response = await fetch(new Request(path, { cache: 'reload' }));
      if (response.ok && response.type === 'basic') await cache.put(path, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('oraqui-shell-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SAME_ORIGIN) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        return new Response('ORAQUI indisponível sem conexão. Abra o aplicativo conectado ao menos uma vez.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
  }
});

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data = {};
    if (event.data) {
      try { data = event.data.json(); }
      catch (_) { data = { body: event.data.text() }; }
    }
    const title = String(data.title || 'ORAQUI — Nova notificação');
    const target = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
      ? data.url : '/colaborador.html';
    await self.registration.showNotification(title, {
      body: String(data.body || 'Você recebeu uma nova demanda.'),
      tag: String(data.tag || 'oraqui-notificacao'),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: target },
      requireInteraction: title.includes('🚨'),
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const path = event.notification.data?.url || '/colaborador.html';
    const destination = new URL(path, SAME_ORIGIN);
    if (destination.origin !== SAME_ORIGIN) return;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === SAME_ORIGIN) {
        await client.navigate(destination.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(destination.href);
  })());
});
