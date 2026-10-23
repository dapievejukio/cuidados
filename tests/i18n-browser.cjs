const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const sdk = `globalThis.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),signInWithPassword:async credentials=>{globalThis.receivedCredentials=credentials;return {data:{},error:{code:'invalid_credentials',message:'private server content'}}},resetPasswordForEmail:async()=>({error:null})}}}};`;
for (const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))) {
  for (const match of fs.readFileSync(path.join(root,file),'utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if(match[1].trim()) new vm.Script(match[1],{filename:file});
}
for (const file of ['service-worker.js','assets/i18n/i18n.js','assets/i18n/pt-BR.js','assets/i18n/it-IT.js']) new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
const server = http.createServer((req,res)=>{
 const target=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try { const ext=path.extname(target);res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[ext]||'application/octet-stream');res.end(fs.readFileSync(target)); }catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,channel:process.env.ORAQUI_BROWSER_CHANNEL || undefined});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'application/javascript',body:sdk}));
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html');await page.waitForSelector('.oraqui-languages');
  assert.equal(await page.locator('.login-title').innerText(),'Bem-vindo ao OraQui');
  await page.getByRole('button',{name:'Italiano',exact:true}).click();
  assert.equal(await page.locator('.login-title').innerText(),'Benvenuto su OraQui');
  await page.locator('#email').fill('maria@example.com');await page.locator('#password').fill(' private password ');
  await page.locator('#loginButton').click();await page.waitForFunction(()=>document.querySelector('#loginMessage').textContent.includes('non corretti'));
  assert.equal((await page.evaluate(()=>receivedCredentials)).password,' private password ');
  assert.ok(!(await page.locator('#loginMessage').innerText()).includes('private server content'));
  await page.getByRole('button',{name:'Português (Brasil)',exact:true}).click();
  assert.match(await page.locator('#loginMessage').innerText(),/não conferem/);
  assert.equal(await page.locator('#email').inputValue(),'maria@example.com');
  await page.evaluate(()=>{I18n.setUser('test-a');I18n.setLocale('it-IT');I18n.setUser('test-b');I18n.setLocale('pt-BR');I18n.setUser('test-a')});
  assert.equal(await page.locator('html').getAttribute('lang'),'it-IT');
  await page.reload();await page.waitForSelector('.oraqui-languages');assert.equal(await page.locator('html').getAttribute('lang'),'it-IT');
  await page.evaluate(()=>{globalThis.ORAQUI_CATALOGS['pt-BR']['test.fallback']='Português de reserva'});
  assert.equal(await page.evaluate(()=>I18n.t('test.fallback')),'Português de reserva');
  const date=await page.evaluate(()=>I18n.date('2026-10-22T23:30:00Z',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));assert.equal(date,'20:30');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
  await page.screenshot({path:path.join(root,'tests/i18n-mobile.png'),fullPage:true});
  await page.goto(base+'/definir-senha.html');await page.waitForSelector('.oraqui-languages');
  await page.waitForFunction(()=>document.querySelector('#textoErroConvite').textContent.includes('invito'));
  assert.match(await page.locator('#textoErroConvite').innerText(),/Questo indirizzo/);
  await page.getByRole('button',{name:'Português (Brasil)',exact:true}).click();assert.match(await page.locator('#textoErroConvite').innerText(),/Este endereço/);
  // Re-render integration and raw data are explicit: a person's name must survive locale changes.
  await page.evaluate(()=>{document.querySelector('#conteudo').style.display='block';I18n.bindText(document.querySelector('#usuarioNome'),'Crie sua senha');alternarSenha('senha',document.querySelector('.mostrar'));I18n.setLocale('it-IT')});
  assert.equal(await page.locator('#usuarioNome').innerText(),'Crie sua senha');
  assert.equal(await page.locator('.mostrar').first().getAttribute('aria-label'),'Nascondi password');
  await page.evaluate(()=>{mostrarMensagem(I18n.ui('As duas senhas não são iguais.'),'erro');limparMensagem();I18n.setLocale('pt-BR')});
  assert.equal(await page.locator('#mensagem').textContent(),'');
  // Real SW lifecycle, offline reload and localized unavailable route; no Auth or database writes.
  await page.goto(base+'/index.html');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await page.evaluate(()=>I18n.setLocale('it-IT'));
  await context.setOffline(true);await page.reload();await page.waitForSelector('.oraqui-languages');
  assert.equal(await page.locator('.login-title').innerText(),'Benvenuto su OraQui');assert.match(await page.locator('#loginMessage').innerText(),/Connessione Internet assente/);
  await page.goto(base+'/never-cached.html');await page.waitForSelector('.oraqui-languages');assert.match(await page.locator('body').innerText(),/Questa pagina non è ancora disponibile offline/);
  await context.setOffline(false);
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/index.html');await page.waitForSelector('.oraqui-languages');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  await context.close();
  const privateContext=await browser.newContext();await privateContext.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'application/javascript',body:sdk}));
  await privateContext.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}));
  const privatePage=await privateContext.newPage();await privatePage.goto(base+'/index.html');await privatePage.getByRole('button',{name:'Italiano',exact:true}).click();assert.equal(await privatePage.locator('html').getAttribute('lang'),'it-IT');await privateContext.close();
  console.log('PASS syntax all root HTML; desktop/mobile; live states; safe errors; raw data; credentials; per-user/device persistence; fallback; timezone; private storage; real SW install and offline reload/fallback');
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
