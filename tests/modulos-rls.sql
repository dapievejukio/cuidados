-- Run as the SQL owner. Everything, including fixture users, is rolled back.
begin;
do $$
declare
 cid bigint := -900001; cid2 bigint := -900002;
 col bigint := -900001; col2 bigint := -900002;
 u uuid := gen_random_uuid(); g uuid := gen_random_uuid(); n bigint; doc uuid;
begin
 insert into auth.users(id) values(u),(g);
 insert into public.condominios(id,nome,slug) overriding system value values
 (cid,'Teste módulos rollback','teste-modulos-'||u),
 (cid2,'Teste módulos rollback 2','teste-modulos-2-'||u);
 insert into public.colaboradores(id,condominio,condominio_id,nome,matricula,pin,auth_user_id,ponto_ativo) overriding system value values
 (col,'Teste módulos rollback',cid,'Teste','teste-'||u,'1234',u,true),
 (col2,'Teste módulos rollback 2',cid2,'Teste','teste-'||u,'1234',u,false);
 insert into public.usuarios_gestao(id,auth_user_id,condominio_id,nome,perfil) overriding system value values(-900001,g,cid,'Gestor teste','admin_cliente');
 insert into public.demandas(id,condominio_id,colaborador_id,titulo) overriding system value values(-900001,cid,col,'Teste demanda');
 insert into public.atividades_v2(id,condominio_id,nome) overriding system value values(-900001,cid,'Teste atividade');
 insert into public.programacoes(id,condominio_id,colaborador_id,atividade_id) overriding system value values(-900001,cid,col,-900001);
 insert into public.documentos_colaborador(condominio_id,colaborador_id,tipo,nome_arquivo,storage_path,criado_por,exigir_ciencia)
 values(cid,col,'Outro','teste.pdf',cid||'/'||col||'/teste.pdf',g,true) returning id into doc;
 perform set_config('request.jwt.claim.sub',u::text,true);
 execute 'set local role authenticated';
 if not public.oraqui_modulo_liberado(cid,'chat',col) then raise exception 'default negado'; end if;
 if public.oraqui_modulo_liberado(cid2,'ponto',col2) then raise exception 'ponto default incorreto'; end if;
 if public.oraqui_modulo_liberado(cid2,'chat',col) then raise exception 'vínculo cruzado permitido'; end if;
 insert into public.registros_ponto(condominio_id,colaborador_id,tipo) values(cid,col,'entrada');
 insert into public.execucoes(condominio_id,colaborador_id,tipo) values(cid,col,'avulsa');
 select count(*) into n from public.demandas where id=-900001;
 if n<>1 then raise exception 'demanda default negada'; end if;
 select count(*) into n from public.programacoes where id=-900001;
 if n<>1 then raise exception 'cronograma default negado'; end if;
 select count(*) into n from public.documentos_colaborador where id=doc;
 if n<>1 then raise exception 'documento default negado'; end if;
 insert into public.inicios_execucao(condominio_id,colaborador_id,demanda_id) values(cid,col,-900001);
 insert into public.inicios_execucao(condominio_id,colaborador_id,programacao_id) values(cid,col,-900001);
 execute 'reset role';
 update public.colaboradores set atividades_ativo=false where id=col;
 execute 'set local role authenticated';
 -- A forged program id must not turn an avulsa into a permitted operation.
 begin
  insert into public.execucoes(condominio_id,colaborador_id,tipo,programacao_id) values(cid,col,'avulsa',-900001);
  raise exception 'avulsa disfarçada de programação permitida';
 exception when insufficient_privilege then null; end;
 insert into public.execucoes(condominio_id,colaborador_id,tipo,programacao_id) values(cid,col,'programada',-900001);
 begin
  insert into public.execucoes(condominio_id,colaborador_id,tipo,programacao_id) values(cid2,col2,'programada',-900001);
  raise exception 'programação de outro condomínio permitida';
 exception when insufficient_privilege then null; end;
 update public.colaboradores set chat_ativo=false where id=col;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'auto edição permitida'; end if;
 execute 'reset role';
 update public.colaboradores set ponto_ativo=false,chat_ativo=false,demandas_ativo=false,cronograma_ativo=false,atividades_ativo=false,documentos_ativo=false,registros_posteriores_ativo=false where id=col;
 execute 'set local role authenticated';
 if public.oraqui_modulo_liberado(cid,'chat',col) then raise exception 'chat não bloqueou'; end if;
 if not public.oraqui_modulo_liberado(cid2,'chat',col2) then raise exception 'bloqueio vazou para outro vínculo'; end if;
 if public.oraqui_chat_pode_enviar(cid,u,g) then raise exception 'chat para gestor não bloqueou'; end if;
 if public.oraqui_documento_eh_colaborador(col,cid) then raise exception 'documentos não bloqueou'; end if;
 select count(*) into n from public.demandas where id=-900001;
 if n<>0 then raise exception 'demanda desativada visível'; end if;
 update public.demandas set status='concluida' where id=-900001;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'conclusão demanda desativada permitida'; end if;
 select count(*) into n from public.programacoes where id=-900001;
 if n<>0 then raise exception 'cronograma desativado visível'; end if;
 select count(*) into n from public.documentos_colaborador where id=doc;
 if n<>0 then raise exception 'documento desativado visível'; end if;
 begin
  perform public.oraqui_confirmar_ciencia_documento(doc);
  raise exception 'ciência em documento desativado permitida';
 exception when raise_exception then
  if sqlerrm <> 'Acesso negado ao documento' then raise; end if;
 end;
 begin
  insert into public.inicios_execucao(condominio_id,colaborador_id,demanda_id) values(cid,col,-900001);
  raise exception 'início demanda desativada permitido';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.inicios_execucao(condominio_id,colaborador_id,programacao_id) values(cid,col,-900001);
  raise exception 'início cronograma desativado permitido';
 exception when insufficient_privilege then null; end;
 select count(*) into n from public.registros_ponto where colaborador_id=col;
 if n<>0 then raise exception 'ponto visível após revogação'; end if;
 begin
  insert into public.registros_ponto(condominio_id,colaborador_id,tipo) values(cid,col,'saida');
  raise exception 'ponto desativado permitido';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.execucoes(condominio_id,colaborador_id,tipo) values(cid,col,'avulsa');
  raise exception 'execução desativada permitida';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.registros_posteriores(condominio_id,colaborador_id,data_servico,descricao_atividade) values(cid,col,current_date,'Teste bloqueio');
  raise exception 'posterior desativado permitido';
 exception when insufficient_privilege then null; end;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',g::text,true);
 execute 'set local role authenticated';
 if not public.usuario_gestao_do_condominio(cid) then raise exception 'gestão bloqueada'; end if;
 update public.colaboradores set chat_ativo=true where id=col;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'gestor não pode editar'; end if;
 update public.colaboradores set chat_ativo=false where id=col2;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'gestor alterou outro condomínio'; end if;
 select count(*) into n from public.registros_ponto where colaborador_id=col;
 if n<>1 then raise exception 'gestor perdeu histórico'; end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: defaults, isolamento, revogação, ponto, atividades, posteriores, chat, documentos, autoedição e gestão; fixtures revertidas' as resultado;
