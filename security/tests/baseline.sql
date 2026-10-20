-- Test-only reduced schema snapshot: columns, selected policies and helpers.
-- No production records, defaults, credentials or full schema restore.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
CREATE FUNCTION storage.extension(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT reverse(split_part(reverse($1),'.',1)) $$;
GRANT USAGE ON SCHEMA storage TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;
CREATE TABLE public."areas" ("id" int8,"condominio_id" int8,"nome" text,"descricao" text,"ordem" int4,"visivel_colaborador" bool,"visivel_ocorrencia" bool,"ativo" bool,"created_at" timestamptz,"updated_at" timestamptz);
ALTER TABLE public."areas" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."areas" TO anon,authenticated;
CREATE TABLE public."atividades" ("id" int8,"tipo" text,"condominio" text,"torre" text,"local" text,"colaborador" text,"matricula" text,"cargo" text,"checklist" jsonb,"observacao" text,"foto_url" text,"data" date,"hora" time,"created_at" timestamptz);
ALTER TABLE public."atividades" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."atividades" TO anon,authenticated;
CREATE TABLE public."atividades_v2" ("id" int8,"condominio_id" int8,"nome" text,"descricao" text,"exige_foto" bool,"exige_observacao" bool,"ativo" bool,"created_at" timestamptz,"updated_at" timestamptz,"exige_foto_antes" bool);
ALTER TABLE public."atividades_v2" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."atividades_v2" TO anon,authenticated;
CREATE TABLE public."colaborador_pontos" ("id" int8,"condominio_id" int8,"colaborador_id" int8,"ponto_id" int8,"created_at" timestamptz);
ALTER TABLE public."colaborador_pontos" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."colaborador_pontos" TO anon,authenticated;
CREATE TABLE public."colaboradores" ("id" int8,"condominio" text,"nome" text,"matricula" text,"pin" text,"funcao" text,"ativo" bool,"created_at" timestamptz,"updated_at" timestamptz,"pin_hash" text,"condominio_id" int8,"auth_user_id" uuid,"email" text,"ponto_ativo" bool,"selfie_ponto_obrigatoria" bool,"geolocalizacao_ponto_obrigatoria" bool,"intervalo_ativo" bool,"intervalo_minutos" int4,"acesso_todos_pontos" bool,"foto_perfil_path" text,"empresa_folha" int2,"registro_folha" text);
ALTER TABLE public."colaboradores" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."colaboradores" TO anon,authenticated;
CREATE TABLE public."condominios" ("id" int8,"nome" text,"slug" text,"ativo" bool,"created_at" timestamptz,"updated_at" timestamptz,"ambiente_demo" bool,"demo_origem_id" int8,"demo_criado_em" timestamptz,"demo_expira_em" timestamptz);
ALTER TABLE public."condominios" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."condominios" TO anon,authenticated;
CREATE TABLE public."demandas" ("id" int8,"condominio_id" int8,"colaborador_id" int8,"funcao" text,"area_id" int8,"ponto_id" int8,"tipo" text,"titulo" text,"descricao" text,"inicio_em" timestamptz,"prazo_em" timestamptz,"exige_foto" bool,"exige_observacao" bool,"status" text,"visualizada_em" timestamptz,"iniciada_em" timestamptz,"concluida_em" timestamptz,"created_at" timestamptz,"updated_at" timestamptz,"ocorrencia_id" int8,"prioridade" text,"observacao_execucao" text,"foto_execucao_path" text,"ambiente" text,"exige_foto_antes" bool,"foto_antes_path" text,"foto_gestor_path" text);
ALTER TABLE public."demandas" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."demandas" TO anon,authenticated;
CREATE TABLE public."documentos_colaborador" ("id" uuid,"condominio_id" int8,"colaborador_id" int8,"tipo" text,"competencia" text,"nome_arquivo" text,"storage_path" text,"criado_por" uuid,"created_at" timestamptz,"exigir_ciencia" bool,"ciencia_em" timestamptz,"ciencia_por" uuid);
ALTER TABLE public."documentos_colaborador" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."documentos_colaborador" TO anon,authenticated;
CREATE TABLE public."escalas" ("id" int8,"condominio_id" int8,"colaborador_id" int8,"data" date,"tipo" text,"inicio_previsto" timestamptz,"fim_previsto" timestamptz,"intervalo_minutos" int4,"status_publicacao" text,"observacao" text,"created_at" timestamptz,"updated_at" timestamptz);
ALTER TABLE public."escalas" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."escalas" TO anon,authenticated;
CREATE TABLE public."execucoes" ("id" int8,"condominio_id" int8,"colaborador_id" int8,"programacao_id" int8,"atividade_id" int8,"area_id" int8,"ponto_id" int8,"tipo" text,"status" text,"observacao" text,"foto_path" text,"iniciada_em" timestamptz,"concluida_em" timestamptz,"created_at" timestamptz,"updated_at" timestamptz,"ambiente" text,"client_id" uuid,"foto_antes_path" text);
ALTER TABLE public."execucoes" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."execucoes" TO anon,authenticated;
CREATE TABLE public."inicios_avulsos" ("id" uuid,"condominio_id" int8,"colaborador_id" int8,"area_id" int8,"ponto_id" int8,"foto_antes_path" text,"iniciada_em" timestamptz,"concluida_em" timestamptz);
ALTER TABLE public."inicios_avulsos" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."inicios_avulsos" TO anon,authenticated;
CREATE TABLE public."inicios_execucao" ("id" uuid,"condominio_id" int8,"colaborador_id" int8,"programacao_id" int8,"demanda_id" int8,"foto_antes_path" text,"iniciada_em" timestamptz);
ALTER TABLE public."inicios_execucao" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."inicios_execucao" TO anon,authenticated;
CREATE TABLE public."jornadas" ("id" int8,"condominio" text,"colaborador_id" int8,"colaborador_nome" text,"matricula" text,"selfie_url" text,"entrada_em" timestamptz,"saida_em" timestamptz,"status" text,"created_at" timestamptz,"updated_at" timestamptz);
ALTER TABLE public."jornadas" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."jornadas" TO anon,authenticated;
CREATE TABLE public."ocorrencias" ("id" int8,"protocolo" text,"codigo_acesso" text,"condominio" text,"area" text,"detalhe" text,"local_completo" text,"descricao" text,"foto_path" text,"email" text,"deseja_retorno" bool,"status" text,"origem" text,"data" date,"hora" time,"created_at" timestamptz,"updated_at" timestamptz,"resposta_gestor" text,"respondido_em" timestamptz,"resolvido_em" timestamptz,"push_gestao_enviado_em" timestamptz,"ambiente" text,"condominio_id" int8,"area_id" int8,"ponto_id" int8);
ALTER TABLE public."ocorrencias" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."ocorrencias" TO anon,authenticated;
CREATE TABLE public."ocorrencias_historico" ("id" int8,"ocorrencia_id" int8,"protocolo" text,"tipo" text,"status" text,"mensagem" text,"autor" text,"created_at" timestamptz);
ALTER TABLE public."ocorrencias_historico" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."ocorrencias_historico" TO anon,authenticated;
CREATE TABLE public."oraqui_admins" ("auth_user_id" uuid,"ativo" bool,"created_at" timestamptz);
ALTER TABLE public."oraqui_admins" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."oraqui_admins" TO anon,authenticated;
CREATE TABLE public."oraqui_chat_config" ("condominio_id" int8,"modo" text,"atualizado_em" timestamptz);
ALTER TABLE public."oraqui_chat_config" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."oraqui_chat_config" TO anon,authenticated;
CREATE TABLE public."oraqui_chat_mensagens" ("id" int8,"condominio_id" int8,"remetente" uuid,"destinatario" uuid,"mensagem" text,"criada_em" timestamptz,"lida_em" timestamptz,"audio_path" text);
ALTER TABLE public."oraqui_chat_mensagens" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."oraqui_chat_mensagens" TO anon,authenticated;
CREATE TABLE public."oraqui_chat_permissoes" ("condominio_id" int8,"colaborador_id" int8,"liberado" bool);
ALTER TABLE public."oraqui_chat_permissoes" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."oraqui_chat_permissoes" TO anon,authenticated;
CREATE TABLE public."oraqui_chat_rede_mensagens" ("id" int8,"remetente" uuid,"destinatario" uuid,"mensagem" text,"criada_em" timestamptz,"lida_em" timestamptz);
ALTER TABLE public."oraqui_chat_rede_mensagens" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."oraqui_chat_rede_mensagens" TO anon,authenticated;
CREATE TABLE public."oraqui_portal_condominios" ("condominio_id" int8,"habilitado" bool,"atualizado_em" timestamptz,"atualizado_por" uuid);
ALTER TABLE public."oraqui_portal_condominios" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."oraqui_portal_condominios" TO anon,authenticated;
CREATE TABLE public."oraqui_portal_mensagens" ("id" int8,"condominio_id" int8,"autor_auth_id" uuid,"tipo" text,"titulo" text,"mensagem" text,"area_id" int8,"ponto_id" int8,"foto_path" text,"status" text,"resposta_cliente" text,"nota_interna" text,"demanda_id" int8,"criado_em" timestamptz,"atualizado_em" timestamptz,"respondido_em" timestamptz,"respondido_por" uuid);
ALTER TABLE public."oraqui_portal_mensagens" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."oraqui_portal_mensagens" TO anon,authenticated;
CREATE TABLE public."oraqui_portal_usuarios" ("id" int8,"condominio_id" int8,"auth_user_id" uuid,"nome" text,"ativo" bool,"criado_em" timestamptz);
ALTER TABLE public."oraqui_portal_usuarios" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."oraqui_portal_usuarios" TO anon,authenticated;
CREATE TABLE public."oraqui_superadmins" ("auth_user_id" uuid,"criado_em" timestamptz);
ALTER TABLE public."oraqui_superadmins" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."oraqui_superadmins" TO anon,authenticated;
CREATE TABLE public."pontos" ("id" int8,"condominio_id" int8,"area_id" int8,"nome" text,"descricao" text,"ordem" int4,"visivel_colaborador" bool,"visivel_ocorrencia" bool,"ativo" bool,"created_at" timestamptz,"updated_at" timestamptz);
ALTER TABLE public."pontos" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."pontos" TO anon,authenticated;
CREATE TABLE public."programacoes" ("id" int8,"condominio_id" int8,"atividade_id" int8,"area_id" int8,"ponto_id" int8,"colaborador_id" int8,"funcao" text,"tipo" text,"dias_semana" int2[],"data_inicio" date,"data_fim" date,"horario_limite" time,"prioridade" text,"exige_foto" bool,"exige_observacao" bool,"instrucoes" text,"ativo" bool,"created_at" timestamptz,"updated_at" timestamptz,"exige_foto_antes" bool);
ALTER TABLE public."programacoes" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."programacoes" TO anon,authenticated;
CREATE TABLE public."push_subscriptions" ("id" int8,"condominio_id" int8,"colaborador_id" int8,"auth_user_id" uuid,"endpoint" text,"p256dh" text,"auth" text,"user_agent" text,"ativo" bool,"created_at" timestamptz,"updated_at" timestamptz,"usuario_gestao_id" int8,"tipo_usuario" text);
ALTER TABLE public."push_subscriptions" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."push_subscriptions" TO anon,authenticated;
CREATE TABLE public."registros_atividade" ("id" int8,"tipo" text,"condominio" text,"torre" text,"local" text,"item" text,"colaborador" text,"matricula" text,"cargo" text,"observacao" text,"foto_url" text,"data" date,"hora" time,"created_at" timestamptz,"colaborador_id" int8,"jornada_id" int8,"area" text,"detalhe_area" text,"iniciado_em" timestamptz,"finalizado_em" timestamptz,"status" text);
ALTER TABLE public."registros_atividade" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."registros_atividade" TO anon,authenticated;
CREATE TABLE public."registros_ponto" ("id" int8,"condominio_id" int8,"colaborador_id" int8,"escala_id" int8,"tipo" text,"registrado_em" timestamptz,"latitude" numeric,"longitude" numeric,"precisao_metros" numeric,"selfie_path" text,"observacao" text,"created_at" timestamptz);
ALTER TABLE public."registros_ponto" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."registros_ponto" TO anon,authenticated;
CREATE TABLE public."registros_posteriores" ("id" int8,"condominio_id" int8,"colaborador_id" int8,"lote_id" uuid,"data_servico" date,"horario_inicio" time,"horario_fim" time,"area_id" int8,"ponto_id" int8,"atividade_id" int8,"descricao_atividade" text,"observacao" text,"status" text,"registrado_em" timestamptz,"revisado_em" timestamptz,"revisado_por" uuid,"justificativa_gestor" text);
ALTER TABLE public."registros_posteriores" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."registros_posteriores" TO anon,authenticated;
CREATE TABLE public."usuarios_gestao" ("id" int8,"auth_user_id" uuid,"condominio_id" int8,"nome" text,"perfil" text,"ativo" bool,"created_at" timestamptz,"updated_at" timestamptz,"acesso_expira_em" timestamptz,"acesso_temporario" bool,"acesso_ativado_em" timestamptz);
ALTER TABLE public."usuarios_gestao" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."usuarios_gestao" TO anon,authenticated;
CREATE TABLE public."v_gestor" ("id" int8,"auth_user_id" uuid,"condominio_id" int8,"nome" text,"perfil" text,"ativo" bool,"created_at" timestamptz,"updated_at" timestamptz,"acesso_expira_em" timestamptz,"acesso_temporario" bool,"acesso_ativado_em" timestamptz);
ALTER TABLE public."v_gestor" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."v_gestor" TO anon,authenticated;
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
      and c.ativo = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.gestao_pode_ver_ocorrencia(p_condominio text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

    select exists (
        select 1
        from public.usuarios_gestao ug
        join public.condominios c
          on c.id = ug.condominio_id

        where ug.auth_user_id = auth.uid()
          and ug.ativo = true
          and c.ativo = true

          and (
              (
                  ug.acesso_temporario = false
                  and ug.acesso_expira_em is null
              )
              or
              (
                  ug.acesso_temporario = true
                  and ug.acesso_ativado_em is not null
                  and ug.acesso_expira_em > now()
              )
          )

          and lower(trim(c.nome)) =
              lower(trim(p_condominio))
    );

$function$;

CREATE OR REPLACE FUNCTION public.oraqui_chat_eh_colaborador(cid bigint, uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from public.colaboradores c where c.condominio_id=cid and c.auth_user_id=uid and c.ativo=true);
$function$;

CREATE OR REPLACE FUNCTION public.oraqui_chat_eh_gestor(cid bigint, uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from public.usuarios_gestao g where g.condominio_id=cid and g.auth_user_id=uid and g.ativo=true);
$function$;

CREATE OR REPLACE FUNCTION public.oraqui_chat_pode_enviar(cid bigint, origem uuid, destino uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare modo_atual text;
begin
 if origem is null or destino is null or origem=destino then return false; end if;
 if not (public.oraqui_chat_eh_gestor(cid,origem) or public.oraqui_chat_eh_colaborador(cid,origem)) then return false; end if;
 if not (public.oraqui_chat_eh_gestor(cid,destino) or public.oraqui_chat_eh_colaborador(cid,destino)) then return false; end if;
 -- Gestores podem falar com qualquer membro autorizado do condomínio.
 if public.oraqui_chat_eh_gestor(cid,origem) or public.oraqui_chat_eh_gestor(cid,destino) then return true; end if;
 select coalesce((select modo from public.oraqui_chat_config where condominio_id=cid),'limitado') into modo_atual;
 if modo_atual='todos' then return true; end if;
 return exists(select 1 from public.colaboradores a join public.oraqui_chat_permissoes pa
   on pa.condominio_id=a.condominio_id and pa.colaborador_id=a.id
   where a.condominio_id=cid and a.auth_user_id=origem and a.ativo and pa.liberado)
 and exists(select 1 from public.colaboradores b join public.oraqui_chat_permissoes pb
   on pb.condominio_id=b.condominio_id and pb.colaborador_id=b.id
   where b.condominio_id=cid and b.auth_user_id=destino and b.ativo and pb.liberado);
end;$function$;

CREATE OR REPLACE FUNCTION public.oraqui_chat_rede_e_gestao(p_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p_uid IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.oraqui_superadmins s WHERE s.auth_user_id = p_uid)
    OR EXISTS (
      SELECT 1 FROM public.usuarios_gestao g
      WHERE g.auth_user_id = p_uid AND g.ativo IS TRUE
        AND (g.acesso_expira_em IS NULL OR g.acesso_expira_em > now())
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.oraqui_demo_pode_operar_colaborador(p_condominio_id bigint, p_colaborador_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1

        FROM public.usuarios_gestao ug

        JOIN public.condominios co
          ON co.id = ug.condominio_id

        JOIN public.colaboradores c
          ON c.id = p_colaborador_id
         AND c.condominio_id = ug.condominio_id

        WHERE ug.auth_user_id = auth.uid()

          AND ug.condominio_id = p_condominio_id

          AND ug.ativo = true

          AND ug.perfil = 'admin_cliente'

          AND ug.acesso_temporario = true

          AND ug.acesso_ativado_em IS NOT NULL

          AND ug.acesso_expira_em IS NOT NULL

          AND ug.acesso_expira_em > now()

          AND co.id = p_condominio_id

          AND co.ativo = true

          AND co.ambiente_demo = true

          AND co.demo_origem_id = 4

          AND c.ativo = true
    );
$function$;

CREATE OR REPLACE FUNCTION public.oraqui_documento_eh_colaborador(p_colaborador_id bigint, p_condominio_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from public.colaboradores c where c.id=p_colaborador_id and c.condominio_id=p_condominio_id and c.auth_user_id=(select auth.uid()));
$function$;

CREATE OR REPLACE FUNCTION public.oraqui_documento_eh_gestor(p_condominio_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from public.usuarios_gestao g where g.auth_user_id=(select auth.uid()) and g.condominio_id=p_condominio_id and g.ativo=true);
$function$;

CREATE OR REPLACE FUNCTION public.oraqui_portal_autorizado(p_condominio_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT EXISTS (
  SELECT 1 FROM public.oraqui_portal_usuarios u
  JOIN public.oraqui_portal_condominios f ON f.condominio_id = u.condominio_id
  WHERE u.condominio_id = p_condominio_id AND u.auth_user_id = auth.uid()
    AND u.ativo = true AND f.habilitado = true
 )
$function$;

CREATE OR REPLACE FUNCTION public.usuario_gestao_do_condominio(p_condominio_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

    select exists (
        select 1
        from public.usuarios_gestao ug
        join public.condominios c
          on c.id = ug.condominio_id

        where ug.auth_user_id = auth.uid()
          and ug.condominio_id = p_condominio_id
          and ug.ativo = true
          and c.ativo = true

          and (

              -- ACESSO NORMAL/PERMANENTE
              (
                  ug.acesso_temporario = false
                  and ug.acesso_expira_em is null
              )

              or

              -- ACESSO TEMPORÁRIO JÁ ATIVADO E AINDA VÁLIDO
              (
                  ug.acesso_temporario = true
                  and ug.acesso_ativado_em is not null
                  and ug.acesso_expira_em > now()
              )

          )
    );

$function$;

CREATE POLICY "permitir inserir atividades" ON "public"."atividades" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "permitir visualizar atividades" ON "public"."atividades" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "enviar fotos atividades" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK ((bucket_id = 'fotos-atividades'::text));
CREATE POLICY "visualizar fotos atividades" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "anon" USING ((bucket_id = 'fotos-atividades'::text));
CREATE POLICY "permitir inserir registros atividade" ON "public"."registros_atividade" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "permitir visualizar registros atividade" ON "public"."registros_atividade" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "publico pode enviar foto ocorrencia" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK ((bucket_id = 'fotos-ocorrencias'::text));
CREATE POLICY "publico pode visualizar registros atividade" ON "public"."registros_atividade" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "ORAQUI upload selfies" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK ((bucket_id = 'selfies-colaboradores'::text));
CREATE POLICY "ORAQUI atualizar selfies" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "anon" USING ((bucket_id = 'selfies-colaboradores'::text)) WITH CHECK ((bucket_id = 'selfies-colaboradores'::text));
CREATE POLICY "ORAQUI consultar atividades colaborador" ON "public"."registros_atividade" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "ORAQUI criar atividades colaborador" ON "public"."registros_atividade" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "ORAQUI atualizar atividades colaborador" ON "public"."registros_atividade" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "gestao_select_demandas" ON "public"."demandas" AS PERMISSIVE FOR SELECT TO "authenticated" USING (usuario_gestao_do_condominio(condominio_id));
CREATE POLICY "gestao_insert_demandas" ON "public"."demandas" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (usuario_gestao_do_condominio(condominio_id));
CREATE POLICY "gestao_update_demandas" ON "public"."demandas" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (usuario_gestao_do_condominio(condominio_id)) WITH CHECK (usuario_gestao_do_condominio(condominio_id));
CREATE POLICY "gestao_v2_select_colaboradores" ON "public"."colaboradores" AS PERMISSIVE FOR SELECT TO "authenticated" USING (usuario_gestao_do_condominio(condominio_id));
CREATE POLICY "gestao_v2_insert_colaboradores" ON "public"."colaboradores" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (usuario_gestao_do_condominio(condominio_id));
CREATE POLICY "gestao_v2_update_colaboradores" ON "public"."colaboradores" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (usuario_gestao_do_condominio(condominio_id)) WITH CHECK (usuario_gestao_do_condominio(condominio_id));
CREATE POLICY "colaborador_v2_select_proprio_perfil" ON "public"."colaboradores" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth_user_id = auth.uid()));
CREATE POLICY "publico pode criar ocorrencia" ON "public"."ocorrencias" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (((condominio = 'Reserva Igara'::text) AND (status = 'Aberta'::text)));
CREATE POLICY "enviar fotos atividades authenticated" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((bucket_id = 'fotos-atividades'::text));
CREATE POLICY "visualizar fotos atividades authenticated" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((bucket_id = 'fotos-atividades'::text));
CREATE POLICY "gestao autenticada visualiza ocorrencias" ON "public"."ocorrencias" AS PERMISSIVE FOR SELECT TO "authenticated" USING (gestao_pode_ver_ocorrencia(condominio));
CREATE POLICY "gestao autenticada visualiza fotos oraqui" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((bucket_id = ANY (ARRAY['fotos-atividades'::text, 'fotos-ocorrencias'::text, 'ocorrencias'::text, 'ocorrencias-fotos'::text, 'fotos'::text])));
CREATE POLICY "colaborador visualiza ocorrencia encaminhada" ON "public"."ocorrencias" AS PERMISSIVE FOR SELECT TO "authenticated" USING (colaborador_pode_ver_ocorrencia(id));
CREATE POLICY "gestao autenticada atualiza ocorrencias" ON "public"."ocorrencias" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (gestao_pode_ver_ocorrencia(condominio)) WITH CHECK (gestao_pode_ver_ocorrencia(condominio));
CREATE POLICY "gestao consulta vinculos permitidos" ON "public"."usuarios_gestao" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth_user_id = auth.uid()) OR usuario_gestao_do_condominio(condominio_id)));
CREATE POLICY "colaborador_v2_select_condominios_vinculados" ON "public"."condominios" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((ativo = true) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.condominio_id = condominios.id) AND (c.ativo = true))))));
CREATE POLICY "chat_permissoes_ler" ON "public"."oraqui_chat_permissoes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid)) OR oraqui_chat_eh_colaborador(condominio_id, ( SELECT auth.uid() AS uid))));
CREATE POLICY "usuario consulta proprio condominio" ON "public"."condominios" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((ativo = true) AND (usuario_gestao_do_condominio(id) OR (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.condominio_id = condominios.id)))))));
CREATE POLICY "colaborador_v2_select_demandas" ON "public"."demandas" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((status <> 'cancelada'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.condominio_id = demandas.condominio_id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL))))))));
CREATE POLICY "colaborador_v2_update_demandas" ON "public"."demandas" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((status <> 'cancelada'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.condominio_id = demandas.condominio_id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL)))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.auth_user_id = auth.uid()) AND (c.ativo = true) AND (c.condominio_id = demandas.condominio_id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL)))))));
CREATE POLICY "gestao visualiza ocorrencias do condominio" ON "public"."ocorrencias" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (usuarios_gestao ug
     JOIN condominios c ON ((c.id = ug.condominio_id)))
  WHERE ((ug.auth_user_id = auth.uid()) AND (ug.ativo = true) AND (ug.perfil = ANY (ARRAY['gestor'::text, 'supervisor'::text, 'admin_cliente'::text, 'admin_oraqui'::text])) AND (c.ativo = true) AND (((ug.acesso_temporario = false) AND (ug.acesso_expira_em IS NULL)) OR ((ug.acesso_temporario = true) AND (ug.acesso_ativado_em IS NOT NULL) AND (ug.acesso_expira_em > now()))) AND (c.nome = ocorrencias.condominio)))));
