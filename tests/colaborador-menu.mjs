import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import path from 'node:path';import {fileURLToPath} from 'node:url';
const {parseHTML}=await import(process.env.LINKEDOM_WORKER||'linkedom/worker');
const html=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'../colaborador.html'),'utf8');
const {document,HTMLElement}=parseHTML(html);HTMLElement.prototype.scrollIntoView=function(){};
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
const ctx={document,console,location:{href:''},MutationObserver:class{observe(){}},colaborador:{condominio_id:99},programacoes:[],execucoesHoje:[],demandas:[],programacaoValeHoje:()=>false,mesmoId:(a,b)=>a===b,pesoProgramacao:()=>0,minutosHorario:()=>0,demandaConcluidaHoje:()=>false,htmlDemanda:()=>'',vazio:()=>'',setTimeout(){},abrirExecucao:async(...args)=>{ctx.registrou=true;ctx.argsRegistro=args}};ctx.window=ctx;ctx.$=id=>document.getElementById(id);vm.createContext(ctx);
vm.runInContext(html.split('/* COLABORADOR_MENU_INICIO */')[1].split('/* COLABORADOR_MENU_FIM */')[0],ctx);
vm.runInContext(html.slice(html.indexOf('(function configurarNavegacaoInferior(){'),html.indexOf('\niniciar();',html.indexOf('(function configurarNavegacaoInferior(){'))),ctx);
assert.equal(document.querySelectorAll('.colaborador-secao-ativa').length,0);
for(const id of ['navDemandas','navCronograma','navDocumentos','navChat','navRegistrar']){const el=ctx.$(id);assert(el.getAttribute('aria-label'));assert(el.getAttribute('title'));assert(el.querySelector('svg'));}
ctx.$('navDemandas').click();assert(ctx.$('secaoDemandas').classList.contains('colaborador-secao-ativa'));
ctx.$('navCronograma').click();assert(!ctx.$('secaoDemandas').classList.contains('colaborador-secao-ativa'));assert(ctx.$('atividadesProgramadasSection').classList.contains('colaborador-secao-ativa'));
ctx.mostrarSecaoColaborador('pontoSection');assert(!ctx.$('pontoSection').classList.contains('colaborador-secao-ativa'));
ctx.$('navPonto').hidden=false;ctx.$('navPonto').click();assert(ctx.$('pontoSection').classList.contains('colaborador-secao-ativa'));
ctx.$('navChat').click();assert.equal(ctx.location.href,'chat.html?condominio_id=99');ctx.$('navDocumentos').click();assert.equal(ctx.location.href,'documentos-colaborador.html');
ctx.programacoes=[{id:1},{id:2}];ctx.programacaoValeHoje=()=>true;ctx.$('navRegistrar').click();await Promise.resolve();assert(ctx.registrou);assert.equal(ctx.argsRegistro.length,0,'registrar always starts an avulsa, even with pending programs');
vm.runInContext(html.slice(html.indexOf('function renderDemandas(){'),html.indexOf('\nfunction abrirConclusaoDemanda',html.indexOf('function renderDemandas(){'))),ctx);
ctx.demandas=[{id:1,tipo:'urgente',status:'pendente'}];ctx.recolherColaborador();ctx.renderDemandas();assert(ctx.$('navDemandas').classList.contains('oraqui-tem-urgencia'));assert.equal(ctx.$('navDemandasBadge').textContent,'1');assert.equal(document.querySelectorAll('.colaborador-secao-ativa').length,0,'urgent icon does not auto-open content');
ctx.demandas[0].status='concluida';ctx.renderDemandas();assert(!ctx.$('navDemandas').classList.contains('oraqui-tem-urgencia'));assert.equal(ctx.$('navDemandasBadge').hidden,true);
ctx.$('colaboradorInicio').click();assert.equal(document.querySelectorAll('.colaborador-secao-ativa').length,0);
// Exercise the actual form opener with choices and before/after inputs.
ctx.areas=[{id:10,nome:'Torre A'}];ctx.pontos=[{id:20,area_id:10,nome:'Hall'}];ctx.atividades=[];ctx.execAtual=null;ctx.avulsaAtualId=null;ctx.limparPreviaAntes=()=>{};ctx.obterAvulsaAbertaDisponivel=async()=>null;ctx.atualizarBlocoInicio=()=>{};ctx.nomeLocal=()=> 'Torre A • Hall';ctx.esc=v=>String(v??'');
vm.runInContext(html.slice(html.indexOf('async function abrirExecucao('),html.indexOf('// A fila é armazenada',html.indexOf('async function abrirExecucao('))),ctx);
await ctx.abrirExecucao();assert.equal(ctx.execAtual,null);assert(ctx.$('execModal').classList.contains('visible'));assert(!ctx.$('areaField').classList.contains('hidden'));assert(!ctx.$('pontoField').classList.contains('hidden'));assert(ctx.$('areaSelect').innerHTML.includes('Torre A'));assert(ctx.$('fotoAntesExec'));assert(ctx.$('photoInput'));assert(ctx.$('iniciarExec'));assert(ctx.$('confirmExec'));
console.log('PASS: nomes, ícones, urgência, registrar avulsa com programações pendentes, local e fotos antes/depois.');
