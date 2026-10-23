import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../colaborador.html',import.meta.url),'utf8');
const slice=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const capture=slice('function capturarSelfiePonto(tipo){','let pontoEmRegistro=false;');
const record=slice('let pontoTentativa=null;','function dataLocalRegistro');
const send=slice('const pontosEmEnvio=new Map();','async function sincronizarFilaOffline()');
const tick=()=>new Promise(r=>setImmediate(r));
class Element{
 constructor(tag){this.tag=tag;this.style={};this.children=[];this.events={};this.disabled=false;this.classList={remove(){}};}
 append(...els){this.children.push(...els);} appendChild(el){this.append(el);} setAttribute(){} focus(){} click(){} remove(){this.removed=true;}
 addEventListener(name,fn){this.events[name]=fn;} removeEventListener(){}
}
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
const body=new Element('body');
let imageMode='ok',imageResolvers=[];
class ImageMock{naturalWidth=100;naturalHeight=100;set src(v){if(imageMode==='delay')imageResolvers.push(()=>this.onload());else queueMicrotask(()=>imageMode==='bad'?this.onerror():this.onload());}}
let now='2026-10-23T13:00:00.000Z';class Clock extends Date{constructor(...a){super(...(a.length?a:[now]));}}
const ctx={document:{body,createElement:t=>new Element(t),addEventListener(){},removeEventListener(){}},Image:ImageMock,Date:Clock,
 URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},etiquetasPonto:{entrada:'Entrada',inicio_intervalo:'Intervalo',fim_intervalo:'Retorno',saida:'Saída'},
 colaborador:{id:7,condominio_id:1,ponto_ativo:true,selfie_ponto_obrigatoria:true},console:{error(){},warn(){}},$:el};
vm.createContext(ctx);vm.runInContext(capture,ctx);
function dialog(){const overlay=body.children.at(-1),card=overlay.children[0];return {overlay,card,input:card.children.find(x=>x.tag==='input'),buttons:card.children.filter(x=>x.tag==='button')};}
const file={type:'image/jpeg',size:123};
let settled=false;let p=ctx.capturarSelfiePonto('entrada');p.then(()=>settled=true,()=>settled=true);
let d=dialog();assert(!settled);d.input.events.cancel();await tick();assert(!settled,'native cancel must not submit');
d.input.files=[];await d.input.events.change();assert(!settled);
d.input.files=[{type:'text/plain',size:10}];await d.input.events.change();assert(!settled);
d.input.files=[{type:'image/jpeg',size:0}];await d.input.events.change();assert(!settled);
imageMode='bad';d.input.files=[file];await d.input.events.change();assert(!settled,'invalid image bytes do not submit');
imageMode='delay';d.input.files=[file];const first=d.input.events.change();now='2026-10-23T13:00:02.000Z';d.input.files=[file];const second=d.input.events.change();
imageResolvers.splice(0).forEach(f=>f());await Promise.all([first,second]);const captured=await p;
assert.equal(captured.capturadoEm,now);assert.equal(captured.arquivo,file);assert(d.overlay.removed);
p=ctx.capturarSelfiePonto('entrada');d=dialog();d.buttons.at(-1).onclick();await assert.rejects(p,/cancelada/);
ctx.colaborador.selfie_ponto_obrigatoria=false;p=ctx.capturarSelfiePonto('saida');d=dialog();assert.match(d.buttons[1].textContent,/SEM SELFIE/);d.buttons[1].onclick();assert.equal((await p).arquivo,null);
ctx.colaborador.selfie_ponto_obrigatoria=true;
let captures=0,sends=0,queues=[],messages=[],errors=[],uuid=0,geoFail=false,sendFail=false,unlocked=true,resolveSend;
Object.assign(ctx,{pontoEmRegistro:false,navigator:{onLine:true},window:{OraquiOffline:{unlocked:()=>unlocked}},crypto:{randomUUID:()=>`id-${++uuid}`},authUser:{id:'u'},pontosHoje:[],escalaHoje:{id:3},
 moduloLiberado:()=>true,proximaBatidaPonto:()=> 'entrada',confirm:()=>true,alert:m=>errors.push(m),renderPonto(){},
 capturarSelfiePonto:async()=>{captures++;return{arquivo:file,capturadoEm:now};},
 obterLocalizacao:async()=>{if(geoFail)throw Error('GPS obrigatório');return{latitude:1,longitude:2,precisao_metros:4};},
 filaSalvar:async item=>queues.push({...item}),enviarPontoPendente:async item=>{sends++;if(sendFail)throw Error('Rede');if(resolveSend)await new Promise(r=>resolveSend=r);return{registrado_em:item.capturado_em};},
 toast:m=>messages.push(m),erro:m=>errors.push(m),horaPontoBrasilia:t=>t,carregarTudo:async()=>{},atualizarEstadoOffline:async()=>{}});
