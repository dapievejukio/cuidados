import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
const here = new URL('.', import.meta.url);
let passed = 0;
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function as(n, sql, role='authenticated') {
  await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${n ? uid(n) : ''}',false);`);
  try { return await db.query(sql); } finally { await db.exec('RESET ROLE'); }
}
async function yes(label,n,sql,expected) {
  const result = await as(n,sql);
  assert.deepEqual(result.rows,expected,label); passed++; console.log('PASS',label);
}
async function denied(label,n,sql,role='authenticated') {
  let error;
  try { await as(n,sql,role); } catch(e) { error=e; }
  assert.ok(error,`${label}: operation unexpectedly allowed`);
  assert.ok(['42501','23514','P0001'].includes(error.code),`${label}: unexpected failure ${error.message}`);
  passed++; console.log('PASS',label);
}
try {
  await db.exec(await readFile(new URL('baseline.sql',here),'utf8'));
  await db.exec("INSERT INTO storage.buckets(id,public) VALUES('fotos-atividades',true)");
  await db.exec(await readFile(new URL('../../supabase/migrations/20261020220842_tenant_isolation_hardening.sql',here),'utf8'));
  await db.exec(`
    INSERT INTO auth.users(id) VALUES ${[1,2,3,4,5,6,7,8].map(n=>`('${uid(n)}')`).join(',')};
    INSERT INTO condominios(id,nome,ativo) VALUES (1,'Tenant A',true),(2,'Tenant B',true),(3,'Inactive',false);
    INSERT INTO usuarios_gestao(id,auth_user_id,condominio_id,perfil,ativo,acesso_temporario,acesso_expira_em,acesso_ativado_em) VALUES
     (1,'${uid(1)}',1,'gestor',true,false,null,null),
     (2,'${uid(2)}',2,'gestor',true,false,null,null),
     (3,'${uid(3)}',1,'gestor',true,true,now()-interval '1 day',now()-interval '2 days'),
     (4,'${uid(4)}',1,'supervisor',true,false,null,null),
     (7,'${uid(7)}',1,'gestor',true,false,null,null),(8,'${uid(7)}',2,'gestor',true,false,null,null);
    INSERT INTO colaboradores(id,auth_user_id,condominio_id,ativo,funcao) VALUES
     (11,'${uid(5)}',1,true,'limpeza'),(22,'${uid(6)}',2,true,'limpeza'),(33,'${uid(8)}',1,false,'limpeza'),(44,'${uid(8)}',3,true,'limpeza');
    INSERT INTO oraqui_dp_acessos(auth_user_id,condominio_id) VALUES ('${uid(1)}',1),('${uid(2)}',2),('${uid(3)}',1);
    INSERT INTO areas(id,condominio_id,ativo) VALUES (1,1,true),(2,2,true);
    INSERT INTO pontos(id,condominio_id,area_id) VALUES (1,1,1),(2,2,2);
    INSERT INTO ocorrencias(id,condominio_id,condominio,status,foto_path) VALUES
     (101,1,'Tenant A','Aberta','tenant-a/occ.jpg'),(202,2,'Tenant B','Aberta','tenant-b/occ.jpg');
    INSERT INTO demandas(id,condominio_id,colaborador_id,tipo,titulo,status,exige_foto,exige_foto_antes,exige_observacao,ambiente,ocorrencia_id) VALUES
     (1,1,11,'tarefa','Direct','pendente',true,false,true,'producao',null),
     (2,2,22,'tarefa','Other','pendente',false,false,false,'producao',202),
     (3,1,11,'tarefa','Occurrence','pendente',false,false,false,'producao',101);
    INSERT INTO storage.buckets(id,public) VALUES ('fotos-ocorrencias',false);
    INSERT INTO storage.objects(bucket_id,name) VALUES
     ('fotos-atividades','v2/1/11/date/one.jpg'),('fotos-atividades','v2/2/22/date/two.jpg'),
     ('fotos-ocorrencias','tenant-a/occ.jpg'),('fotos-ocorrencias','tenant-b/occ.jpg');
    INSERT INTO storage.objects(bucket_id,name) VALUES
     ('fotos-perfil-privadas','11/profile.jpg'),('selfies-ponto-privadas','1/11/selfie.jpg');
    INSERT INTO documentos_colaborador(id,condominio_id,colaborador_id,criado_por,storage_path)
     VALUES ('${uid(101)}',1,11,'${uid(1)}','1/11/one.pdf'),('${uid(202)}',2,22,'${uid(2)}','2/22/two.pdf');
    INSERT INTO oraqui_chat_config(condominio_id,modo) VALUES(1,'todos'),(2,'todos');
  `);
  await yes('management sees only tenant A',1,'SELECT id FROM demandas ORDER BY id',[{id:1},{id:3}]);
  await yes('management sees only tenant B',2,'SELECT id FROM demandas ORDER BY id',[{id:2}]);
  await yes('one Auth account can access two authorized tenants',7,'SELECT id FROM demandas ORDER BY id',[{id:1},{id:2},{id:3}]);
  await yes('expired management sees no demands',3,'SELECT id FROM demandas',[]);
  await yes('DP grant permits own documents',1,'SELECT condominio_id FROM documentos_colaborador',[{condominio_id:1}]);
  await yes('management without DP grant sees no documents',4,'SELECT id FROM documentos_colaborador',[]);
  await yes('expired DP grant cannot read documents',3,'SELECT id FROM documentos_colaborador',[]);
  await yes('employee reads own document',5,'SELECT condominio_id FROM documentos_colaborador',[{condominio_id:1}]);
  await yes('inactive employee cannot read documents',8,'SELECT id FROM documentos_colaborador',[]);
  await denied('forged science on insert rejected',1,`INSERT INTO documentos_colaborador(condominio_id,colaborador_id,criado_por,storage_path,ciencia_em) VALUES(1,11,'${uid(1)}','1/11/fake.pdf',now())`);
  await denied('cross-tenant document rejected',1,`INSERT INTO documentos_colaborador(condominio_id,colaborador_id,criado_por,storage_path) VALUES(1,22,'${uid(1)}','1/22/fake.pdf')`);
  await denied('employee cannot remove photo requirement',5,"UPDATE demandas SET exige_foto=false WHERE id=1");
  await denied('employee cannot change origin',5,'UPDATE demandas SET ocorrencia_id=101 WHERE id=1');
  await denied('employee cannot assign another tenant',5,'UPDATE demandas SET colaborador_id=22 WHERE id=1');
  await denied('manager cannot create cross-tenant references',1,"INSERT INTO demandas(id,condominio_id,colaborador_id,status) VALUES(44,1,22,'pendente')");
  await denied('manager cannot move demand to another tenant',7,'UPDATE demandas SET condominio_id=2 WHERE id=1');
  await denied('required evidence enforced in database',5,"UPDATE demandas SET status='concluida' WHERE id=1");
  await denied('foreign photo is rejected',5,"UPDATE demandas SET status='concluida',observacao_execucao='done',foto_execucao_path='v2/2/22/date/two.jpg' WHERE id=1");
  await as(5,"UPDATE demandas SET status='concluida',observacao_execucao='done',foto_execucao_path='v2/1/11/date/one.jpg' WHERE id=1");
  await yes('direct demand can be completed',5,'SELECT status FROM demandas WHERE id=1',[{status:'concluida'}]);
  await as(5,"UPDATE demandas SET status='concluida' WHERE id=3");
  await yes('occurrence remains open after employee completion',1,'SELECT status FROM ocorrencias WHERE id=101',[{status:'Aberta'}]);
  await yes('employee cannot close occurrence',5,"UPDATE ocorrencias SET status='Resolvida' WHERE id=101 RETURNING id",[]);
  await as(1,"UPDATE ocorrencias SET status='Resolvida' WHERE id=101");
  await yes('manager can confirm closure',1,'SELECT status FROM ocorrencias WHERE id=101',[{status:'Resolvida'}]);
  await denied('completed demand cannot be reopened by employee',5,"UPDATE demandas SET status='pendente' WHERE id=1");
  await yes('photos isolated for management',1,"SELECT name FROM storage.objects WHERE bucket_id='fotos-atividades'",[{name:'v2/1/11/date/one.jpg'}]);
  await yes('employee sees only assigned occurrence photo',5,"SELECT name FROM storage.objects WHERE bucket_id='fotos-ocorrencias'",[{name:'tenant-a/occ.jpg'}]);
  await denied('employee cannot upload into other tenant',5,"INSERT INTO storage.objects(bucket_id,name) VALUES('fotos-atividades','v2/2/22/evil.jpg')");
  await denied('anonymous activity upload rejected',0,"INSERT INTO storage.objects(bucket_id,name) VALUES('fotos-atividades','anything.jpg')",'anon');
  await denied('legacy anonymous table read rejected',0,'SELECT id FROM registros_atividade','anon');
  await denied('legacy anonymous table insert rejected',0,'INSERT INTO atividades DEFAULT VALUES','anon');
  await yes('expired membership is not chat management',3,`SELECT oraqui_chat_eh_gestor(1,'${uid(3)}') AS ok`,[{ok:false}]);
  await yes('cross-tenant chat blocked',1,`SELECT oraqui_chat_pode_enviar(1,'${uid(1)}','${uid(6)}') AS ok`,[{ok:false}]);
  await yes('expired chat recipient blocked',1,`SELECT oraqui_chat_pode_enviar(1,'${uid(1)}','${uid(3)}') AS ok`,[{ok:false}]);
  await yes('authorized chat preserved',1,`SELECT oraqui_chat_pode_enviar(1,'${uid(1)}','${uid(5)}') AS ok`,[{ok:true}]);
  await yes('inactive condominium cannot authorize employee chat',8,`SELECT oraqui_chat_eh_colaborador(3,'${uid(8)}') AS ok`,[{ok:false}]);
  await yes('expired manager cannot read profile photos',3,"SELECT name FROM storage.objects WHERE bucket_id='fotos-perfil-privadas'",[]);
  await yes('expired manager cannot read point selfies',3,"SELECT name FROM storage.objects WHERE bucket_id='selfies-ponto-privadas'",[]);
  await denied('expired manager cannot upload chat audio',3,`INSERT INTO storage.objects(bucket_id,name) VALUES('oraqui-chat-audios','1/${uid(3)}/audio.webm')`);
  await denied('occurrence cannot be moved between tenants',7,'UPDATE ocorrencias SET condominio_id=2 WHERE id=101');
  await denied('anonymous direct occurrence insert blocked',0,"INSERT INTO ocorrencias(id,condominio,condominio_id,status) VALUES(303,'Tenant A',2,'Aberta')",'anon');
  await denied('deprecated PIN login blocked',0,"SELECT login_colaborador('tenant','employee','test')",'anon');
  await denied('table TRUNCATE privileges removed',5,'TRUNCATE demandas');
  const bucket = await db.query("SELECT public FROM storage.buckets WHERE id='fotos-atividades'");
  assert.equal(bucket.rows[0].public,false); passed++;
  console.log(`${passed} security assertions passed; synthetic data only.`);
} catch(e) {
  console.error('FAIL',e.message, e.code||'', e.where||''); process.exitCode=1;
} finally { await db.close(); }
