import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('signInWithPassword'));
const elements=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,{value:'',classList:{toggle(){}},addEventListener(n,f){this[n]=f},focus(){}});return elements.get(id)};
let session=null,authError=null,tableError=false,profile=true,received,signouts=0,route;
const db={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session?.user}}),signInWithPassword:async args=>{received=args;return {data:{user:{id:'test'}},error:authError}},signOut:async()=>{signouts++}},from(table){const q={select(){return q},eq(){return q},limit:async()=>({data:table==='colaboradores'&&profile?[{id:1}]:[],error:tableError?Error('network'):null})};return q}};
const c={supabase:{createClient:()=>db},document:{getElementById:el},navigator:{onLine:true},location:{replace:r=>route=r},console:{error(){},warn(){}}};vm.createContext(c);vm.runInContext(script,c);await new Promise(r=>setImmediate(r));
el('email').value=' test@example.invalid ';el('password').value=' secret with spaces ';
await el('loginForm').submit({preventDefault(){}});
assert.deepEqual(JSON.parse(JSON.stringify(received)),{email:'test@example.invalid',password:' secret with spaces '});assert.equal(route,'./colaborador.html?modo=online');
route=null;authError=Error('Invalid login credentials');await el('loginForm').submit({preventDefault(){}});assert.equal(route,null);assert.match(el('loginMessage').textContent,/PIN/);assert.equal(el('loginButton').disabled,false);
authError=null;tableError=true;await el('loginForm').submit({preventDefault(){}});assert.match(el('loginMessage').textContent,/consultar os acessos/);assert.equal(signouts,0);
tableError=false;profile=false;await el('loginForm').submit({preventDefault(){}});assert.equal(signouts,1);assert.match(el('loginMessage').textContent,/não possui um acesso ativo/);
received=null;c.navigator.onLine=false;await el('loginForm').submit({preventDefault(){}});assert.equal(received,null);
assert.match(html,/colaborador.html\?modo=offline/);
const collaborator=fs.readFileSync(new URL('../colaborador.html',import.meta.url),'utf8');
for(const m of collaborator.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
// Execute the actual initialization branches; an explicit PIN path cannot call Auth.
const init=collaborator.slice(collaborator.indexOf('async function iniciar(){'),collaborator.indexOf('/* MODULOS_COLABORADOR_INICIO */'));
for(const [mode,online,expected] of [['offline',true,'pin'],['offline',false,'pin'],['online',false,'internet'],['online',true,'redirect'],['',false,'pin']]){
 let outcome;const context={URLSearchParams,location:{search:'?modo='+mode,replace:()=>outcome='redirect'},navigator:{onLine:online},entrarOffline:async()=>outcome='pin',erro:()=>outcome='internet',console,db:{auth:{getSession:async()=>({data:{session:null}})}}};vm.createContext(context);vm.runInContext(init,context);await context.iniciar();assert.equal(outcome,expected);
}
console.log('PASS password unchanged, email trimmed, online redirect, invalid credentials, query failures, authorization denied, no password request offline, explicit PIN online/offline, online without network, missing session redirect');
