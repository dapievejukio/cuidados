import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const read=f=>fs.readFileSync(new URL(f,root),'utf8');
const scripts=f=>[...read(f).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
for(const f of ['colaborador.html','gestor.html','reservaigara/gestor.html','definir-senha.html','index.html'])for(const s of scripts(f))new vm.Script(s,{filename:f});
function dom(file){const ids=new Set([...read(file).matchAll(/\bid=["']([^"']+)/g)].map(m=>m[1]));const elements=new Map();return {getElementById(id){if(!ids.has(id))return null;if(!elements.has(id))elements.set(id,{textContent:'',value:'',style:{},dataset:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(n,fn){this[n]=fn},setAttribute(){},removeAttribute(){},querySelectorAll(){return []}});return elements.get(id)},querySelectorAll(){return []},addEventListener(){},body:{classList:{remove(){}}}}}
// Whole application script, including all synchronous event wiring before iniciar.
let timeout;const document=dom('colaborador.html');
const context={document,console:{error(){},warn(){}},URL,URLSearchParams,Date,MutationObserver:class{observe(){}},navigator:{onLine:true},location:{search:'?modo=online',replace(){}},localStorage:{getItem(){return null},setItem(){}},sessionStorage:{getItem(){return null}},setTimeout(fn){timeout=fn;return 1},clearTimeout(){},setInterval(){},addEventListener(){},supabase:{createClient:()=>({auth:{getSession:()=>new Promise(()=>{})}})}};context.window=context;
vm.createContext(context);vm.runInContext(scripts('colaborador.html')[0],context);assert.equal(typeof timeout,'function','boot must reach Auth timeout');timeout();await new Promise(r=>setImmediate(r));assert.equal(document.getElementById('userName').textContent,'Acesso não carregado');assert.match(document.getElementById('error').textContent,/demorou demais/);
// Exercise URL-based password initialization and submit for an existing Auth
// lacking OraQui metadata, with a genuine active collaborator row under RLS.
async function password({url='https://oraqui.app/definir-senha.html#access_token=test&refresh_token=test&type=recovery',active=true,invalidToken=false}={}){
 const document=dom('definir-senha.html');let updates=0,lookups=0,sessionSets=0;
 const user={id:'existing-auth',email:'teste@example.invalid',user_metadata:{}};
 const db={auth:{setSession:async()=>{sessionSets++;return {error:invalidToken?Error('expired'):null}},getUser:async()=>({data:{user}}),signOut:async()=>{},updateUser:async()=>{updates++;return {error:null}}},from(){const q={select(){return q},eq(){return q},limit:async()=>{lookups++;return {data:active?[{id:7}]:[],error:null}}};return q},rpc:async()=>({data:null,error:null})};
 const location=new URL(url);location.replace=()=>{};
 const c={document,URL,URLSearchParams,console:{error(){}},supabase:{createClient:()=>db},location,history:{replaceState(){}},setTimeout(fn){fn()},};c.window=c;vm.createContext(c);vm.runInContext(scripts('definir-senha.html')[0],c);await new Promise(r=>setImmediate(r));
 if(active&&!invalidToken&&url.includes('#')){assert.equal(document.getElementById('conteudo').style.display,'block');document.getElementById('senha').value='Test-only-password-123';document.getElementById('confirmarSenha').value='Test-only-password-123';await document.getElementById('formSenha').submit({preventDefault(){}});assert.equal(updates,1);assert.equal(lookups,2)}else{assert.equal(updates,0);assert.notEqual(document.getElementById('conteudo').style.display,'block')}
 return {sessionSets};
}
await password();await password({active:false});await password({invalidToken:true});assert.equal((await password({url:'https://oraqui.app/definir-senha.html'})).sessionSets,0);
console.log('PASS whole collaborator boot, hung Auth timeout, existing Auth without metadata, password submit, no active link, expired token, missing invitation URL; no network.');
