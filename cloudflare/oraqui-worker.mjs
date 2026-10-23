/**
 * OraQui Cloudflare Worker: preserve the exact same origin paths used by PWA.
 * Root and /colaborador have explicit same-origin rewrites (no HTTP redirects).
 * Do not change oraqui.app DNS until smoke tests pass.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return env.ASSETS.fetch(request);
    }
    if (url.pathname === '/' || url.pathname === '/colaborador' || url.pathname === '/colaborador/') {
      const target = new URL(url);
      target.pathname = url.pathname === '/' ? '/index.html' : '/colaborador.html';
      const response = await env.ASSETS.fetch(new Request(target, request));
      if (response.ok) return response;
      return new Response('OraQui: página essencial não encontrada', {status: 503});
    }
    return env.ASSETS.fetch(request);
  }
};
