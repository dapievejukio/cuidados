import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const {parseHTML}=await import(process.env.LINKEDOM_WORKER||'linkedom/worker');
const html=fs.readFileSync(new URL('../colaborador.html',import.meta.url),'utf8');
const {document}=parseHTML(html);
const ctx={document,console,colaborador:{id:7,condominio_id:1,ponto_ativo:true},alert(){},fecharModal(){},fecharConclusaoDemanda(){}};
ctx.$=id=>document.getElementById(id);vm.createContext(ctx);
vm.runInContext(html.split('/* MODULOS_COLABORADOR_INICIO */')[1].split('/* MODULOS_COLABORADOR_FIM */')[0],ctx);
for(const m of ['chat','demandas','cronograma','atividades','registros_posteriores','documentos','ponto'])assert(ctx.moduloLiberado(m),'compatible default '+m);
for(const m of ['chat','demandas','cronograma','atividades','registros_posteriores','documentos'])ctx.colaborador[m+'_ativo']=false;
ctx.aplicarModulos();
for(const id of ['navChat','navDemandas','navCronograma','navRegistrar','navDocumentos'])assert(ctx.$(id).hidden,id+' hidden');
assert(!ctx.$('navPonto').hidden,'ponto-only profile keeps Ponto');
assert.throws(()=>ctx.exigirModulo('atividades'),/desativado/);
assert.equal(ctx.$('secaoDemandas').dataset.moduloBloqueado,'true');
// A queued activity must be rejected before touching database, photos or local data.
for(const name of ['enviarInicioPendente','enviarRegistroPendente']){
 const start=html.indexOf('async function '+name+'('),end=html.indexOf('\nasync function ',start+1);
 vm.runInContext(html.slice(start,end),ctx);
}
await assert.rejects(ctx.enviarInicioPendente({inicio_tipo:'demanda'}),/desativado/);
await assert.rejects(ctx.enviarInicioPendente({inicio_tipo:'programacao'}),/desativado/);
await assert.rejects(ctx.enviarRegistroPendente({payload:{}}),/desativado/);
// A different condominium link has independent flags, no global user-level cache.
ctx.colaborador={id:8,condominio_id:2,ponto_ativo:false,chat_ativo:true};ctx.aplicarModulos();
assert(!ctx.$('navChat').hidden);assert(ctx.$('navPonto').hidden);
const gestor=fs.readFileSync(new URL('../gestor.html',import.meta.url),'utf8');
assert(gestor.includes('body:{nome,email,condominio_id:CONDOMINIO_ID}'));
const {document:gd}=parseHTML(gestor);const g={document:gd,colaboradorEditandoId:null,colaboradoresCarregados:[],dependencias(){},alert(){}};
g.$=id=>gd.getElementById(id);vm.createContext(g);
for(const name of ['novoCol','editarCol']){const start=gestor.indexOf('function '+name+'('),end=gestor.indexOf('\n}',start)+2;vm.runInContext(gestor.slice(start,end),g)}
g.novoCol();assert(g.$('modulo_chat').checked);assert(!g.$('colPontoAtivo').checked);
g.colaboradoresCarregados=[{id:7,chat_ativo:false,demandas_ativo:false,ponto_ativo:true}];g.editarCol(7);
assert(!g.$('modulo_chat').checked);assert(!g.$('modulo_demandas').checked);assert(g.$('modulo_documentos').checked);assert(g.$('colPontoAtivo').checked);
console.log('PASS: defaults, cadastro, edição, Ponto-only, condomínio independente, bloqueio da fila offline e convite de gestor.');
