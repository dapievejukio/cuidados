import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../colaborador.html',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
new vm.Script(fs.readFileSync(new URL('../oraqui-offline.js',import.meta.url),'utf8'));new vm.Script(sw);
const origin='https://oraqui.app',listeners={},stores=new Map();let offline=false,failCSS=false;
const key=r=>new URL(typeof r==='string'?r:r.url,origin).pathname;
const cache={async put(r,v){stores.set(key(r),v.clone())},async match(r){return stores.get(key(r))?.clone()},async delete(r){return stores.delete(key(r))}};
class LocalRequest extends Request{constructor(r,o){super(new URL(r,origin),o)}}
const ctx={URL,Request:LocalRequest,Response,Headers,console,caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},self:{location:{origin},addEventListener:(n,f)=>listeners[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}},fetch:async r=>{
 if(offline||(failCSS&&key(r)==='/colaborador-3.css'))throw Error('offline');
 const p=key(r);let body='sdk',type='application/javascript';
 if(new URL(r.url||r,origin).origin===origin){const file=p==='/'?'/index.html':p==='/colaborador'?'/colaborador.html':p;body=fs.readFileSync(new URL('..'+file,import.meta.url));type=p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html';}
 const response=new Response(body,{headers:{'Content-Type':type}});
 if(p==='/colaborador')Object.defineProperty(response,'redirected',{value:true});return response;
}};vm.createContext(ctx);vm.runInContext(sw,ctx);
async function install(){let task;listeners.install({waitUntil:p=>task=p});await task}
failCSS=true;await assert.rejects(install());failCSS=false;await install();offline=true;
async function get(p,navigate=false){let result;listeners.fetch({request:{method:'GET',url:origin+p,mode:navigate?'navigate':'cors'},respondWith:r=>result=r});assert(result,'SW must handle '+p);return await result}
for(const p of ['/colaborador-3.css?v=20261022-6','/login-3.css?v=old','/assets/marca/oraqui-transparente.webp','/assets/gestor-3/simbolo.svg','/icon-192.png']){const r=await get(p);assert.equal(r.status,200);assert((await r.arrayBuffer()).byteLength>0)}
for(const p of ['/colaborador','/colaborador.html','/']){const r=await get(p,true);assert.equal(r.status,200);assert.equal(r.redirected,false);assert((await r.text()).includes('<!DOCTYPE html>')||(await cache.match(p).then(x=>x.text())).toLowerCase().includes('<!doctype html>'))}
stores.delete('/colaborador');assert.equal((await get('/colaborador?perfil=1',true)).status,200);
assert(!sw.includes('indexedDB.deleteDatabase'));assert(sw.includes("self.addEventListener('push'"));
console.log('PASS syntax, install failure, CSS/images offline, query strings, aliases, redirect normalization, push preserved');
// Actual offline entry and permission functions with a small DOM test double.
const elements=new Map();function el(id){if(!elements.has(id)){const classes=new Set(['hidden']);elements.set(id,{hidden:true,dataset:{},style:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,b)=>b?classes.add(x):classes.delete(x)}})}return elements.get(id)}
let renders=0;const snapshot={user:{id:'u'},colaborador:{id:9,condominio_id:1,nome:'Usuário Teste',matricula:'9999',ponto_ativo:true,chat_ativo:false,documentos_ativo:false},condominio:{nome:'Reserva Igara'}};
const ui={$:el,console,alert:m=>{throw Error(m)},window:{OraquiOffline:{unlock:async()=>structuredClone(snapshot)}},filaTodos:async()=>[{kind:'ponto',client_id:'p1',auth_user_id:'u',condominio_id:1,colaborador_id:9,tipo:'entrada',capturado_em:new Date().toISOString()}],versaoCarregamento:0,recolherColaborador(){},carregarIniciosDemandasLocais:async()=>{},renderEscala(){},renderPonto(){renders++},renderDemandas(){},renderProgramacoes(){},renderHistorico(){},carregarAvulsaPendente:async()=>{},atualizarEstadoOffline:async()=>{},toast(){},fecharModal(){},fecharConclusaoDemanda(){}};
vm.createContext(ui);vm.runInContext('let authUser,colaborador,condominio,MODO_OFFLINE,areas,pontos,atividades,programacoes,demandas,escalaHoje,pontosHoje,execucoesHoje;',ui);
vm.runInContext(html.split('/* MODULOS_COLABORADOR_INICIO */')[1].split('/* MODULOS_COLABORADOR_FIM */')[0],ui);
vm.runInContext(html.slice(html.indexOf('async function entrarOffline(){'),html.indexOf('\nasync function iniciar(){')),ui);
await ui.entrarOffline();assert.equal(el('navPonto').hidden,false);assert.equal(el('pontoSection').classList.contains('hidden'),false);assert.equal(el('navChat').hidden,true);assert.equal(el('navDocumentos').hidden,true);assert.equal(renders,1);
await ui.entrarOffline();assert.equal(vm.runInContext('pontosHoje.length',ui),1);snapshot.colaborador.ponto_ativo=false;await ui.entrarOffline();assert.equal(el('navPonto').hidden,true);assert(el('pontoSection').classList.contains('hidden'));
console.log('PASS offline entry, Ponto visibility, forbidden modules, single render, repeated entry, permission revocation');
// Exercise the real point handler: selfie/GPS are preserved in the queued record.
Object.assign(ui,{navigator:{onLine:false},crypto:globalThis.crypto,confirm:()=>true,pontoEmRegistro:false,etiquetasPonto:{entrada:'Entrada',inicio_intervalo:'Intervalo',fim_intervalo:'Retorno',saida:'Saída'},dataPontoBrasilia:v=>new Date(v).toISOString().slice(0,10),horaPontoBrasilia:()=> '12:00',capturarSelfiePonto:async()=>({arquivo:new Blob(['selfie'],{type:'image/jpeg'}),capturadoEm:new Date().toISOString()}),obterLocalizacao:async()=>({latitude:-30,longitude:-51,precisao_metros:10})});
ui.window.OraquiOffline.unlocked=()=>true;
const queued=[];ui.filaSalvar=async item=>queued.push(item);
snapshot.colaborador.ponto_ativo=true;snapshot.colaborador.selfie_ponto_obrigatoria=true;snapshot.colaborador.geolocalizacao_ponto_obrigatoria=true;snapshot.colaborador.intervalo_ativo=true;
await ui.entrarOffline();vm.runInContext('pontosHoje=[]',ui);
vm.runInContext(html.slice(html.indexOf('function proximaBatidaPonto(){'),html.indexOf('\nasync function obterLocalizacao')),ui);
vm.runInContext(html.slice(html.indexOf('let pontoTentativa=null;'),html.indexOf('\nfunction dataLocalRegistro')),ui);
ui.renderPonto();assert.equal(el('btnPontoPrincipal').dataset.tipo,'entrada');
for(const tipo of ['entrada','inicio_intervalo','fim_intervalo','saida']){await ui.registrarPonto(tipo);assert.equal(queued.at(-1).tipo,tipo);assert.equal(queued.at(-1).foto.type,'image/jpeg');assert.equal(queued.at(-1).latitude,-30);assert.equal(queued.at(-1).auth_user_id,'u');}
assert.equal(queued.length,4);assert.equal(el('btnPontoPrincipal').disabled,true);assert.equal(ui.pontoEmRegistro,false);
console.log('PASS full offline point sequence, button states, selfie + GPS queued, account binding');
