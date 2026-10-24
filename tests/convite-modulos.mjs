import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../supabase/functions/convidar-colaborador/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/,''));
async function run(extra={},options={}){
 let handler,inserted=null;
 const body={nome:'Teste',email:'teste@example.invalid',matricula:'123',funcao:'Limpeza',condominio_id:1,...extra};
 const client={auth:{getUser:async()=>({data:{user:{id:'gestor'}},error:null}),admin:{listUsers:async()=>({data:{users:[{id:'conta-existente',email:body.email,email_confirmed_at:'2026-01-01'}]}})},resetPasswordForEmail:async()=>({error:null})},from(table){
  let insert=false;
  const q=new Proxy({}, {get(_,key){if(key==='then')return resolve=>{
   let data=[];
   if(table==='usuarios_gestao')data=options.denied?[]:[{perfil:'gestor',acesso_temporario:false,acesso_expira_em:null}];
   if(table==='condominios')data={id:1,nome:'Teste',ativo:true};
   if(table==='colaboradores'&&insert)data={id:7,...inserted};
   if(table==='colaboradores'&&!insert&&options.existing)data=[{id:7,auth_user_id:'conta-existente',ativo:true}];
   resolve({data,error:null});
  };return (...args)=>{if(key==='insert'){insert=true;inserted=args[0]}return q}}});return q;
 }};
 client.auth.admin.getUserById=async()=>({data:{user:{id:'conta-existente',email:body.email,email_confirmed_at:'2026-01-01'}}});
 const ctx={console,Response,Uint32Array,crypto,createClient:()=>client,Deno:{env:{get:()=> 'test'},serve(fn){handler=fn}}};vm.createContext(ctx);vm.runInContext(source,ctx);
 const response=await handler({method:'POST',headers:{get:()=> 'Bearer test'},json:async()=>body});
 return {status:response.status,body:await response.json(),inserted};
}
let r=await run({ponto_ativo:true,chat_ativo:false,demandas_ativo:false,cronograma_ativo:false,atividades_ativo:false,documentos_ativo:false,registros_posteriores_ativo:false});
assert.equal(r.status,200);assert.equal(r.inserted.auth_user_id,'conta-existente');assert.equal(r.inserted.ponto_ativo,true);assert.equal(r.inserted.chat_ativo,false);assert.equal(r.inserted.documentos_ativo,false);
r=await run();assert.equal(r.status,200);assert.equal(r.inserted.chat_ativo,true);assert.equal(r.inserted.cronograma_ativo,true);
r=await run({chat_ativo:'false'});assert.equal(r.status,400);assert.equal(r.inserted,null);
r=await run({}, {denied:true});assert.equal(r.status,403);assert.equal(r.inserted,null);
r=await run({chat_ativo:false},{existing:true});assert.equal(r.status,200);assert.equal(r.body.reenviado,true);assert.equal(r.inserted,null,'reinvite preserves permissions');
console.log('PASS: convite atômico, defaults, validação booleana, autorização por condomínio, reuso Auth e reenvio sem alterar acessos.');
