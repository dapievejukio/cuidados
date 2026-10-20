-- ORAQUI: staged hardening. Run only after reviewing security/README.md.
-- No records are deleted or backfilled. Explicit DP grants must be provisioned
-- in the deployment transaction before committing (otherwise DP fails closed).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS oraqui_private;
REVOKE ALL ON SCHEMA oraqui_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA oraqui_private TO authenticated;

-- Retire anonymous writes/reads to the pre-Auth operational tables.
REVOKE ALL ON public.atividades, public.registros_atividade FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.login_colaborador(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_pin_colaborador(bigint,text) FROM PUBLIC,anon,authenticated;
-- RLS does not protect TRUNCATE. These grants are unnecessary for clients.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated', t.tablename);
 END LOOP;
END $$;

-- Central membership rule: exact tenant ID, allowed role, active tenant,
-- activated and unexpired temporary membership. No JWT user_metadata.
CREATE OR REPLACE FUNCTION public.usuario_gestao_do_condominio(p_condominio_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.usuarios_gestao g JOIN public.condominios c ON c.id=g.condominio_id
  WHERE g.auth_user_id=(SELECT auth.uid()) AND g.condominio_id=p_condominio_id
   AND g.ativo AND c.ativo
   AND g.perfil IN ('gestor','supervisor','admin_cliente','admin_oraqui')
   AND ((g.acesso_temporario=false AND g.acesso_expira_em IS NULL)
    OR (g.acesso_temporario=true AND g.acesso_ativado_em IS NOT NULL AND g.acesso_expira_em>now()))
 );
$$;
REVOKE ALL ON FUNCTION public.usuario_gestao_do_condominio(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_gestao_do_condominio(bigint) TO authenticated;

CREATE TABLE public.oraqui_dp_acessos (
 auth_user_id uuid NOT NULL REFERENCES auth.users(id),
 condominio_id bigint NOT NULL REFERENCES public.condominios(id),
 ativo boolean NOT NULL DEFAULT true,
 criado_em timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(auth_user_id,condominio_id)
);
ALTER TABLE public.oraqui_dp_acessos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oraqui_dp_acessos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.oraqui_dp_acessos TO authenticated;
CREATE POLICY dp_proprio_acesso ON public.oraqui_dp_acessos FOR SELECT TO authenticated
 USING (auth_user_id=(SELECT auth.uid()) AND public.usuario_gestao_do_condominio(condominio_id));
-- Grant/revoke is intentionally a trusted administrative operation, not a
-- browser operation. A management membership alone never grants DP access.
CREATE OR REPLACE FUNCTION public.oraqui_documento_eh_gestor(p_condominio_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.usuario_gestao_do_condominio(p_condominio_id) AND EXISTS (
  SELECT 1 FROM public.oraqui_dp_acessos a WHERE a.auth_user_id=(SELECT auth.uid())
   AND a.condominio_id=p_condominio_id AND a.ativo
 );
$$;
CREATE OR REPLACE FUNCTION public.oraqui_documento_eh_colaborador(p_colaborador_id bigint,p_condominio_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.colaboradores c JOIN public.condominios co ON co.id=c.condominio_id
  WHERE c.id=p_colaborador_id AND c.condominio_id=p_condominio_id
   AND c.auth_user_id=(SELECT auth.uid()) AND c.ativo AND co.ativo);
$$;
REVOKE ALL ON FUNCTION public.oraqui_documento_eh_gestor(bigint), public.oraqui_documento_eh_colaborador(bigint,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.oraqui_documento_eh_gestor(bigint), public.oraqui_documento_eh_colaborador(bigint,bigint) TO authenticated;

DROP POLICY documentos_insert ON public.documentos_colaborador;
CREATE POLICY documentos_insert ON public.documentos_colaborador FOR INSERT TO authenticated
 WITH CHECK (public.oraqui_documento_eh_gestor(condominio_id)
  AND criado_por=(SELECT auth.uid())
  AND ciencia_em IS NULL AND ciencia_por IS NULL
  AND EXISTS(SELECT 1 FROM public.colaboradores c
   WHERE c.id=documentos_colaborador.colaborador_id
    AND c.condominio_id=documentos_colaborador.condominio_id AND c.ativo)
  AND storage_path LIKE (condominio_id::text||'/'||colaborador_id::text||'/%'));
REVOKE UPDATE,DELETE ON public.documentos_colaborador FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.oraqui_chat_eh_gestor(cid bigint,uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios_gestao g JOIN public.condominios c ON c.id=g.condominio_id
  WHERE g.auth_user_id=uid AND g.condominio_id=cid AND g.ativo AND c.ativo
   AND g.perfil IN ('gestor','supervisor','admin_cliente','admin_oraqui')
   AND ((g.acesso_temporario=false AND g.acesso_expira_em IS NULL)
    OR (g.acesso_temporario AND g.acesso_ativado_em IS NOT NULL AND g.acesso_expira_em>now())));
$$;
-- Preserve the ability to validate a recipient, but apply full validity checks.
-- The current caller must be an active member of this tenant as well.
CREATE OR REPLACE FUNCTION public.oraqui_chat_eh_colaborador(cid bigint,uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.colaboradores c JOIN public.condominios co ON co.id=c.condominio_id
  WHERE c.condominio_id=cid AND c.auth_user_id=uid AND c.ativo AND co.ativo);
$$;
REVOKE ALL ON FUNCTION public.oraqui_chat_eh_colaborador(bigint,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.oraqui_chat_eh_colaborador(bigint,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.oraqui_chat_pode_enviar(cid bigint,origem uuid,destino uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE origem_gestor boolean; destino_gestor boolean; destino_colab boolean;
BEGIN
 IF origem IS DISTINCT FROM auth.uid() OR origem=destino THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.condominios c WHERE c.id=cid AND c.ativo) THEN RETURN false; END IF;
 origem_gestor:=public.usuario_gestao_do_condominio(cid);
 IF NOT origem_gestor AND NOT public.oraqui_chat_eh_colaborador(cid,origem) THEN RETURN false; END IF;
 SELECT EXISTS(SELECT 1 FROM public.usuarios_gestao g WHERE g.auth_user_id=destino
  AND g.condominio_id=cid AND g.ativo
  AND g.perfil IN ('gestor','supervisor','admin_cliente','admin_oraqui')
  AND ((g.acesso_temporario=false AND g.acesso_expira_em IS NULL)
   OR (g.acesso_temporario AND g.acesso_ativado_em IS NOT NULL AND g.acesso_expira_em>now()))) INTO destino_gestor;
 destino_colab:=public.oraqui_chat_eh_colaborador(cid,destino);
 IF NOT destino_gestor AND NOT destino_colab THEN RETURN false; END IF;
 IF origem_gestor OR destino_gestor THEN RETURN true; END IF;
 IF EXISTS(SELECT 1 FROM public.oraqui_chat_config c WHERE c.condominio_id=cid AND c.modo='todos') THEN RETURN true; END IF;
 RETURN EXISTS(SELECT 1 FROM public.colaboradores c JOIN public.oraqui_chat_permissoes p
   ON p.colaborador_id=c.id AND p.condominio_id=c.condominio_id
   WHERE c.condominio_id=cid AND c.auth_user_id=origem AND c.ativo AND p.liberado)
  AND EXISTS(SELECT 1 FROM public.colaboradores c JOIN public.oraqui_chat_permissoes p
   ON p.colaborador_id=c.id AND p.condominio_id=c.condominio_id
   WHERE c.condominio_id=cid AND c.auth_user_id=destino AND c.ativo AND p.liberado);
END;
$$;
REVOKE ALL ON FUNCTION public.oraqui_chat_eh_gestor(bigint,uuid),public.oraqui_chat_pode_enviar(bigint,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.oraqui_chat_eh_gestor(bigint,uuid),public.oraqui_chat_pode_enviar(bigint,uuid,uuid) TO authenticated;

-- Use IDs exclusively for authenticated occurrence access. Permissive policies
-- combine with OR; leaving the old name-based policies would keep them alive.
DROP POLICY IF EXISTS "gestao autenticada atualiza ocorrencias" ON public.ocorrencias;
DROP POLICY IF EXISTS "gestao autenticada visualiza ocorrencias" ON public.ocorrencias;
DROP POLICY IF EXISTS "gestao visualiza ocorrencias do condominio" ON public.ocorrencias;
-- Public creation already uses criar_ocorrencia_publica; block direct inserts
-- which could supply an unrelated condominio_id or response fields.
DROP POLICY IF EXISTS "publico pode criar ocorrencia" ON public.ocorrencias;
REVOKE INSERT ON public.ocorrencias FROM anon;
CREATE OR REPLACE FUNCTION public.colaborador_pode_ver_ocorrencia(p_ocorrencia_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.ocorrencias o JOIN public.demandas d
  ON d.ocorrencia_id=o.id AND d.condominio_id=o.condominio_id
  JOIN public.colaboradores c ON c.condominio_id=d.condominio_id
  JOIN public.condominios co ON co.id=c.condominio_id
  WHERE o.id=p_ocorrencia_id AND c.auth_user_id=(SELECT auth.uid()) AND c.ativo AND co.ativo
   AND d.status<>'cancelada' AND (d.colaborador_id=c.id OR
    (d.colaborador_id IS NULL AND (d.funcao IS NULL OR lower(trim(d.funcao))=lower(trim(c.funcao))))));
$$;
REVOKE ALL ON FUNCTION public.colaborador_pode_ver_ocorrencia(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.colaborador_pode_ver_ocorrencia(bigint) TO authenticated;

CREATE FUNCTION oraqui_private.proteger_identidade_ocorrencia() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE nome_condominio text;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.condominio_id IS DISTINCT FROM OLD.condominio_id) THEN
  RAISE EXCEPTION 'Identidade e condomínio da ocorrência são imutáveis' USING ERRCODE='42501';
 END IF;
 SELECT c.nome INTO nome_condominio FROM public.condominios c WHERE c.id=NEW.condominio_id AND c.ativo;
 IF nome_condominio IS NULL THEN RAISE EXCEPTION 'Condomínio inválido' USING ERRCODE='23514'; END IF;
 NEW.condominio:=nome_condominio;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION oraqui_private.proteger_identidade_ocorrencia() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER oraqui_proteger_identidade_ocorrencia BEFORE INSERT OR UPDATE ON public.ocorrencias
 FOR EACH ROW EXECUTE FUNCTION oraqui_private.proteger_identidade_ocorrencia();

-- Protect assignment, requirements, origin and tenant even when a client calls
-- the REST API directly. Management may edit business fields within its tenant.
CREATE FUNCTION oraqui_private.proteger_demanda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE gestor boolean; campo text;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.condominio_id IS DISTINCT FROM OLD.condominio_id) THEN
  RAISE EXCEPTION 'Identidade e condomínio da demanda são imutáveis' USING ERRCODE='42501';
 END IF;
 IF (NEW.colaborador_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.colaboradores c WHERE c.id=NEW.colaborador_id AND c.condominio_id=NEW.condominio_id))
 OR (NEW.ocorrencia_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.ocorrencias o WHERE o.id=NEW.ocorrencia_id AND o.condominio_id=NEW.condominio_id))
 OR (NEW.area_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.areas a WHERE a.id=NEW.area_id AND a.condominio_id=NEW.condominio_id))
 OR (NEW.ponto_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.pontos p WHERE p.id=NEW.ponto_id AND p.condominio_id=NEW.condominio_id AND (NEW.area_id IS NULL OR p.area_id=NEW.area_id))) THEN
  RAISE EXCEPTION 'Referência pertence a outro condomínio' USING ERRCODE='23514';
 END IF;
 -- Trusted maintenance/service calls; not reachable by a browser JWT.
 IF auth.uid() IS NULL AND current_setting('role',true) IN ('none','postgres','service_role') THEN RETURN NEW; END IF;
 gestor:=public.usuario_gestao_do_condominio(NEW.condominio_id);
 IF gestor THEN RETURN NEW; END IF;
 IF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Apenas gestão pode criar demandas' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.colaboradores c JOIN public.condominios co ON co.id=c.condominio_id
  WHERE c.auth_user_id=auth.uid() AND c.ativo AND co.ativo AND c.condominio_id=OLD.condominio_id
   AND (OLD.colaborador_id=c.id OR (OLD.colaborador_id IS NULL AND (OLD.funcao IS NULL OR lower(trim(OLD.funcao))=lower(trim(c.funcao)))))) THEN
  RAISE EXCEPTION 'Demanda não autorizada' USING ERRCODE='42501';
 END IF;
 IF (to_jsonb(NEW)-ARRAY['status','visualizada_em','iniciada_em','concluida_em','updated_at','observacao_execucao','foto_execucao_path','foto_antes_path'])
  IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','visualizada_em','iniciada_em','concluida_em','updated_at','observacao_execucao','foto_execucao_path','foto_antes_path']) THEN
  RAISE EXCEPTION 'Colaborador não pode alterar definição da demanda' USING ERRCODE='42501';
 END IF;
 IF OLD.status IN ('concluida','cancelada') OR NEW.status IS NULL OR NEW.status NOT IN ('visualizada','em_andamento','concluida')
  OR (OLD.status='em_andamento' AND NEW.status='visualizada') THEN
  RAISE EXCEPTION 'Transição de demanda não permitida' USING ERRCODE='42501';
 END IF;
 IF NEW.status='concluida' THEN
  IF NEW.exige_observacao AND nullif(trim(NEW.observacao_execucao),'') IS NULL THEN RAISE EXCEPTION 'Observação obrigatória'; END IF;
  FOREACH campo IN ARRAY ARRAY['foto_execucao_path','foto_antes_path'] LOOP
   IF (campo='foto_execucao_path' AND NEW.exige_foto) OR (campo='foto_antes_path' AND NEW.exige_foto_antes) THEN
    IF nullif(to_jsonb(NEW)->>campo,'') IS NULL THEN RAISE EXCEPTION 'Fotografia obrigatória'; END IF;
   END IF;
   IF nullif(to_jsonb(NEW)->>campo,'') IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM storage.objects o WHERE o.bucket_id='fotos-atividades' AND o.name=to_jsonb(NEW)->>campo
     AND split_part(o.name,'/',2)=NEW.condominio_id::text
     AND EXISTS(SELECT 1 FROM public.colaboradores c WHERE c.id::text=split_part(o.name,'/',3)
      AND c.condominio_id=NEW.condominio_id AND c.auth_user_id=auth.uid() AND c.ativo)
   ) THEN RAISE EXCEPTION 'Fotografia inválida para esta execução' USING ERRCODE='42501'; END IF;
  END LOOP;
  NEW.concluida_em:=now();
 END IF;
 -- This trigger never updates ocorrencias. Only management can resolve them.
 NEW.updated_at:=now();
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION oraqui_private.proteger_demanda() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER oraqui_proteger_demanda BEFORE INSERT OR UPDATE ON public.demandas
 FOR EACH ROW EXECUTE FUNCTION oraqui_private.proteger_demanda();

