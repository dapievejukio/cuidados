import {existsSync,statSync,mkdirSync,readdirSync,copyFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative,extname,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dest=join(root,'.cloudflare-public');
const allowed=new Set(['.html','.css','.js','.mjs','.webmanifest','.png','.jpg','.jpeg','.svg','.webp','.ico','.gif','.woff','.woff2']);
const roots=['assets','oraqui-icons','oraqui-brand','reservaigara'];
const required=['index.html','gestor.html','colaborador.html','reportar.html','service-worker.js','oraqui-offline.js','manifest.webmanifest','icon-192.png','icon-512.png','sindico.html','sindico-gestao.js'];
const ok=p=>allowed.has(extname(p).toLowerCase())&&!p.split(/[\\/]/).some(n=>n.startsWith('.'));
rmSync(dest,{recursive:true,force:true});mkdirSync(dest,{recursive:true});
let count=0;
function copy(folder,base=''){
 for(const ent of readdirSync(folder,{withFileTypes:true})){
  if(ent.name.startsWith('.')||['node_modules','.git','supabase','docs','tests','.github','scripts','.cloudflare-public'].includes(ent.name))continue;
  const src=join(folder,ent.name),rel=join(base,ent.name);
  if(ent.isDirectory()){copy(src,rel);continue}
  if(!ent.isFile()||!ok(rel))continue;
  const target=join(dest,rel);mkdirSync(resolve(target,'..'),{recursive:true});copyFileSync(src,target);count++;
 }
}
for(const ent of readdirSync(root,{withFileTypes:true})){
 if(ent.isFile()&&ok(ent.name)){copyFileSync(join(root,ent.name),join(dest,ent.name));count++}
}
for(const dir of roots)if(existsSync(join(root,dir)))copy(join(root,dir),dir);
for(const file of required)if(!existsSync(join(dest,file))||!statSync(join(dest,file)).size)throw Error('Arquivo obrigatório ausente: '+file);
for(const path of ['supabase','docs','tests','.github','README.md','.env'])if(existsSync(join(dest,path)))throw Error('Arquivo interno indevidamente publicado: '+path);
writeFileSync(join(dest,'migration-proof.json'),JSON.stringify({app:'OraQui',release:process.env.GITHUB_SHA||'local'})+'\n');
console.log('OraQui: '+count+' arquivos estáticos públicos preparados em '+relative(root,dest));