CREATE POLICY "demo_select_demandas" ON "public"."demandas" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((status <> 'cancelada'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.condominio_id = demandas.condominio_id) AND (c.ativo = true) AND oraqui_demo_pode_operar_colaborador(demandas.condominio_id, c.id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL))))))));
CREATE POLICY "demo_update_demandas" ON "public"."demandas" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((status <> 'cancelada'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.condominio_id = demandas.condominio_id) AND (c.ativo = true) AND oraqui_demo_pode_operar_colaborador(demandas.condominio_id, c.id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL)))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.condominio_id = demandas.condominio_id) AND (c.ativo = true) AND oraqui_demo_pode_operar_colaborador(demandas.condominio_id, c.id) AND ((demandas.colaborador_id = c.id) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NOT NULL) AND (lower(TRIM(BOTH FROM demandas.funcao)) = lower(TRIM(BOTH FROM c.funcao)))) OR ((demandas.colaborador_id IS NULL) AND (demandas.funcao IS NULL)))))));
CREATE POLICY "documentos_select" ON "public"."documentos_colaborador" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((oraqui_documento_eh_gestor(condominio_id) OR oraqui_documento_eh_colaborador(colaborador_id, condominio_id)));
CREATE POLICY "documentos_insert" ON "public"."documentos_colaborador" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((oraqui_documento_eh_gestor(condominio_id) AND (criado_por = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = documentos_colaborador.colaborador_id) AND (c.condominio_id = c.condominio_id)))) AND (storage_path ~~ ((((condominio_id)::text || '/'::text) || (colaborador_id)::text) || '/%'::text))));
CREATE POLICY "oraqui_documentos_upload" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'documentos-privados'::text) AND (storage.extension(name) = 'pdf'::text) AND oraqui_documento_eh_gestor(
CASE
    WHEN (split_part(name, '/'::text, 1) ~ '^[0-9]+$'::text) THEN (split_part(name, '/'::text, 1))::bigint
    ELSE ('-1'::integer)::bigint
END) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.condominio_id =
        CASE
            WHEN (split_part(objects.name, '/'::text, 1) ~ '^[0-9]+$'::text) THEN (split_part(objects.name, '/'::text, 1))::bigint
            ELSE ('-1'::integer)::bigint
        END) AND (c.id =
        CASE
            WHEN (split_part(objects.name, '/'::text, 2) ~ '^[0-9]+$'::text) THEN (split_part(objects.name, '/'::text, 2))::bigint
            ELSE ('-1'::integer)::bigint
        END))))));