-- A private bucket plus tenant-aware policies protects both old and new photos.
UPDATE storage.buckets SET public=false WHERE id='fotos-atividades';
DROP POLICY IF EXISTS "gestao autenticada visualiza fotos oraqui" ON storage.objects;
DROP POLICY IF EXISTS "enviar fotos atividades" ON storage.objects;
DROP POLICY IF EXISTS "enviar fotos atividades authenticated" ON storage.objects;
DROP POLICY IF EXISTS "visualizar fotos atividades" ON storage.objects;
DROP POLICY IF EXISTS "visualizar fotos atividades authenticated" ON storage.objects;
DROP POLICY IF EXISTS "ORAQUI atualizar selfies" ON storage.objects;
DROP POLICY IF EXISTS "ORAQUI upload selfies" ON storage.objects;

CREATE FUNCTION oraqui_private.foto_atividade_autorizada(caminho text, escrita boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.colaboradores c JOIN public.condominios co ON co.id=c.condominio_id
  WHERE split_part(caminho,'/',1) IN ('v2','inicios','demandas')
   AND split_part(caminho,'/',2)=c.condominio_id::text AND split_part(caminho,'/',3)=c.id::text
   AND co.ativo AND ((c.auth_user_id=(SELECT auth.uid()) AND c.ativo)
    OR (NOT escrita AND public.usuario_gestao_do_condominio(c.condominio_id))))
 OR (NOT escrita AND EXISTS(SELECT 1 FROM public.execucoes e
  WHERE (e.foto_path=caminho OR e.foto_antes_path=caminho) AND public.usuario_gestao_do_condominio(e.condominio_id)));
