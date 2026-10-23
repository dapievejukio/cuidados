-- Necessário para timestamp de confirmação e retentativas idempotentes online.
-- Nenhuma linha, política RLS, permissão ou regra de evidência é alterada.
CREATE OR REPLACE FUNCTION public.oraqui_validar_batida_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 c public.colaboradores%ROWTYPE;
 momento timestamptz := clock_timestamp();
 offline_backend boolean := current_setting('request.jwt.claim.role',true)='service_role' AND NEW.origem='offline';
 faltas text := '';
BEGIN
 SELECT * INTO c FROM public.colaboradores
 WHERE id=NEW.colaborador_id AND condominio_id=NEW.condominio_id AND ativo=true;
 IF c.id IS NULL OR c.ponto_ativo IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Colaborador não autorizado neste condomínio.';
 END IF;
 IF NEW.escala_id IS NOT NULL AND NOT EXISTS
 (SELECT 1 FROM public.escalas e WHERE e.id=NEW.escala_id
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
    OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='selfies-ponto-privadas' AND o.name=NEW.selfie_path)
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

