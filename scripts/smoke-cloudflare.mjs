// Teste de publicação, somente leitura, com prova do commit servido.
const base=process.argv[2],commit=process.argv[3];
if(!base||!base.startsWith('https://')||!commit)throw Error('URL HTTPS e commit são obrigatórios');
const paths=['/index.html','/gestor.html','/colaborador.html','/reportar.html','/sindico.html','/oraqui-offline.js','/service-worker.js','/manifest.webmanifest','/icon-192.png','/colaborador'];
for(const path of paths){
 const r=await fetch(new URL(path,base),{redirect:'manual',headers:{'Cache-Control':'no-cache'}});
 if(r.status!==200)throw Error(path+': HTTP '+r.status+' (necessário 200 sem redirect)');
 const type=(r.headers.get('content-type')||'').toLowerCase();
 if((path.endsWith('.html')||path==='/colaborador')&&!type.includes('text/html'))throw Error(path+': HTML com MIME inválido');
 if(path==='/service-worker.js'&&!type.includes('javascript'))throw Error('Service worker não servido como JavaScript');
 if((path.endsWith('.html')||path==='/colaborador')&&!(await r.text()).trimStart().toLowerCase().startsWith('<!'))throw Error(path+': HTML inesperado');
 console.log('OK '+path);
}
const p=await fetch(new URL('/migration-proof.json',base),{redirect:'manual'});
if(p.status!==200)throw Error('Domínio não publica o marcador da nova plataforma');
const body=await p.json();
if(body.app!=='OraQui'||body.release!==commit)throw Error('Domínio serve outra versão (ou GitHub Pages). Abortando privatização.');
console.log('OK domínio serve commit '+commit.slice(0,12));
console.log('QA de login, fotos, PWA e offline real permanece etapa manual');
