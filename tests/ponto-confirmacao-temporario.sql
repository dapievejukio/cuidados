-- Somente tabelas temporárias; nenhuma marcação operacional é criada.
BEGIN;
CREATE TEMP TABLE ponto_test_colaboradores(id bigint,condominio_id bigint,ativo boolean,ponto_ativo boolean,geolocalizacao_ponto_obrigatoria boolean,selfie_ponto_obrigatoria boolean);
INSERT INTO ponto_test_colaboradores VALUES(7,1,true,true,false,false),(8,2,true,true,true,true);
CREATE TEMP TABLE ponto_test_escalas(id bigint,colaborador_id bigint,condominio_id bigint);
INSERT INTO ponto_test_escalas VALUES(3,7,1);
CREATE TEMP TABLE ponto_test_objects(bucket_id text,name text);
CREATE TEMP TABLE ponto_test_registros AS SELECT * FROM public.registros_ponto WITH NO DATA;
-- Necessário para timestamp de confirmação e retentativas idempotentes online.
-- Nenhuma linha, política RLS, permissão ou regra de evidência é alterada.
CREATE OR REPLACE FUNCTION pg_temp.oraqui_validar_batida_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 c pg_temp.ponto_test_colaboradores%ROWTYPE;
 momento timestamptz := clock_timestamp();
 offline_backend boolean := current_setting('request.jwt.claim.role',true)='service_role' AND NEW.origem='offline';
 faltas text := '';
BEGIN
 SELECT * INTO c FROM pg_temp.ponto_test_colaboradores
 WHERE id=NEW.colaborador_id AND condominio_id=NEW.condominio_id AND ativo=true;
 IF c.id IS NULL OR c.ponto_ativo IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Colaborador não autorizado neste condomínio.';
 END IF;
 IF NEW.escala_id IS NOT NULL AND NOT EXISTS
 (SELECT 1 FROM pg_temp.ponto_test_escalas e WHERE e.id=NEW.escala_id
  AND e.colaborador_id=NEW.colaborador_id AND e.condominio_id=NEW.condominio_id)
 THEN RAISE EXCEPTION 'Escala de outro vínculo.';END IF;
 IF (NEW.latitude IS NULL)<>(NEW.longitude IS NULL)
 OR (NEW.latitude IS NOT NULL AND (NEW.latitude < -90 OR NEW.latitude > 90))
 OR (NEW.longitude IS NOT NULL AND (NEW.longitude < -180 OR NEW.longitude > 180))
 OR (NEW.precisao_metros IS NOT NULL AND (NEW.precisao_metros < 0 OR NEW.precisao_metros > 100000))
 THEN RAISE EXCEPTION 'GPS inválido.';END IF;
 IF c.geolocalizacao_ponto_obrigatoria AND
 (NEW.latitude IS NULL OR NEW.longitude IS NULL OR NEW.precisao_metros IS NULL) THEN
  IF NOT offline_backend THEN RAISE EXCEPTION 'GPS obrigatório.';END IF;
  faltas:=faltas||'GPS ausente; ';
 END IF;
 IF c.selfie_ponto_obrigatoria AND nullif(NEW.selfie_path,'') IS NULL THEN
  IF NOT offline_backend THEN RAISE EXCEPTION 'Selfie obrigatória.';END IF;
  faltas:=faltas||'Selfie ausente; ';
 END IF;
 IF NEW.selfie_path IS NOT NULL AND (
    NEW.selfie_path NOT LIKE NEW.condominio_id::text||'/'||NEW.colaborador_id::text||'/%'
    OR NEW.selfie_path !~ '^[0-9]+/[0-9]+/[0-9a-f-]{36}[.](jpg|png|webp)$'
    OR NOT EXISTS(SELECT 1 FROM pg_temp.ponto_test_objects o WHERE o.bucket_id='selfies-ponto-privadas' AND o.name=NEW.selfie_path)
 ) THEN RAISE EXCEPTION 'Selfie não localizada.';END IF;
 NEW.recebido_em:=momento;
 IF offline_backend THEN
  IF NEW.offline_client_id IS NULL OR NEW.horario_capturado_em IS NULL
  THEN RAISE EXCEPTION 'ID e horário offline obrigatórios.';END IF;
  IF NEW.horario_capturado_em > momento+interval '5 minutes'
     OR NEW.horario_capturado_em < momento-interval '72 hours'
  THEN RAISE EXCEPTION 'Horário offline fora da janela de recebimento. Conferência necessária.';END IF;
  NEW.registrado_em:=NEW.horario_capturado_em;
  NEW.confianca_horario:=CASE WHEN faltas<>'' THEN 'evidencias_incompletas'
                             ELSE 'conferencia_pendente' END;
  IF faltas<>'' THEN NEW.observacao:=concat('Offline excepcional: ',faltas);END IF;
 ELSE
  -- Captura confirmada no cliente: preservar instante e chave de idempotência.
  -- recebido_em continua sendo o relógio do servidor; não atribuir confiança de servidor ao relógio do aparelho.
  IF NEW.offline_client_id IS NOT NULL AND NEW.horario_capturado_em IS NOT NULL THEN
   IF NEW.horario_capturado_em > momento+interval '5 minutes'
      OR NEW.horario_capturado_em < momento-interval '72 hours'
   THEN RAISE EXCEPTION 'Horário capturado fora da janela de recebimento. Conferência necessária.';END IF;
   NEW.registrado_em:=NEW.horario_capturado_em;
   NEW.confianca_horario:='conferencia_pendente';
  ELSE
   NEW.registrado_em:=momento;NEW.horario_capturado_em:=momento;
   NEW.offline_client_id:=NULL;NEW.confianca_horario:='servidor';
  END IF;
  NEW.origem:='online';
 END IF;
 NEW.created_at:=momento;
 RETURN NEW;
