import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const {parseHTML}=await import(process.env.LINKEDOM_WORKER||'linkedom/worker');
const html=fs.readFileSync(new URL('../gestor.html',import.meta.url),'utf8');
for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const source=html.match(/\/\/ Resumo de ponto da página inicial\.[\s\S]*?\/\/ Fim do resumo de ponto da página inicial\./)[0];
const {document}=parseHTML(html);
const $=id=>document.getElementById(id);
let instante='2026-10-23T13:00:00Z',registros=[],pessoas=[],falha=false,adiar=null;
class Relogio extends Date{constructor(...args){super(...(args.length?args:[instante]))}}
const consultas=[];
const db={from(tabela){
 const filtros=[],pagina=[];
 const q={select(){return q},eq(...v){filtros.push(['eq',...v]);return q},gte(...v){filtros.push(['gte',...v]);return q},lt(...v){filtros.push(['lt',...v]);return q},order(){return q},range(...v){pagina.push(...v);return q},async then(resolve,reject){
  try{
   consultas.push({tabela,filtros,pagina});
   if(adiar){const esperar=adiar;adiar=null;await esperar}
   if(falha)return resolve({data:null,error:new Error('Falha simulada')});
   let dados=(tabela==='registros_ponto'?registros:pessoas).filter(r=>filtros.every(([op,k,v])=>op==='eq'?String(r[k])===String(v):op==='gte'?new Date(r[k])>=new Date(v):new Date(r[k])<new Date(v)));
   if(pagina.length)dados=dados.slice(pagina[0],pagina[1]+1);
   resolve({data:dados,error:null});
  }catch(e){reject(e)}
 }};return q;
}};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const ctx={document,$,db,Date:Relogio,Intl,Map,console:{warn(){}},esc,perfilGestor:{perfil:'admin_cliente'},CONDOMINIO_ID:6};
vm.createContext(ctx);vm.runInContext(source,ctx);
const condo={id:6,slug:'reserva-clube-gravatai',ambiente_demo:false};
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
function seed(){pessoas=[1,2,3,4,5].map(id=>({id,condominio_id:6,ativo:true,nome:id===1?'<Ana & equipe>':'Pessoa '+id}));pessoas.push({id:6,condominio_id:6,ativo:true,nome:'Pessoa 6'},{id:7,condominio_id:6,ativo:false,nome:'Inativo'});registros=pessoas.filter(p=>p.id<=5).map(p=>({id:p.id,colaborador_id:p.id,condominio_id:6,tipo:'entrada',registrado_em:'2026-10-23T10:00:00Z'}));}
seed();
registros.push({id:10,colaborador_id:1,condominio_id:6,tipo:'inicio_intervalo',registrado_em:'2026-10-23T12:00:00Z',origem:'offline'},
 {id:11,colaborador_id:2,condominio_id:1,tipo:'entrada',registrado_em:'2026-10-23T11:00:00Z'},
 {id:13,colaborador_id:7,condominio_id:6,tipo:'entrada',registrado_em:'2026-10-23T10:00:00Z'},
 {id:12,colaborador_id:6,condominio_id:6,tipo:'entrada',registrado_em:'2026-10-23T02:59:59Z'});
ctx.iniciarResumoPontoGestor(condo);await settle();
assert.equal($('gestorPontoHoje').hidden,false);
assert.match($('pontoHojeContagem').textContent,/5 de 6/);
assert.equal($('pontoHojePessoas').querySelectorAll('li').length,5);
assert.match($('pontoHojePessoas').textContent,/Chegada às 07:00/);
assert.match($('pontoHojePessoas').textContent,/Início do intervalo às 09:00/);
assert.match($('pontoHojePessoas').textContent,/Offline, conferir horário/);
assert.equal($('pontoHojePessoas').querySelector('ana'),null,'names are escaped');
// A second entry after lunch must not replace the arrival time; no entry must not invent one.
registros.push({id:20,colaborador_id:1,condominio_id:6,tipo:'entrada',registrado_em:'2026-10-23T12:30:00Z'},
 {id:21,colaborador_id:2,condominio_id:6,tipo:'saida',registrado_em:'2026-10-23T13:00:00Z'});
