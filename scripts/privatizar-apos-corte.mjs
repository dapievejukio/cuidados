// Executar APENAS após o smoke-test de oraqui.app finalizar com êxito.
const repo=process.env.GITHUB_REPOSITORY,token=process.env.ORAQUI_REPO_ADMIN_TOKEN;
if(repo!=='dapievejukio/cuidados'||process.env.GITHUB_REF!=='refs/heads/main'||!token)throw Error('Ação não autorizada');
const url='https://api.github.com/repos/'+repo;
const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
const r=await fetch(url,{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({private:true})});
if(!r.ok)throw Error('Privatização falhou, HTTP '+r.status+'. Verifique GitHub Settings > General > Danger Zone.');
const check=await fetch(url,{headers});
if(!check.ok||!(await check.json()).private)throw Error('Não foi possível confirmar que o repositório está privado.');
console.log('GitHub PRIVATE confirmado.');