CREATE POLICY "oraqui_documentos_leitura" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'documentos-privados'::text) AND (EXISTS ( SELECT 1
   FROM documentos_colaborador d
  WHERE ((d.storage_path = objects.name) AND (oraqui_documento_eh_gestor(d.condominio_id) OR oraqui_documento_eh_colaborador(d.colaborador_id, d.condominio_id)))))));
CREATE POLICY "oraqui_documentos_limpar_upload" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'documentos-privados'::text) AND oraqui_documento_eh_gestor(
CASE
    WHEN (split_part(name, '/'::text, 1) ~ '^[0-9]+$'::text) THEN (split_part(name, '/'::text, 1))::bigint
    ELSE ('-1'::integer)::bigint
END) AND (NOT (EXISTS ( SELECT 1
   FROM documentos_colaborador d
  WHERE (d.storage_path = objects.name))))));
CREATE POLICY "chat_config_ler" ON "public"."oraqui_chat_config" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid)) OR oraqui_chat_eh_colaborador(condominio_id, ( SELECT auth.uid() AS uid))));
CREATE POLICY "chat_config_inserir" ON "public"."oraqui_chat_config" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid)));
CREATE POLICY "chat_config_editar" ON "public"."oraqui_chat_config" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid))) WITH CHECK (oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid)));
CREATE POLICY "chat_permissoes_inserir" ON "public"."oraqui_chat_permissoes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE ((c.id = oraqui_chat_permissoes.colaborador_id) AND (c.condominio_id = oraqui_chat_permissoes.condominio_id))))));
CREATE POLICY "chat_permissoes_editar" ON "public"."oraqui_chat_permissoes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid))) WITH CHECK (oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid)));
CREATE POLICY "chat_msg_ler" ON "public"."oraqui_chat_mensagens" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((((( SELECT auth.uid() AS uid) = remetente) OR (( SELECT auth.uid() AS uid) = destinatario)) AND (oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid)) OR oraqui_chat_eh_colaborador(condominio_id, ( SELECT auth.uid() AS uid)))));
CREATE POLICY "chat_msg_enviar" ON "public"."oraqui_chat_mensagens" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((remetente = ( SELECT auth.uid() AS uid)) AND (lida_em IS NULL) AND oraqui_chat_pode_enviar(condominio_id, remetente, destinatario)));
CREATE POLICY "chat_msg_lida" ON "public"."oraqui_chat_mensagens" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((destinatario = ( SELECT auth.uid() AS uid)) AND (oraqui_chat_eh_gestor(condominio_id, ( SELECT auth.uid() AS uid)) OR oraqui_chat_eh_colaborador(condominio_id, ( SELECT auth.uid() AS uid))))) WITH CHECK ((destinatario = ( SELECT auth.uid() AS uid)));
CREATE POLICY "oraqui_foto_insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'fotos-perfil-privadas'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE (((c.id)::text = (storage.foldername(objects.name))[1]) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true))))));
CREATE POLICY "oraqui_foto_select" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'fotos-perfil-privadas'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE (((c.id)::text = (storage.foldername(objects.name))[1]) AND ((c.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM usuarios_gestao g
          WHERE ((g.auth_user_id = auth.uid()) AND (g.condominio_id = c.condominio_id) AND (g.ativo = true))))))))));
