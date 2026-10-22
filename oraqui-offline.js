(function offlineModule(){
'use strict';
const NAME='oraqui_dispositivo_offline_v1',STORE='perfis',LIMITE_MS=72*3600*1000;
const te=new TextEncoder(),td=new TextDecoder();
let active=null;
const dbOpen=()=>new Promise((ok,fail)=>{
 const r=indexedDB.open(NAME,1);
 r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'key'});
 r.onsuccess=()=>ok(r.result);
 r.onerror=()=>fail(r.error||Error('Não foi possível preparar o armazenamento offline.'));
});
async function transaction(mode,fn){
 const db=await dbOpen();
 return new Promise((ok,fail)=>{
  const tx=db.transaction(STORE,mode),st=tx.objectStore(STORE);
  let value;
  try{const req=fn(st);req.onsuccess=()=>{value=req.result};req.onerror=()=>{}}catch(e){tx.abort();fail(e);return}
  tx.oncomplete=()=>{db.close();ok(value)};
  tx.onerror=()=>{db.close();fail(tx.error||Error('Erro no armazenamento offline.'))};
 });
}
const all=()=>transaction('readonly',s=>s.getAll());
const put=obj=>transaction('readwrite',s=>s.put(obj));
const remove=id=>transaction('readwrite',s=>s.delete(id));
function random(len){const b=new Uint8Array(len);crypto.getRandomValues(b);return b}
async function keyFromPin(pin,salt){
 const raw=await crypto.subtle.importKey('raw',te.encode(pin),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:370000,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encrypt(key,data){
 const iv=random(12);const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,te.encode(JSON.stringify(data)));
 return{iv,ciphertext};
}
async function decrypt(key,v){const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(v.iv)},key,v.ciphertext);return JSON.parse(td.decode(pt))}
function pinDialog({title,description,confirm=false}){
 return new Promise((resolve,reject)=>{
  const shade=document.createElement('div');
  shade.style.cssText='position:fixed;inset:0;z-index:999999;background:#081923d9;display:flex;align-items:center;justify-content:center;padding:16px';
  const card=document.createElement('div');
  card.style.cssText='background:#fff;color:#183349;width:min(95vw,390px);border-radius:20px;padding:24px;font-family:Arial,sans-serif;box-shadow:0 20px 65px #0006';
  const titleEl=document.createElement('h2');titleEl.style.cssText='font-size:19px;margin:0 0 10px';titleEl.textContent=title;
  const info=document.createElement('p');info.textContent=description;info.style.cssText='font-size:13px;line-height:1.55;color:#546577;margin:0 0 14px';
  const input=document.createElement('input');input.type='password';input.inputMode='numeric';input.pattern='[0-9]*';input.maxLength=8;input.placeholder='PIN de 6 a 8 números';input.autocomplete='off';input.style.cssText='font-size:20px;text-align:center;letter-spacing:4px;border:1px solid #b9c8d1;border-radius:11px;padding:12px;width:100%;margin-bottom:10px';
  const inputAgain=document.createElement('input');inputAgain.type='password';inputAgain.inputMode='numeric';inputAgain.pattern='[0-9]*';inputAgain.maxLength=8;inputAgain.placeholder='Repita o PIN';inputAgain.autocomplete='off';inputAgain.style.cssText=input.style.cssText;
  if(!confirm)inputAgain.style.display='none';
  const error=document.createElement('p');error.style.cssText='color:#ad2d23;font-size:12px;min-height:16px;margin:0 0 6px';
  const save=document.createElement('button');save.textContent=confirm?'ATIVAR APARELHO':'DESBLOQUEAR';
  save.style.cssText='background:#0f5132;color:#fff;font-weight:750;border:0;border-radius:11px;padding:13px;width:100%;margin-bottom:9px';
  const cancel=document.createElement('button');cancel.textContent='CANCELAR';
  cancel.style.cssText='background:#eef1f4;color:#344b5c;border:0;border-radius:11px;padding:11px;width:100%';
  card.append(titleEl,info,input,inputAgain,error,save,cancel);shade.append(card);
  function close(v){shade.remove();resolve(v)}
  cancel.onclick=()=>close(null);
  save.onclick=()=>{
   const pin=input.value.trim();
   if(!/^\d{6,8}$/.test(pin)){error.textContent='Use de seis a oito números.';return}
   if(confirm&&pin!==inputAgain.value){error.textContent='Os PINs estão diferentes.';return}
   input.value='';inputAgain.value='';close(pin);
  };
  document.body.append(shade);input.focus();
 });
}
function keyId(snapshot){return snapshot.user.id+':'+snapshot.colaborador.condominio_id+':'+snapshot.colaborador.id}
function same(a,b){return a.user.id===b.user.id&&Number(a.colaborador.id)===Number(b.colaborador.id)&&Number(a.colaborador.condominio_id)===Number(b.colaborador.condominio_id)}
async function activate(snapshot){
 if(!navigator.onLine)throw Error('A ativação inicial requer internet.');
 if(!snapshot?.user?.id||!snapshot?.colaborador?.id||!snapshot?.condominio?.id)throw Error('Perfil não validado.');
 const pin=await pinDialog({title:'Ativar OraQui Offline',description:'Crie um PIN exclusivo deste aparelho. Após ativar, você poderá abrir o OraQui e registrar atividades offline. Não compartilhe o PIN.',confirm:true});
 if(!pin)return false;
 const salt=random(16),key=await keyFromPin(pin,salt),encrypted=await encrypt(key,{...snapshot,updated_at:Date.now()});
 const id=keyId(snapshot);
 await put({key:id,uid:snapshot.user.id,cid:Number(snapshot.colaborador.condominio_id),colid:Number(snapshot.colaborador.id),
  label:String(snapshot.colaborador.nome||'Colaborador')+' · '+String(snapshot.condominio.nome||'Condomínio'),
  valid_until:Date.now()+LIMITE_MS,salt,...encrypted,failed:0,blocked_until:0});
 active={key:id,crypt:key};
 return true;
}
async function unlock(uid){
 // Após expirar a licença local, bloquear uso offline, mas permitir desbloquear
 // conectado e reenviar fotos/registros criptografados sem perder a chave antiga.
 const candidates=(await all()).filter(v=>(!uid||v.uid===uid)&&(navigator.onLine||v.valid_until>Date.now()));
 if(!candidates.length)throw Error('Nenhum acesso offline válido neste aparelho. Entre com internet e ative o acesso offline.');
 let record=candidates[0];
 if(candidates.length>1){
  const options=candidates.map((x,i)=>(i+1)+' — '+x.label).join('\n');
  const option=prompt('Escolha o perfil offline:\n'+options,'1');
  if(option===null)return null;
  record=candidates[Number(option)-1];if(!record)throw Error('Perfil não localizado.');
 }
 if(record.blocked_until>Date.now())throw Error('Aguarde antes de tentar o PIN novamente.');
 const pin=await pinDialog({title:'Acessar OraQui Offline',description:record.label+' · Sem internet, os dados serão armazenados neste aparelho e enviados depois.'});
 if(!pin)return null;
 try{
  const key=await keyFromPin(pin,new Uint8Array(record.salt));
  const snapshot=await decrypt(key,record);
  if(!same(snapshot,{user:{id:record.uid},colaborador:{id:record.colid,condominio_id:record.cid}}))throw Error('Perfil incompatível.');
  await put({...record,failed:0,blocked_until:0});
  active={key:record.key,crypt:key};
  return snapshot;
 }catch(e){
  const failed=(record.failed||0)+1;
  await put({...record,failed,blocked_until:failed>=5?Date.now()+15*60000:Date.now()+failed*3000});
  throw Error('PIN incorreto. Tente novamente mais tarde.');
 }
}
async function refresh(snapshot){
 if(!active||active.key!==keyId(snapshot)||!navigator.onLine)return false;
 const current=(await all()).find(v=>v.key===active.key);
 if(!current)return false;
 const encrypted=await encrypt(active.crypt,{...snapshot,updated_at:Date.now()});
 await put({...current,...encrypted,valid_until:Date.now()+LIMITE_MS,failed:0});
 return true;
}
function unlocked(){return !!active}
function currentId(){return active?.key||null}
function lock(){active=null}
async function removeCurrent(){const id=active?.key;if(id)await remove(id);active=null}
async function base64Blob(blob){
 if(blob.size>12*1024*1024)throw Error('Arquivo offline maior que 12 MB. Reduza a foto.');
 const data=await new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
 });
 return{__oraqui_blob:true,mime:blob.type||'application/octet-stream',data:String(data).split(',')[1]};
}
function restoreBlob(x){
 const binary=atob(x.data),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new Blob([bytes],{type:x.mime||'application/octet-stream'});
}
async function serialize(v){
 if(v instanceof Blob)return base64Blob(v);
 if(Array.isArray(v))return Promise.all(v.map(serialize));
 if(v&&typeof v==='object'){
  const obj={};
  for(const [key,value] of Object.entries(v))obj[key]=await serialize(value);
  return obj;
 }
 return v;
}
function restore(v){
 if(!v||typeof v!=='object')return v;
 if(v.__oraqui_blob===true)return restoreBlob(v);
 if(Array.isArray(v))return v.map(restore);
 const x={};for(const [k,value] of Object.entries(v))x[k]=restore(value);
 return x;
}
async function seal(item){
 if(!active)return item; // Registros legados/sem ativação continuam preservados.
 const id=item.auth_user_id+':'+item.condominio_id+':'+item.colaborador_id;
 if(id!==active.key)throw Error('Colaborador/condomínio não coincide com o aparelho autorizado.');
 const payload=await serialize(item),encrypted=await encrypt(active.crypt,payload);
 return{id:item.id,auth_user_id:item.auth_user_id,condominio_id:item.condominio_id,
    colaborador_id:item.colaborador_id,kind:item.kind,criado_em:item.criado_em,
    protected:true,...encrypted};
}
async function openQueue(record){
 if(!record.protected)return record;
 if(!active||active.key!==record.auth_user_id+':'+record.condominio_id+':'+record.colaborador_id)
  return{id:record.id,auth_user_id:record.auth_user_id,condominio_id:record.condominio_id,
    colaborador_id:record.colaborador_id,kind:record.kind,criado_em:record.criado_em,trancado:true};
 try{return restore(await decrypt(active.crypt,record))}catch(e){
  console.error('Registro offline criptografado indisponível:',record.id);
  return{id:record.id,auth_user_id:record.auth_user_id,condominio_id:record.condominio_id,
   colaborador_id:record.colaborador_id,kind:record.kind,criado_em:record.criado_em,trancado:true};
 }
}
window.OraquiOffline={activate,unlock,refresh,unlocked,currentId,lock,removeCurrent,allProfiles:all,seal,openQueue};
})();