END $function$
;

CREATE TRIGGER ponto_test BEFORE INSERT ON ponto_test_registros FOR EACH ROW EXECUTE FUNCTION pg_temp.oraqui_validar_batida_ponto();
DO $test$
DECLARE r record; instant timestamptz:=clock_timestamp()-interval '30 seconds'; uid uuid:='11111111-1111-4111-8111-111111111111';
BEGIN
 INSERT INTO ponto_test_registros(id,condominio_id,colaborador_id,tipo,origem,escala_id,offline_client_id,horario_capturado_em)
 VALUES(1,1,7,'entrada','online',3,uid,instant) RETURNING * INTO r;
 IF r.registrado_em<>instant OR r.offline_client_id<>uid OR r.confianca_horario<>'conferencia_pendente' OR r.recebido_em<=instant OR r.origem<>'online' THEN RAISE EXCEPTION 'Falha timestamp/ID online';END IF;
 INSERT INTO ponto_test_registros(id,condominio_id,colaborador_id,tipo,origem) VALUES(2,1,7,'saida','online') RETURNING * INTO r;
 IF r.offline_client_id IS NOT NULL OR r.confianca_horario<>'servidor' OR r.registrado_em<>r.recebido_em THEN RAISE EXCEPTION 'Falha compatibilidade legada';END IF;
 BEGIN
 INSERT INTO ponto_test_registros(id,condominio_id,colaborador_id,tipo,origem,offline_client_id,horario_capturado_em) VALUES(3,1,7,'entrada','online',uid,clock_timestamp()+interval '10 minutes');
 RAISE EXCEPTION 'Aceitou futuro';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Aceitou futuro' THEN RAISE;END IF;END;
 BEGIN
 INSERT INTO ponto_test_registros(id,condominio_id,colaborador_id,tipo,origem,offline_client_id,horario_capturado_em) VALUES(4,1,7,'entrada','online',uid,clock_timestamp()-interval '73 hours');
 RAISE EXCEPTION 'Aceitou antigo';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Aceitou antigo' THEN RAISE;END IF;END;
 BEGIN
 INSERT INTO ponto_test_registros(id,condominio_id,colaborador_id,tipo,origem) VALUES(5,2,8,'entrada','online');
 RAISE EXCEPTION 'Aceitou GPS ausente';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%GPS obrigatório%' THEN RAISE;END IF;END;
 BEGIN
 INSERT INTO ponto_test_registros(id,condominio_id,colaborador_id,tipo,origem,latitude,longitude,precisao_metros) VALUES(6,2,8,'entrada','online',-30,-51,10);
 RAISE EXCEPTION 'Aceitou selfie ausente';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Selfie obrigatória%' THEN RAISE;END IF;END;
 BEGIN
 INSERT INTO ponto_test_registros(id,condominio_id,colaborador_id,tipo,origem,escala_id) VALUES(7,2,8,'entrada','online',3);
 RAISE EXCEPTION 'Aceitou escala alheia';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Escala de outro vínculo%' THEN RAISE;END IF;END;
END $test$;
SET LOCAL request.jwt.claim.role='service_role';
INSERT INTO ponto_test_registros(id,condominio_id,colaborador_id,tipo,origem,offline_client_id,horario_capturado_em) VALUES(8,1,7,'entrada','offline','22222222-2222-4222-8222-222222222222',clock_timestamp()-interval '1 hour');
DO $test$ BEGIN IF NOT EXISTS(SELECT 1 FROM ponto_test_registros WHERE id=8 AND origem='offline' AND confianca_horario='conferencia_pendente' AND registrado_em=horario_capturado_em) THEN RAISE EXCEPTION 'Falha compatibilidade offline';END IF;END $test$;
ROLLBACK;