CREATE POLICY "gestao_select_ocorrencias_por_id" ON "public"."ocorrencias" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((condominio_id IS NOT NULL) AND usuario_gestao_do_condominio(condominio_id)));
CREATE POLICY "gestao_insert_ocorrencias_por_id" ON "public"."ocorrencias" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((condominio_id IS NOT NULL) AND usuario_gestao_do_condominio(condominio_id)));
CREATE POLICY "gestao_update_ocorrencias_por_id" ON "public"."ocorrencias" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((condominio_id IS NOT NULL) AND usuario_gestao_do_condominio(condominio_id))) WITH CHECK (((condominio_id IS NOT NULL) AND usuario_gestao_do_condominio(condominio_id)));
CREATE POLICY "portal_sindico_select_condominios" ON "public"."condominios" AS PERMISSIVE FOR SELECT TO "authenticated" USING (oraqui_portal_autorizado(id));
CREATE POLICY "oraqui_ponto_selfie_insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'selfies-ponto-privadas'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE (((c.id)::text = (storage.foldername(objects.name))[2]) AND ((c.condominio_id)::text = (storage.foldername(objects.name))[1]) AND (c.auth_user_id = auth.uid()) AND (c.ativo = true))))));
CREATE POLICY "oraqui_ponto_selfie_select" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'selfies-ponto-privadas'::text) AND (EXISTS ( SELECT 1
   FROM colaboradores c
  WHERE (((c.id)::text = (storage.foldername(objects.name))[2]) AND ((c.condominio_id)::text = (storage.foldername(objects.name))[1]) AND ((c.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM usuarios_gestao g
          WHERE ((g.auth_user_id = auth.uid()) AND (g.condominio_id = c.condominio_id) AND (g.ativo = true))))))))));
