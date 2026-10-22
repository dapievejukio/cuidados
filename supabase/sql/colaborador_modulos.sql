-- Defaults preserve existing collaborators. Ponto keeps its existing value.
alter table public.colaboradores
  add column chat_ativo boolean not null default true,
  add column demandas_ativo boolean not null default true,
  add column cronograma_ativo boolean not null default true,
  add column atividades_ativo boolean not null default true,
  add column registros_posteriores_ativo boolean not null default true,
  add column documentos_ativo boolean not null default true;

-- Invoker: reads only profiles already visible under existing RLS.
create or replace function public.oraqui_modulo_liberado(p_condominio_id bigint, p_modulo text, p_colaborador_id bigint default null)
returns boolean language sql stable security invoker set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.colaboradores c
  join public.condominios co on co.id=c.condominio_id and co.ativo
  where c.condominio_id=p_condominio_id and c.ativo
    and (p_colaborador_id is null or c.id=p_colaborador_id)
    and (c.auth_user_id=auth.uid() or public.oraqui_demo_pode_operar_colaborador(c.condominio_id,c.id))
    and case p_modulo
      when 'ponto' then c.ponto_ativo
      when 'chat' then c.chat_ativo
      when 'demandas' then c.demandas_ativo
      when 'cronograma' then c.cronograma_ativo
      when 'atividades' then c.atividades_ativo
      when 'registros_posteriores' then c.registros_posteriores_ativo
      when 'documentos' then c.documentos_ativo
      else false end
 );
$$;
revoke all on function public.oraqui_modulo_liberado(bigint,text,bigint) from public, anon;
grant execute on function public.oraqui_modulo_liberado(bigint,text,bigint) to authenticated;

alter policy "colaborador_v2_select_demandas" on public.demandas
 using ((((status <> 'cancelada'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.condominio_id = demandas.condominio_id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL)))))))) and (public.oraqui_modulo_liberado(condominio_id,'demandas')))
;
alter policy "colaborador_v2_update_demandas" on public.demandas
 using ((((status <> 'cancelada'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.condominio_id = demandas.condominio_id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL)))))))) and (public.oraqui_modulo_liberado(condominio_id,'demandas')))
 with check (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.condominio_id = demandas.condominio_id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL))))))) and (public.oraqui_modulo_liberado(condominio_id,'demandas')))
;
alter policy "demo_select_demandas" on public.demandas
 using ((((status <> 'cancelada'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.condominio_id = demandas.condominio_id) AND (c.ativo = true) AND oraqui_demo_pode_operar_colaborador(demandas.condominio_id, c.id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL)))))))) and (public.oraqui_modulo_liberado(condominio_id,'demandas')))
;
alter policy "demo_update_demandas" on public.demandas
 using ((((status <> 'cancelada'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.condominio_id = demandas.condominio_id) AND (c.ativo = true) AND oraqui_demo_pode_operar_colaborador(demandas.condominio_id, c.id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL)))))))) and (public.oraqui_modulo_liberado(condominio_id,'demandas')))
 with check (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.condominio_id = demandas.condominio_id) AND (c.ativo = true) AND oraqui_demo_pode_operar_colaborador(demandas.condominio_id, c.id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL))))))) and (public.oraqui_modulo_liberado(condominio_id,'demandas')))
;
alter policy "colaborador_v2_select_escalas" on public.escalas
 using ((((status_publicacao = ANY (ARRAY['publicada'::text, 'alterada'::text])) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.id = escalas.colaborador_id) AND (c.condominio_id = escalas.condominio_id)))))) and (public.oraqui_modulo_liberado(condominio_id,'ponto',colaborador_id)))
;
alter policy "colaborador_v2_insert_execucoes" on public.execucoes
 with check (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.id = execucoes.colaborador_id) AND (c.condominio_id = execucoes.condominio_id))))) and (public.oraqui_modulo_liberado(condominio_id,case when programacao_id is not null then 'cronograma' else 'atividades' end,colaborador_id)))
;
alter policy "colaborador_v2_select_execucoes" on public.execucoes
 using (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.id = execucoes.colaborador_id) AND (c.condominio_id = execucoes.condominio_id))))) and (public.oraqui_modulo_liberado(condominio_id,case when programacao_id is not null then 'cronograma' else 'atividades' end,colaborador_id)))
