// Mantém as rotas históricas do OraQui na mesma origem, sem redirects.
// As demais requisições são servidas diretamente pelos Static Assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/colaborador' || url.pathname === '/colaborador/') {
      const target = new URL(url);
      target.pathname = url.pathname === '/' ? '/index.html' : '/colaborador.html';
      return env.ASSETS.fetch(new Request(target, request));
    }
    return env.ASSETS.fetch(request);
  }
};
