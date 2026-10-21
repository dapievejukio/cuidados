import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {parseHTML}=await import(process.env.LINKEDOM_WORKER||'linkedom/worker');
const html=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'../gestor.html'),'utf8');
const {document,HTMLElement,Event}=parseHTML(html);
HTMLElement.prototype.scrollIntoView=function(){};
// LinkeDOM has no native details.open implementation.
for(const el of document.querySelectorAll('details'))Object.defineProperty(el,'open',{get(){return this.hasAttribute('open')},set(v){this.toggleAttribute('open',!!v)}});
const query=new Proxy(function(){},{get:(_,key)=>key==='then'?resolve=>resolve({data:[],error:null}):()=>query,apply:()=>query});
const ctx={document,console,URLSearchParams,Date,Intl,Event,location:{search:''},navigator:{},sessionStorage:{setItem(){},getItem(){return null}},setInterval(){},setTimeout(){},alert(){},scrollTo(){},supabase:{createClient:()=>({from:()=>query,auth:{getSession:async()=>({data:{session:null}})}})}};
ctx.window=ctx;vm.createContext(ctx);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],ctx);
await Promise.resolve();
assert.equal(document.querySelectorAll('.panel.active').length,0,'home has no open panel');
assert.equal(document.querySelectorAll('.hub-card[open],.gestor-resumo[open]').length,0,'all menus start closed');
assert([...document.querySelectorAll('.oraqui-collapse-title')].every(el=>el.getAttribute('aria-expanded')==='false'));
// Exercise real navigation handlers without backend reads.
vm.runInContext('carregarOcorrencias=carregarColaboradores=carregarGestores=carregarConfig=carregarRegistrosPosteriores=carregarAP=async()=>{};',ctx);
function click(action){const el=document.querySelector('[data-oraqui-action="'+action+'"]');assert(el,action+' button exists');el.click()}
function visibleSection(id){const el=document.getElementById(id);assert(el.closest('.panel').classList.contains('active'));let sec=el.closest('.section');while(sec){assert(!sec.classList.contains('oraqui-collapsed'),id+' expanded');assert.equal(sec.querySelector(':scope > .section-title').getAttribute('aria-expanded'),'true');sec=sec.parentElement?.closest('.section')}}
for(const [action,id] of Object.entries({operacao:'locationList',ponto:'oraquiPontoRelatorio',ultimos:'activityContainer','operacao-hoje':'towerName',equipe:'collaboratorList',gestores:'managementList',ocorrencias:'occurrenceList',demandas:'demandasDiretasGestor',posteriores:'rpLista',areas:'configAreas',atividades:'configAtividades'})){
 click(action);visibleSection(id);ctx.recolherTudoGestor();assert.equal(document.querySelectorAll('.panel.active').length,0);
}
click('operacao');click('ponto');assert(document.getElementById('locationList').closest('.section').classList.contains('oraqui-collapsed'));
click('resumo');assert.equal(document.getElementById('gestorResumoHoje').open,true);
document.getElementById('navCronograma').click();visibleSection('configProgramacoes');
const point=document.getElementById('oraquiPontoRelatorio').querySelector('.section-title');
ctx.abrirDestinoGestor('operacao','oraquiPontoRelatorio');point.click();assert.equal(point.getAttribute('aria-expanded'),'false');point.click();assert.equal(point.getAttribute('aria-expanded'),'true');
document.getElementById('gestorRecolherTudo').click();assert.equal(document.querySelectorAll('.panel.active,.hub-card[open],.gestor-resumo[open]').length,0);
// Reset is applied by the condominium-selection flow as well as initial startup.
assert.match(html,/aplicarPermissoesGestao\(\);\s*recolherTudoGestor\(\);/);
assert(document.getElementById('pushGestaoButton').closest('.hub-card'));
assert(document.getElementById('demoSwitchCard').closest('.hub-card'));
console.log('PASS: início recolhido, 12 destinos, ponto, configurações, resumo, recolher tudo, notificações e reset por condomínio.');
