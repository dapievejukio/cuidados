import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const storage = new Map(), events = {}, elements = [];
const element=()=>{const node={isConnected:true,textContent:'',attributes:{},setAttribute(k,v){this.attributes[k]=v}};elements.push(node);return node};
const staticNode=element();staticNode.dataset={i18n:'Crie sua senha'};
const context={Intl,Date,Map,Set,Object,console,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},dispatchEvent(){},addEventListener(n,f){events[n]=f},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{documentElement:{},addEventListener(){},querySelectorAll:selector=>selector==='[data-i18n]'?[staticNode]:[]}};
vm.createContext(context);
for(const file of ['pt-BR.js','it-IT.js','i18n.js'])vm.runInContext(fs.readFileSync(new URL('../assets/i18n/'+file,import.meta.url),'utf8'),context);
const i=context.I18n;
assert.equal(i.locale,'pt-BR');i.apply();assert.equal(staticNode.textContent,'Crie sua senha');
const status=element();i.bindText(status,i.ui('As duas senhas não são iguais.'));i.setLocale('it-IT');assert.equal(status.textContent,'Le due password non coincidono.');assert.equal(staticNode.textContent,'Crea la tua password');
i.bindText(staticNode,'Crie sua senha');i.apply();i.setLocale('pt-BR');i.setLocale('it-IT');assert.equal(staticNode.textContent,'Crie sua senha','raw user data is never a lookup key');
i.bindText(status,'');i.setLocale('pt-BR');assert.equal(status.textContent,'','cleared messages stay cleared');
i.setUser('a');i.setLocale('it-IT');i.setUser('b');i.setLocale('pt-BR');i.setUser('a');assert.equal(i.locale,'it-IT');assert.equal(storage.get('oraqui:locale:user:b'),'pt-BR');
assert.equal(i.setLocale('fr-FR'),false);assert.equal(i.locale,'it-IT');
context.ORAQUI_CATALOGS['pt-BR']['missing.it']='Português';assert.equal(i.t('missing.it'),'Português');assert.equal(i.t('missing.everywhere'),'missing.everywhere');assert.equal(i.t('toString'),'toString');
assert.match(String(i.serverError({code:'invalid_credentials',message:'private data'},'Não foi possível entrar.')),/non corretti/);
assert.equal(String(i.serverError({code:'toString',message:'private data'},'Não foi possível entrar.')),'Impossibile accedere.');
assert.equal(i.date('2026-10-22T23:30:00Z',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),'20:30');
context.localStorage.getItem=()=>{throw Error('private mode')};context.localStorage.setItem=()=>{throw Error('private mode')};assert.doesNotThrow(()=>i.setLocale('pt-BR'));
events.storage({key:'oraqui:locale:device',newValue:'it-IT'});assert.equal(i.locale,'it-IT');
const attribute=element();i.bindAttribute(attribute,'aria-label',i.ui('Mostrar senha'));i.setLocale('pt-BR');assert.equal(attribute.attributes['aria-label'],'Mostrar senha');i.setLocale('it-IT');assert.equal(attribute.attributes['aria-label'],'Mostra password');
delete context.ORAQUI_CATALOGS['pt-BR']['missing.it'];
// Catalog parity and every explicit reference in integrated pages must have an Italian translation.
assert.deepEqual(Object.keys(context.ORAQUI_CATALOGS['pt-BR']).sort(),Object.keys(context.ORAQUI_CATALOGS['it-IT']).sort());
for(const filename of ['index.html','definir-senha.html']){
 const source=fs.readFileSync(new URL('../'+filename,import.meta.url),'utf8');
 for(const match of source.matchAll(/(?:I18n\.ui\(|data-i18n(?:-[\w-]+)?=)("[^"]+")/g))assert.ok(Object.hasOwn(context.ORAQUI_CATALOGS['it-IT'],JSON.parse(match[1])),filename+': '+match[1]);
 for(const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]);
}
console.log('PASS catalogs, live dynamic/static state, re-render precedence, names/inputs untouched, per-user and device persistence, fallback, safe server codes, timezone, storage unavailable, cross-tab changes, accessibility attributes, syntax');
