/* ORAQUI — Service Worker | 22/10/2026
 * iOS Safari: respostas obtidas por redirect HTTP não podem ser devolvidas
 * sem normalização pelo Service Worker. NÃO apagar IndexedDB (fila offline).
 */
const CACHE_NAME = 'oraqui-shell-v6-20261022-offline-css-ponto';
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const SAME_ORIGIN = self.location.origin;
const OFFLINE_ASSETS = new Set([
  '/oraqui-offline.js', '/manifest.webmanifest', '/login-3.css', '/colaborador-3.css',
  '/assets/gestor-3/simbolo.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png',
  '/assets/marca/oraqui-transparente.webp'
]);
const NAVIGATION_SHELL = new Set(['/', '/index.html', '/colaborador', '/colaborador.html', '/gestor.html']);
const APP_SHELL = [...NAVIGATION_SHELL, ...OFFLINE_ASSETS, SUPABASE_CDN];

function allowedCacheResponse(response, isLocal) {
  if (!response || !response.ok || response.type === 'opaque' || response.type === 'opaqueredirect') return false;
  if (isLocal && response.url) {
    try { if (new URL(response.url).origin !== SAME_ORIGIN) return false; }
    catch { return false; }
  }
  return true;
}

/* Constrói resposta SEM flag redirected, necessária para navegação iOS.
 * Também remove cabeçalhos incompatíveis com um novo corpo Fetch. */
async function normalizedResponse(response, isLocal) {
  if (!allowedCacheResponse(response, isLocal)) return null;
  if (!response.redirected) return response;
  const headers = new Headers(response.headers);
  for (const key of ['content-encoding', 'content-length', 'transfer-encoding', 'location', 'set-cookie'])
    headers.delete(key);
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function cacheGood(request, response, isLocal) {
  const good = await normalizedResponse(response, isLocal);
  if (good) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, good.clone());
  }
  return good;
}
async function cachedGood(request, isLocal) {
  const cache = await caches.open(CACHE_NAME);
  const old = await cache.match(request, { ignoreSearch: true });
  if (!old) return null;
  const good = await normalizedResponse(old, isLocal);
  if (!good) {
    await cache.delete(request, { ignoreSearch: true });
    return null;
  }
  if (old.redirected) await cache.put(request, good.clone());
  return good;
}

function unavailable() {
  return new Response(
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OraQui Offline</title><body style="font:16px Arial,sans-serif;padding:24px;color:#173847"><h2>OraQui Offline</h2><p>Esta página ainda não está disponível neste aparelho sem conexão.</p><p>Conecte-se à internet, abra o OraQui e ative o acesso offline antes de testar novamente.</p></body></html>',
    {status:503, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}}
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      const cdn = path === SUPABASE_CDN;
      // Fetch com CORS para não gravar o redirect opaco da CDN.
      const request = cdn
        ? new Request(path, { mode: 'cors', redirect: 'follow', cache: 'reload' })
        : new Request(path, { redirect: 'follow', cache: 'reload' });
      const response = await fetch(request);
      const good = await cacheGood(path, response, !cdn);
      if (!good) throw new Error('Recurso offline indisponível: '+path);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith('oraqui-shell-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    // Apaga apenas caches do Service Worker; NUNCA IndexedDB (PIN/fotos/ponto).
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // CDN Supabase é essencial para iniciar o app no modo avião.
  if (url.origin !== SAME_ORIGIN) {
    if (url.href !== SUPABASE_CDN) return;
    event.respondWith((async () => {
      const existing = await cachedGood(SUPABASE_CDN, false);
      if (existing) return existing;
      try {
        const response = await fetch(new Request(SUPABASE_CDN, {
          mode:'cors', redirect:'follow', cache:'reload'
        }));
        return await cacheGood(SUPABASE_CDN, response, false) || Response.error();
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  if (OFFLINE_ASSETS.has(url.pathname)) {
    event.respondWith((async () => {
      const existing = await cachedGood(request, true);
      if (existing) return existing;
      try {
        const response = await fetch(request);
        return await cacheGood(request, response, true) || response;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        // Uma URL curta pode redirecionar para /index.html.
        // Safari rejeita response.redirected === true em respondWith.
        const normalized = await normalizedResponse(response, true);
        if (normalized) {
          if (NAVIGATION_SHELL.has(url.pathname))
            await cacheGood(request, normalized, true);
          return normalized;
        }
        if (!response.ok) return response;
      } catch (_) {
        // Em modo avião, tentar somente HTML do app já armazenado.
      }
      return await cachedGood(request, true)
        || (['/colaborador','/colaborador.html'].includes(url.pathname)
          ? await cachedGood('/colaborador.html', true) || await cachedGood('/colaborador', true) : null)
        || (url.pathname === '/' ? await cachedGood('/index.html', true) : null)
        || unavailable();
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
