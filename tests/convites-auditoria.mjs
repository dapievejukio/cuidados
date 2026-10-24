import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('../',import.meta.url);
const redirect='https://oraqui.app/definir-senha.html';
async function run(slug,opts={}){
 let handler; const calls=[];
 const user={id:'auth-col',email:opts.email||'a_b@example.invalid',email_confirmed_at:opts.unconfirmed?null:'2026-01-01'};
 const col={id:7,nome:'Teste',email:user.email,matricula:'123',funcao:'Limpeza',condominio_id:2,auth_user_id:user.id,ativo:true,...opts.col};
 const gestor={perfil:'gestor',ativo:true,condominio_id:2,acesso_temporario:false,acesso_expira_em:null,...opts.gestor};
 const auth={getUser:async()=>({data:{user:opts.invalidSession?null:{id:'gestor-auth'}}}),admin:{
  listUsers:async()=>({data:{users:opts.newUser?[]:[user]}}),
  getUserById:async()=>({data:{user}}),
  inviteUserByEmail:async(email,options)=>{calls.push(['invite',email,options]);return {data:{user},error:opts.mailError?Error('mail unavailable'):null}},
  deleteUser:async()=>{calls.push(['delete']);return {error:null}},
  updateUserById:async()=>{throw Error('must not confirm email administratively')},
  generateLink:async()=>{throw Error('unexpected link generation')},
 },
 resetPasswordForEmail:async(...args)=>{calls.push(['recovery',...args]);return {error:opts.mailError?Error('mail unavailable'):null}},
 signInWithOtp:async(...args)=>{calls.push(['otp',...args]);return {error:opts.mailError?Error('mail unavailable'):null}},
 };
 const client={auth,from(table){let filters=[],inserted,maybe=false;
  const q=new Proxy({}, {get(_,key){
   if(key==='then')return resolve=>{
    let data=[];
    if(table==='usuarios_gestao')data=opts.denied?[]:[gestor];
    if(table==='condominios')data={id:2,nome:'Condomínio Teste',ativo:true,ambiente_demo:!!opts.demo};
    if(table==='colaboradores'){
     if(inserted)data={id:7,...inserted};
     else if(slug.startsWith('reenviar'))data=col;
     else if(filters.some(f=>f[0]==='ilike'&&f[1]==='email')&&filters.some(f=>f[1]==='condominio_id'))data=opts.existing?[col]:[];
     else if(filters.some(f=>f[1]==='matricula'))data=opts.duplicateMatricula?[{id:99}]:[];
     else if(filters.some(f=>f[0]==='not'))data=opts.linked?[col]:[];
    }
    resolve({data,error:inserted&&opts.insertError?Error('constraint'):null});
   };
   return (...args)=>{filters.push([key,...args]);calls.push(['query',table,key,...args]);if(key==='insert')inserted=args[0];return q};
  }});return q;
 }};
 const source=stripTypeScriptTypes(fs.readFileSync(new URL(`supabase/functions/${slug}/index.ts`,root),'utf8').replace(/^import .*;\n/,''));
 const context={Response,crypto,Uint32Array,Date,console:{error(){}},createClient:()=>client,fetch:()=>{throw Error('NO REAL NETWORK')},Deno:{env:{get:()=> 'fixture'},serve:fn=>handler=fn}};
 vm.createContext(context);vm.runInContext(source,context);
 const body={nome:'Teste',email:user.email,matricula:'123',funcao:'Limpeza',condominio_id:2,colaborador_id:7,...opts.body};
 const response=await handler({method:opts.method||'POST',headers:{get:()=>opts.noAuth?null:'Bearer fixture'},json:async()=>body});
 return {status:response.status,body:await response.json(),calls};
}
let count=0;
for(const slug of ['convidar-colaborador','reenviar-convite-colaborador']){
 for(const opts of [{noAuth:true},{invalidSession:true},{denied:true},{demo:true},{gestor:{acesso_temporario:true,acesso_ativado_em:'2026-01-01',acesso_expira_em:'2026-01-02'}},{body:{condominio_id:0}}]){
  const r=await run(slug,opts);assert(r.status>=400);assert(!r.calls.some(c=>['invite','otp','recovery','delete'].includes(c[0])));count++;
 }
}
for(const unconfirmed of [true,false]){
 let r=await run('reenviar-convite-colaborador',{unconfirmed});assert.equal(r.status,200);
 const call=r.calls.find(c=>c[0]===(unconfirmed?'otp':'recovery'));assert(call);
 if(unconfirmed){assert.equal(call[1].options.shouldCreateUser,false);assert.equal(call[1].options.emailRedirectTo,redirect)}else assert.equal(call[2].redirectTo,redirect);
 assert(!r.calls.some(c=>c[0]==='query'&&['insert','update','delete'].includes(c[2])));count++;
}
let r=await run('convidar-colaborador',{newUser:true,insertError:true});assert.equal(r.status,400);assert(!r.calls.some(c=>c[0]==='delete'));count++;
r=await run('convidar-colaborador',{newUser:true});assert.equal(r.status,200);assert(r.calls.some(c=>c[0]==='invite'));assert(r.calls.some(c=>c[2]==='insert'&&c[3].auth_user_id==='auth-col'));count++;
r=await run('convidar-colaborador',{linked:true});assert.equal(r.status,200);assert(!r.calls.some(c=>c[0]==='invite'));assert(r.calls.some(c=>c[0]==='recovery'));count++;
r=await run('convidar-colaborador',{existing:true});assert.equal(r.body.reenviado,true);assert(!r.calls.some(c=>c[2]==='insert'));count++;
for(const col of [{ativo:false},{auth_user_id:null}]){r=await run('convidar-colaborador',{existing:true,col});assert.equal(r.status,409);assert(!r.calls.some(c=>['recovery','otp'].includes(c[0])));count++}
r=await run('convidar-colaborador',{mailError:true});assert.equal(r.body.ok,true);assert.match(r.body.aviso,/envio.*falhou/);count++;
r=await run('convidar-colaborador',{duplicateMatricula:true});assert.equal(r.status,409);assert(!r.calls.some(c=>c[0]==='invite'));count++;
r=await run('convidar-colaborador');assert(r.calls.filter(c=>c[2]==='ilike').every(c=>c[4]==='a\\_b@example.invalid'));count++;
// Execute the actual frontend function to check warning visibility and legacy scope.
for(const file of ['gestor.html','reservaigara/gestor.html']){
 const html=fs.readFileSync(new URL(file,root),'utf8');
 const source=html.slice(html.indexOf('async function salvarCol(){'),html.indexOf('\nasync function reenviarConviteColaborador'));
 const messages=[];let sent;
 const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,{value:({colNome:'Teste',colEmail:'test@example.invalid',colMatricula:'123',colFuncao:'Limpeza',colIntervaloMinutos:'60'})[id]||'',checked:false,classList:{remove(){}}});return elements.get(id)};
 const context={$,CONDOMINIO_ID:2,colaboradorEditandoId:null,db:{functions:{invoke:async(_,args)=>{sent=args.body;return {data:{ok:true,aviso:'Envio falhou; reenvie'}}}}},alert:m=>messages.push(m),toast(){},carregarColaboradores:async()=>{}};
 vm.createContext(context);vm.runInContext(source,context);await context.salvarCol();assert.equal(sent.condominio_id,2);assert(messages.includes('Envio falhou; reenvie'));count++;
}
console.log(`PASS ${count} invitation/resend/frontend scenarios; all Auth and mail mocked; network forbidden.`);
