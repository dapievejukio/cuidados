import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const {parseHTML}=await import(process.env.LINKEDOM_WORKER||'linkedom/worker');
const html=fs.readFileSync(new URL('../chat.html',import.meta.url),'utf8');
const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const db='));new vm.Script(script);
async function fixture(search,{user={id:'gestor-1'},autorizado=true}={}){
 const {document}=parseHTML(html),select=document.getElementById('contato');let valor='';Object.defineProperty(select,'value',{get:()=>valor,set:v=>valor=String(v)});
 const gravados=[],calls=[];
 const db={auth:{getUser:async()=>({data:{user},error:null})},rpc:async(name,args)=>{calls.push({name,args});return {data:name==='oraqui_chat_listar_contatos'?[{usuario_id:'pessoa-2',nome:'Ana',tipo:'colaborador'}]:autorizado,error:null}},from(t){let payload;const q={select(){return q},eq(k,v){assert.equal(k,'condominio_id');assert.equal(v,6);return q},or(){return q},order(){return q},limit(){return q},single:async()=>({data:{nome:'Reserva Clube Gravataí'},error:null}),insert(p){payload=p;return q},then(resolve){if(payload)gravados.push(payload);resolve({data:[],error:null})}};if(t==='condominios')q.eq=()=>q;return q}};
 const ctx={document,URLSearchParams,location:{search},console,navigator:{},setInterval(){return 1},clearInterval(){},supabase:{createClient:()=>db}};ctx.window=ctx;vm.createContext(ctx);await vm.runInContext(script,ctx);return{document,ctx,gravados,calls};
}
let f=await fixture('');assert.match(f.document.getElementById('status').textContent,/Abra o chat pelo painel/);assert(!f.document.getElementById('contato').textContent.includes('Carregando'));assert(f.document.getElementById('enviar').disabled);assert.equal(f.calls.length,0);
f=await fixture('?condominio_id=6',{user:null});assert.match(f.document.getElementById('status').textContent,/Entre no ORAQUI/);assert(f.document.getElementById('texto').disabled);
f=await fixture('?condominio_id=6',{autorizado:false});assert.match(f.document.getElementById('status').textContent,/acesso não autorizado/);assert(f.document.getElementById('gravarAudio').disabled);
f=await fixture('?condominio_id=6&voltar=colaborador.html');const $=id=>f.document.getElementById(id);assert.equal($('voltarPainel').getAttribute('href'),'colaborador.html');assert.equal($('contato').disabled,false);assert($('enviar').disabled);assert.equal($('titulo').textContent,'Reserva Clube Gravataí');
$('contato').value='pessoa-2';$('contato').onchange();for(let i=0;i<10;i++)await Promise.resolve();assert.equal($('enviar').disabled,false);assert.equal($('gravarAudio').disabled,false);$('texto').value='Teste local';await $('enviar').onclick();assert.equal(f.gravados.length,1);assert.deepEqual(JSON.parse(JSON.stringify(f.gravados[0])),{condominio_id:6,remetente:'gestor-1',destinatario:'pessoa-2',mensagem:'Teste local'});assert.equal($('texto').value,'');
$('contato').value='';$('contato').onchange();assert($('enviar').disabled);assert.match($('mensagens').textContent,/Escolha uma conversa/);
console.log('PASS: syntax, missing context, login/access errors, contact selection, back destination and text sending with mocked API.');