;
alter policy "colaborador_v2_update_execucoes" on public.execucoes
 using (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.id = execucoes.colaborador_id) AND (c.condominio_id = execucoes.condominio_id))))) and (public.oraqui_modulo_liberado(condominio_id,case when programacao_id is not null then 'cronograma' else 'atividades' end,colaborador_id)))
 with check (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.id = execucoes.colaborador_id) AND (c.condominio_id = execucoes.condominio_id))))) and (public.oraqui_modulo_liberado(condominio_id,case when programacao_id is not null then 'cronograma' else 'atividades' end,colaborador_id)))
;
alter policy "demo_insert_execucoes" on public.execucoes
 with check ((oraqui_demo_pode_operar_colaborador(condominio_id, colaborador_id)) and (public.oraqui_modulo_liberado(condominio_id,case when programacao_id is not null then 'cronograma' else 'atividades' end,colaborador_id)))
;
alter policy "demo_select_execucoes" on public.execucoes
 using ((oraqui_demo_pode_operar_colaborador(condominio_id, colaborador_id)) and (public.oraqui_modulo_liberado(condominio_id,case when programacao_id is not null then 'cronograma' else 'atividades' end,colaborador_id)))
;
alter policy "demo_update_execucoes" on public.execucoes
 using ((oraqui_demo_pode_operar_colaborador(condominio_id, colaborador_id)) and (public.oraqui_modulo_liberado(condominio_id,case when programacao_id is not null then 'cronograma' else 'atividades' end,colaborador_id)))
 with check ((oraqui_demo_pode_operar_colaborador(condominio_id, colaborador_id)) and (public.oraqui_modulo_liberado(condominio_id,case when programacao_id is not null then 'cronograma' else 'atividades' end,colaborador_id)))
;
alter policy "colaborador_insert_inicios_avulsos" on public.inicios_avulsos
 with check ((((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = inicios_avulsos.colaborador_id) AND (c.condominio_id = inicios_avulsos.condominio_id) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true)))) AND (EXISTS ( SELECT 1
   FROM areas a
  WHERE ((a.id = inicios_avulsos.area_id) AND (a.condominio_id = inicios_avulsos.condominio_id)))) AND ((ponto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM pontos p
  WHERE ((p.id = inicios_avulsos.ponto_id) AND (p.condominio_id = inicios_avulsos.condominio_id) AND (p.area_id = p.area_id))))))) and (public.oraqui_modulo_liberado(condominio_id,'atividades',colaborador_id)))
;
alter policy "colaborador_select_inicios_avulsos" on public.inicios_avulsos
 using (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = inicios_avulsos.colaborador_id) AND (c.condominio_id = inicios_avulsos.condominio_id) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true))))) and (public.oraqui_modulo_liberado(condominio_id,'atividades',colaborador_id)))
;
alter policy "colaborador_update_inicios_avulsos" on public.inicios_avulsos
 using (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = inicios_avulsos.colaborador_id) AND (c.condominio_id = inicios_avulsos.condominio_id) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true))))) and (public.oraqui_modulo_liberado(condominio_id,'atividades',colaborador_id)))
 with check ((((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = inicios_avulsos.colaborador_id) AND (c.condominio_id = inicios_avulsos.condominio_id) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true)))) AND (EXISTS ( SELECT 1
   FROM areas a
  WHERE ((a.id = inicios_avulsos.area_id) AND (a.condominio_id = inicios_avulsos.condominio_id)))) AND ((ponto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM pontos p
  WHERE ((p.id = inicios_avulsos.ponto_id) AND (p.condominio_id = inicios_avulsos.condominio_id) AND (p.area_id = p.area_id))))))) and (public.oraqui_modulo_liberado(condominio_id,'atividades',colaborador_id)))
;
alter policy "colaborador_cria_proprio_inicio" on public.inicios_execucao
 with check ((((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = inicios_execucao.colaborador_id) AND (c.condominio_id = inicios_execucao.condominio_id) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true)))) AND ((programacao_id IS NULL) OR (EXISTS ( SELECT 1
   FROM programacoes p
  WHERE ((p.id = inicios_execucao.programacao_id) AND (p.condominio_id = inicios_execucao.condominio_id))))) AND ((demanda_id IS NULL) OR (EXISTS ( SELECT 1
   FROM (demandas d
     JOIN colaboradores c2 ON ((c2.id = inicios_execucao.colaborador_id)))
  WHERE ((d.id = inicios_execucao.demanda_id) AND (d.condominio_id = inicios_execucao.condominio_id) AND ((d.colaborador_id = inicios_execucao.colaborador_id) OR ((d.colaborador_id IS NULL) AND ((d.funcao IS NULL) OR (lower(TRIM(BOTH FROM c2.funcao)) = lower(TRIM(BOTH FROM d.funcao)))))))))))) and (((demanda_id is not null and public.oraqui_modulo_liberado(condominio_id,'demandas',colaborador_id)) or (demanda_id is null and programacao_id is not null and public.oraqui_modulo_liberado(condominio_id,'cronograma',colaborador_id)))))