vm.runInContext(record,ctx);
// Double tap while capture/GPS/send is running must share the single intent.
resolveSend=true;p=ctx.registrarPonto('entrada');await tick();await ctx.registrarPonto('entrada');assert.equal(sends,1);resolveSend();resolveSend=null;await p;assert.equal(captures,1);
for(const tipo of Object.keys(ctx.etiquetasPonto)){await ctx.registrarPonto(tipo);}assert.equal(sends,5);
geoFail=true;const before=sends;await ctx.registrarPonto('entrada');assert.equal(sends,before);assert.match(errors.at(-1),/TENTAR NOVAMENTE.*GPS/);
const draft=vm.runInContext('pontoTentativa',ctx);const savedTime=draft.capturado_em,saveId=draft.client_id;now='2026-10-23T13:03:00.000Z';geoFail=false;sendFail=true;
await ctx.registrarPonto('entrada');assert.equal(vm.runInContext('pontoTentativa.client_id',ctx),saveId);assert.equal(vm.runInContext('pontoTentativa.capturado_em',ctx),savedTime);
ctx.colaborador={...ctx.colaborador,condominio_id:2};const count=sends;await ctx.registrarPonto('entrada');assert.equal(sends,count,'cannot retry under another condominium');ctx.colaborador.condominio_id=1;
sendFail=false;await ctx.registrarPonto('entrada');assert.equal(vm.runInContext('pontoTentativa',ctx),null);
ctx.navigator.onLine=false;await ctx.registrarPonto('entrada');assert.equal(queues.length,1);assert.match(messages.at(-1),/Aguardando sincronização/);assert.equal(ctx.pontosHoje.length,1);
unlocked=false;const caps=captures;await ctx.registrarPonto('saida');assert.equal(captures,caps,'offline requires PIN');
ctx.navigator.onLine=true;ctx.capturarSelfiePonto=async()=>{throw Error('Cancelada');};const sent=sends;await ctx.registrarPonto('entrada');assert.equal(sends,sent);
// Exercise real sender, including response loss, concurrent reconnection and private upload conflict.
let stored=null,inserts=0,uploads=0,deleted=0,invoke=0,failResponse=true,uploadError=null,downloadOK=true,permissions=true;
Object.assign(ctx,{exigirModulo(){if(!permissions)throw Error('desativado');},filaExcluir:async()=>deleted++,filaSalvar:async item=>{assert.equal(item.foto,null,'online without PIN never persists plaintext image');},
 db:{from(){let inserting=false,payload;const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:stored,error:null}),insert(x){inserting=true;payload=x;return q;},single:async()=>{assert(inserting);inserts++;stored={id:99,registrado_em:payload.horario_capturado_em,offline_client_id:payload.offline_client_id,tipo:payload.tipo};if(failResponse)return{error:Error('response lost')};return{data:stored};}};return q;},
 storage:{from:bucket=>{assert.equal(bucket,'selfies-ponto-privadas');return{upload:async()=>{uploads++;return{error:uploadError};},download:async()=>downloadOK?{data:{size:10}}:{error:Error('denied')}};}},
 functions:{invoke:async()=>{invoke++;return{data:{ok:true,registrado_em:now}};}}}});
vm.runInContext(send,ctx);
const item={id:'ponto-x',client_id:'x',auth_user_id:'u',condominio_id:1,colaborador_id:7,tipo:'entrada',escala_id:3,capturado_em:savedTime,selfie_path:'1/7/x.jpg',foto:file,online_confirmado:true};
const s1=ctx.enviarPontoPendente(item),s2=ctx.enviarPontoPendente(item);assert.equal(s1,s2);await assert.rejects(s1,/response lost/);assert.equal(inserts,1);await ctx.enviarPontoPendente(item);assert.equal(inserts,1);assert.equal(uploads,1);assert.equal(deleted,1);
stored=null;failResponse=false;uploadError={statusCode:409};await ctx.enviarPontoPendente(item);assert.equal(inserts,2);
stored=null;downloadOK=false;await assert.rejects(ctx.enviarPontoPendente(item),/verificar/);assert.equal(inserts,2);
uploadError=null;downloadOK=true;await ctx.enviarPontoPendente({...item,online_confirmado:false});assert.equal(invoke,1);
permissions=false;await assert.rejects(ctx.enviarPontoPendente(item),/desativado/);permissions=true;
await assert.rejects(ctx.enviarPontoPendente({...item,condominio_id:2}),/outra conta/);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
console.log('PASS native cancellation, invalid images, two successive photos, confirmation timestamp, optional selfie, all four types, double tap, denied GPS/retry, identity isolation, PIN offline queue, shared reconnect send, lost response, upload conflict, sync, module permissions, script syntax');
