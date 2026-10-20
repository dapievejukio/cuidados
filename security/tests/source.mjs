import { readFile, readdir } from 'node:fs/promises';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('../../',import.meta.url);
// Syntax-only: never execute application code or contact Supabase.
for (const name of ['documentos-gestao.html','reportar.html']) {
  const html=await readFile(new URL(name,root),'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/.test(match[1])) new Script(match[2],{filename:name});
  }
}
const report=await readFile(new URL('reportar.html',root),'utf8');
assert.ok(report.includes('resumo_local_ocorrencia'));
assert.ok(!report.includes('createSignedUrl'));
const docs=await readFile(new URL('documentos-gestao.html',root),'utf8');
assert.ok(docs.includes("db.from('oraqui_dp_acessos')"));
async function scan(dir) {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    if (['.git','node_modules','.temp','.branches'].includes(entry.name)) continue;
    const url=new URL(entry.name+(entry.isDirectory()?'/':''),dir);
    assert.ok(!/^\.env(?:\.|$)|\.(?:p12|pfx|pem|key|cer|crt|p7m|p7s|cms)$/i.test(entry.name),'Forbidden secret/certificate file: '+entry.name);
    if(entry.isDirectory()) {await scan(url);continue;}
    if(!/\.(?:html|js|mjs|ts|sql|md|json|ya?ml|txt)$/.test(entry.name))continue;
    const source=await readFile(url,'utf8');
    assert.ok(!/-----BEGIN (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----/.test(source),'Private key in '+entry.name);
    for(const token of source.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]) {
      const payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
      assert.notEqual(payload.role,'service_role','Privileged JWT in '+entry.name);
    }
    assert.ok(!/sb_secret_[A-Za-z0-9_-]{20,}/.test(source),'Supabase secret in '+entry.name);
  }
}
await scan(root);
console.log('Source checks passed: frontend syntax, restricted DP lookup, public summary, certificate/private-key/privileged-token scan.');