;
alter policy "colaborador_remove_proprio_inicio" on public.inicios_execucao
 using (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = inicios_execucao.colaborador_id) AND (c.condominio_id = inicios_execucao.condominio_id) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true))))) and (((demanda_id is not null and public.oraqui_modulo_liberado(condominio_id,'demandas',colaborador_id)) or (demanda_id is null and programacao_id is not null and public.oraqui_modulo_liberado(condominio_id,'cronograma',colaborador_id)))))
;
alter policy "colaborador_ve_proprio_inicio" on public.inicios_execucao
 using (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = inicios_execucao.colaborador_id) AND (c.condominio_id = inicios_execucao.condominio_id) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true))))) and (((demanda_id is not null and public.oraqui_modulo_liberado(condominio_id,'demandas',colaborador_id)) or (demanda_id is null and programacao_id is not null and public.oraqui_modulo_liberado(condominio_id,'cronograma',colaborador_id)))))
;
alter policy "colaborador_v2_select_programacoes" on public.programacoes
 using ((((ativo = true) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.condominio_id = programacoes.condominio_id) AND ((programacoes.colaborador_id = c.id) OR ((programacoes.colaborador_id IS NULL) AND (programacoes.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM programacoes.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((programacoes.colaborador_id IS NULL) AND (programacoes.funcao IS NULL)))))))) and (public.oraqui_modulo_liberado(condominio_id,'cronograma')))
;
alter policy "colaborador_v2_insert_proprio_ponto" on public.registros_ponto
 with check (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.id = registros_ponto.colaborador_id) AND (c.condominio_id = registros_ponto.condominio_id))))) and (public.oraqui_modulo_liberado(condominio_id,'ponto',colaborador_id)))
;
alter policy "colaborador_v2_select_proprio_ponto" on public.registros_ponto
 using (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.id = registros_ponto.colaborador_id) AND (c.condominio_id = registros_ponto.condominio_id))))) and (public.oraqui_modulo_liberado(condominio_id,'ponto',colaborador_id)))
;
alter policy "demo_insert_registros_ponto" on public.registros_ponto
 with check ((oraqui_demo_pode_operar_colaborador(condominio_id, colaborador_id)) and (public.oraqui_modulo_liberado(condominio_id,'ponto',colaborador_id)))
;
alter policy "demo_select_registros_ponto" on public.registros_ponto
 using ((oraqui_demo_pode_operar_colaborador(condominio_id, colaborador_id)) and (public.oraqui_modulo_liberado(condominio_id,'ponto',colaborador_id)))
;
alter policy "rp_colaborador_insert" on public.registros_posteriores
 with check ((((status = 'pendente'::text) AND (revisado_em IS NULL) AND (revisado_por IS NULL) AND (justificativa_gestor IS NULL) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = registros_posteriores.colaborador_id) AND (c.condominio_id = registros_posteriores.condominio_id) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true)))) AND ((area_id IS NULL) OR (EXISTS ( SELECT 1
   FROM areas a
  WHERE ((a.id = registros_posteriores.area_id) AND (a.condominio_id = registros_posteriores.condominio_id))))) AND ((ponto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM pontos p
  WHERE ((p.id = registros_posteriores.ponto_id) AND (p.condominio_id = registros_posteriores.condominio_id))))) AND ((atividade_id IS NULL) OR (EXISTS ( SELECT 1
   FROM atividades_v2 a
  WHERE ((a.id = registros_posteriores.atividade_id) AND (a.condominio_id = registros_posteriores.condominio_id))))))) and (public.oraqui_modulo_liberado(condominio_id,'registros_posteriores',colaborador_id)))
;
alter policy "rp_colaborador_select" on public.registros_posteriores
 using (((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = registros_posteriores.colaborador_id) AND (c.condominio_id = registros_posteriores.condominio_id) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true))))) and (public.oraqui_modulo_liberado(condominio_id,'registros_posteriores',colaborador_id)))