CREATE POLICY "oraqui_chat_audio_upload" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'oraqui-chat-audios'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text) AND (EXISTS ( SELECT 1
   FROM usuarios_gestao g
  WHERE ((g.auth_user_id = auth.uid()) AND ((g.condominio_id)::text = (storage.foldername(objects.name))[1]) AND (g.ativo = true))))));
CREATE POLICY "oraqui_chat_audio_read" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'oraqui-chat-audios'::text) AND (EXISTS ( SELECT 1
   FROM oraqui_chat_mensagens m
  WHERE ((m.audio_path = objects.name) AND ((m.remetente = auth.uid()) OR (m.destinatario = auth.uid())) AND ((m.condominio_id)::text = (storage.foldername(objects.name))[1]))))));
CREATE POLICY "upload_foto_demanda_gestor" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'fotos-demandas-gestor'::text) AND (EXISTS ( SELECT 1
   FROM usuarios_gestao g
  WHERE ((g.auth_user_id = auth.uid()) AND (g.ativo = true) AND ((g.condominio_id)::text = (storage.foldername(objects.name))[1]))))));
CREATE POLICY "read_foto_demanda_gestor" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'fotos-demandas-gestor'::text) AND (EXISTS ( SELECT 1
   FROM demandas d
  WHERE ((d.foto_gestor_path = objects.name) AND ((EXISTS ( SELECT 1
           FROM usuarios_gestao g
          WHERE ((g.auth_user_id = auth.uid()) AND (g.condominio_id = d.condominio_id) AND (g.ativo = true)))) OR (EXISTS ( SELECT 1
           FROM colaboradores c
          WHERE ((c.auth_user_id = auth.uid()) AND (c.id = d.colaborador_id) AND (c.condominio_id = d.condominio_id))))))))));
