// Auditoria prévia; não altera DNS, Cloudflare ou GitHub.
const mode=process.argv[2]||'preparar';
const cfToken=process.env.CLOUDFLARE_API_TOKEN||'';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const ghToken=process.env.ORAQUI_REPO_ADMIN_TOKEN||'';
const repo=process.env.GITHUB_REPOSITORY;
if(repo!=='dapievejukio/cuidados')throw Error('Repositório inesperado');
if(mode==='preparar'&&(!cfToken||!account)){
 console.log('PREPARAR: estrutura pronta; faltam secrets Cloudflare para publicar a prévia. Nenhuma mudança feita.');
 process.exit(0);
}
if(!cfToken||!account||(mode==='vai-cavalo'&&!ghToken))throw Error('Faltam credenciais necessárias. Nenhuma alteração feita.');
async function api(url,token){
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
 if(!r.ok)throw Error('Falha HTTP '+r.status+' ao verificar '+new URL(url).pathname);
 return r.json();
}
if(mode==='vai-cavalo'){
 const gh=await api('https://api.github.com/repos/'+repo,ghToken);
 if(!gh.private&&!gh.permissions?.admin)throw Error('Token GitHub não tem administração; não foi feito o corte.');
 const zone=await api('https://api.cloudflare.com/client/v4/zones?name=oraqui.app&status=active',cfToken);
 if(!zone.success||zone.result?.length!==1||zone.result[0].name!=='oraqui.app')
  throw Error('oraqui.app ainda não está ativo como zona Cloudflare. Não executar o corte.');
 console.log('Zona Cloudflare oraqui.app validada.');
}else console.log('Fase PREPARAR: DNS e GitHub permanecem como estão.');
const info=await api('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/subdomain',cfToken);
if(!info.success||!info.result?.subdomain)throw Error('Workers subdomain indisponível. Verificar conta Cloudflare.');
const preview='https://oraqui-migracao.'+info.result.subdomain+'.workers.dev';
console.log('Prévia Cloudflare: '+preview);
if(process.env.GITHUB_OUTPUT){
 const fs=await import('node:fs');
 fs.appendFileSync(process.env.GITHUB_OUTPUT,'preview_url='+preview+'\n');
}