$$;
CREATE FUNCTION oraqui_private.foto_ocorrencia_autorizada(caminho text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.ocorrencias o WHERE o.foto_path=caminho
  AND (public.usuario_gestao_do_condominio(o.condominio_id) OR public.colaborador_pode_ver_ocorrencia(o.id)));
$$;
REVOKE ALL ON FUNCTION oraqui_private.foto_atividade_autorizada(text,boolean),oraqui_private.foto_ocorrencia_autorizada(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION oraqui_private.foto_atividade_autorizada(text,boolean),oraqui_private.foto_ocorrencia_autorizada(text) TO authenticated;
CREATE POLICY atividade_foto_upload_isolado ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='fotos-atividades' AND oraqui_private.foto_atividade_autorizada(name,true));
CREATE POLICY atividade_foto_leitura_isolada ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='fotos-atividades' AND oraqui_private.foto_atividade_autorizada(name,false));
CREATE POLICY ocorrencia_foto_leitura_isolada ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='fotos-ocorrencias' AND oraqui_private.foto_ocorrencia_autorizada(name));

-- Existing profile/selfie/audio policies used only g.ativo, so an expired
-- temporary manager could retain access through Storage after losing the UI.
DROP POLICY oraqui_foto_select ON storage.objects;
CREATE POLICY oraqui_foto_select ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='fotos-perfil-privadas' AND EXISTS(SELECT 1 FROM public.colaboradores c
  JOIN public.condominios co ON co.id=c.condominio_id
  WHERE c.id::text=(storage.foldername(name))[1] AND co.ativo
   AND ((c.auth_user_id=(SELECT auth.uid()) AND c.ativo) OR public.usuario_gestao_do_condominio(c.condominio_id))));
DROP POLICY oraqui_ponto_selfie_select ON storage.objects;
CREATE POLICY oraqui_ponto_selfie_select ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='selfies-ponto-privadas' AND EXISTS(SELECT 1 FROM public.colaboradores c
  JOIN public.condominios co ON co.id=c.condominio_id
  WHERE c.id::text=(storage.foldername(name))[2] AND c.condominio_id::text=(storage.foldername(name))[1]
   AND co.ativo AND ((c.auth_user_id=(SELECT auth.uid()) AND c.ativo) OR public.usuario_gestao_do_condominio(c.condominio_id))));
DROP POLICY oraqui_chat_audio_upload ON storage.objects;
CREATE POLICY oraqui_chat_audio_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 bucket_id='oraqui-chat-audios' AND (storage.foldername(name))[2]=(SELECT auth.uid())::text
 AND EXISTS(SELECT 1 FROM public.condominios c WHERE c.id::text=(storage.foldername(name))[1]
  AND public.usuario_gestao_do_condominio(c.id)));

-- Must be deployed with reviewed DP grants. See README for the deployment gate.
COMMIT;