CREATE POLICY "oraqui_demanda_gestor_upload" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'fotos-demandas-gestor'::text) AND (EXISTS ( SELECT 1
   FROM usuarios_gestao g
  WHERE ((g.auth_user_id = auth.uid()) AND (g.ativo = true) AND ((g.condominio_id)::text = (storage.foldername(objects.name))[1]))))));
CREATE POLICY "oraqui_demanda_gestor_read" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'fotos-demandas-gestor'::text) AND (EXISTS ( SELECT 1
   FROM demandas d
  WHERE ((d.foto_gestor_path = objects.name) AND ((EXISTS ( SELECT 1
           FROM usuarios_gestao g
          WHERE ((g.auth_user_id = auth.uid()) AND (g.ativo = true) AND (g.condominio_id = d.condominio_id)))) OR (EXISTS ( SELECT 1
           FROM colaboradores c
          WHERE ((c.auth_user_id = auth.uid()) AND (c.id = d.colaborador_id) AND (c.condominio_id = d.condominio_id))))))))));
REVOKE UPDATE ON public.oraqui_chat_mensagens FROM authenticated;
GRANT UPDATE(lida_em) ON public.oraqui_chat_mensagens TO authenticated;


ALTER TABLE public.condominios ADD PRIMARY KEY(id);

-- Deprecated PIN RPCs: signatures only; implementation is deliberately absent.
CREATE FUNCTION public.login_colaborador(text,text,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE FUNCTION public.validar_pin_colaborador(bigint,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