;
CREATE OR REPLACE FUNCTION public.oraqui_chat_eh_colaborador(cid bigint, uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from public.colaboradores c where c.condominio_id=cid and c.auth_user_id=uid and c.ativo=true and c.chat_ativo=true);
$function$
;
CREATE OR REPLACE FUNCTION public.oraqui_documento_eh_colaborador(p_colaborador_id bigint, p_condominio_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from public.colaboradores c where c.id=p_colaborador_id and c.condominio_id=p_condominio_id and c.auth_user_id=(select auth.uid()) and c.ativo and c.documentos_ativo);
$function$
;
CREATE OR REPLACE FUNCTION public.oraqui_confirmar_ciencia_documento(p_documento_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_doc public.documentos_colaborador%ROWTYPE;
  v_hora timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão não autenticada';
  END IF;
  SELECT * INTO v_doc
  FROM public.documentos_colaborador
  WHERE id = p_documento_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento não encontrado';
  END IF;
  -- Apenas colaborador ativo vinculado a ESTE condomínio e a ESTE documento.
  IF NOT EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = v_doc.colaborador_id
      AND c.condominio_id = v_doc.condominio_id
      AND c.auth_user_id = v_uid
      AND c.ativo = true AND c.documentos_ativo = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao documento';
  END IF;
  IF NOT v_doc.exigir_ciencia THEN
    RAISE EXCEPTION 'Este documento não exige ciência';
  END IF;
  IF v_doc.ciencia_em IS NOT NULL THEN
    RETURN v_doc.ciencia_em;
  END IF;
  UPDATE public.documentos_colaborador
  SET ciencia_em = clock_timestamp(), ciencia_por = v_uid
  WHERE id = p_documento_id
  RETURNING ciencia_em INTO v_hora;
  RETURN v_hora;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.colaborador_pode_ver_ocorrencia(p_ocorrencia_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.demandas d
    join public.colaboradores c
      on c.id = d.colaborador_id
     and c.condominio_id = d.condominio_id
    where d.ocorrencia_id = p_ocorrencia_id
      and c.auth_user_id = auth.uid()
      and c.ativo = true and c.demandas_ativo = true
  );
$function$
;
alter policy "oraqui_ponto_selfie_insert" on storage.objects  with check ((((bucket_id = 'selfies-ponto-privadas'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE (((c.id)::text = (storage.foldername(objects.name))[2]) AND ((c.condominio_id)::text = (storage.foldername(objects.name))[1]) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true)))))) and (exists (select 1 from public.colaboradores c where c.id::text=(storage.foldername(objects.name))[2] and c.condominio_id::text=(storage.foldername(objects.name))[1] and (public.usuario_gestao_do_condominio(c.condominio_id) or (c.auth_user_id=auth.uid() and c.ativo and c.ponto_ativo)))));
alter policy "oraqui_ponto_selfie_select" on storage.objects using ((((bucket_id = 'selfies-ponto-privadas'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE (((c.id)::text = (storage.foldername(objects.name))[2]) AND ((c.condominio_id)::text = (storage.foldername(objects.name))[1]) AND ((c.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM usuarios_gestao g
          WHERE ((g.auth_user_id = auth.uid()) AND (g.condominio_id = c.condominio_id) AND (g.ativo = true)))))))))) and (exists (select 1 from public.colaboradores c where c.id::text=(storage.foldername(objects.name))[2] and c.condominio_id::text=(storage.foldername(objects.name))[1] and (public.usuario_gestao_do_condominio(c.condominio_id) or (c.auth_user_id=auth.uid() and c.ativo and c.ponto_ativo))))) ;

-- Gate current activity uploads even when an older permissive bucket policy exists.
-- Historical legacy paths stay unchanged; current paths encode condominium and collaborator.
create policy oraqui_modulos_fotos_insert on storage.objects as restrictive
for insert to public with check (
 bucket_id <> 'fotos-atividades' or
 case
 when split_part(name,'/',1) in ('v2','inicios','demandas') then
 exists (
  select 1 from public.colaboradores c
  where c.condominio_id::text=split_part(objects.name,'/',2)
    and c.id::text=split_part(objects.name,'/',3) and c.ativo
    and (c.auth_user_id=auth.uid() or public.oraqui_demo_pode_operar_colaborador(c.condominio_id,c.id))
    and case
      when split_part(objects.name,'/',1)='demandas' then c.demandas_ativo
      when split_part(objects.name,'/',1)='inicios' and split_part(objects.name,'/',4)='demanda' then c.demandas_ativo
      when split_part(objects.name,'/',1)='inicios' and split_part(objects.name,'/',4)='programacao' then c.cronograma_ativo
      when split_part(objects.name,'/',1)='inicios' then c.atividades_ativo
      else c.atividades_ativo or c.cronograma_ativo end
 ) else true end
);