registros=registros.filter(r=>r.colaborador_id!==2||r.tipo!=='entrada');
await ctx.atualizarResumoPontoGestor();
const itens=$('pontoHojePessoas').querySelectorAll('li');
assert.match(itens[0].textContent,/Chegada às 07:00/);
assert.match(itens[0].textContent,/Última: Entrada às 09:30/);
assert.match(itens[1].textContent,/Entrada não registrada hoje/);
assert.match(itens[1].textContent,/Última: Saída às 10:00/);
assert.equal(ctx.diaPontoHome(new Date('2026-10-24T02:59:59Z')),'2026-10-23');
assert.equal(ctx.diaPontoHome(new Date('2026-10-24T03:00:00Z')),'2026-10-24');
assert(consultas.every(c=>c.filtros.some(f=>f[1]==='condominio_id'&&f[2]===6)));
registros=[];await ctx.atualizarResumoPontoGestor();assert.match($('pontoHojeContagem').textContent,/0 de 6/);
falha=true;await ctx.atualizarResumoPontoGestor();assert.equal($('pontoHojeContagem').textContent,'Ponto de hoje indisponível');assert.equal($('pontoHojePessoas').children.length,0);falha=false;
seed();registros=Array.from({length:1001},(_,i)=>({...registros[i%5],id:i+1}));
const antes=consultas.length;await ctx.atualizarResumoPontoGestor();
assert.equal(consultas.slice(antes).filter(q=>q.tabela==='registros_ponto').length,3,'reads every page');
assert.match($('pontoHojeContagem').textContent,/5 de 6/);
// Leaving and re-entering the same condo invalidates its previous pending request.
let liberar;adiar=new Promise(resolve=>liberar=resolve);
const pendente=ctx.atualizarResumoPontoGestor();
ctx.CONDOMINIO_ID=1;ctx.iniciarResumoPontoGestor({id:1,slug:'reserva-igara'});
assert.equal($('gestorPontoHoje').hidden,false);assert.equal($('pontoHojePessoas').children.length,0);
ctx.CONDOMINIO_ID=6;registros=[];ctx.iniciarResumoPontoGestor(condo);await settle();liberar();await pendente;
assert.match($('pontoHojeContagem').textContent,/0 de 6/);
// Every condo uses its own current active roster, including empty rosters.
pessoas=[{id:90,condominio_id:1,ativo:true,nome:'Equipe Igara'},{id:91,condominio_id:1,ativo:false,nome:'Inativo Igara'}];
registros=[{id:100,colaborador_id:90,condominio_id:1,tipo:'entrada',registrado_em:'2026-10-23T10:15:00Z'}];
ctx.CONDOMINIO_ID=1;ctx.iniciarResumoPontoGestor({id:1,slug:'reserva-igara'});await settle();
assert.match($('pontoHojeContagem').textContent,/1 de 1 colaboradores ativos/);
assert.match($('pontoHojePessoas').textContent,/Equipe Igara/);
assert.match($('pontoHojePessoas').textContent,/Chegada às 07:15/);
pessoas[0].ativo=false;await ctx.atualizarResumoPontoGestor();
assert.equal($('pontoHojeContagem').textContent,'Nenhum colaborador ativo cadastrado');assert.equal($('pontoHojePessoas').children.length,0);
pessoas=Array.from({length:1001},(_,i)=>({id:i+1,condominio_id:1,ativo:true,nome:'Colaborador '+i}));
const consultasAntes=consultas.length;await ctx.atualizarResumoPontoGestor();
assert.match($('pontoHojeContagem').textContent,/1 de 1001/);
assert.equal(consultas.slice(consultasAntes).filter(q=>q.tabela==='colaboradores').length,3);
assert(consultas.filter(q=>q.tabela==='colaboradores').every(q=>q.filtros.some(f=>f[1]==='ativo'&&f[2]===true)));
console.log('PASS: all condos, dynamic active rosters, inactive exclusion, arrival, latest punch, timezone, pagination, errors and stale requests.');
