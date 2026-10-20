-- READ ONLY. Run in the approved target before deployment.
-- Counts only: no names, documents, email addresses or credentials are returned.
SELECT 'occurrences_missing_tenant_id' AS check_name,count(*) AS violations
FROM public.ocorrencias WHERE condominio_id IS NULL
UNION ALL
SELECT 'demand_employee_tenant_mismatch',count(*) FROM public.demandas d
JOIN public.colaboradores c ON c.id=d.colaborador_id WHERE c.condominio_id<>d.condominio_id
UNION ALL
SELECT 'demand_occurrence_tenant_mismatch',count(*) FROM public.demandas d
JOIN public.ocorrencias o ON o.id=d.ocorrencia_id WHERE o.condominio_id IS DISTINCT FROM d.condominio_id
UNION ALL
SELECT 'document_employee_tenant_mismatch',count(*) FROM public.documentos_colaborador d
JOIN public.colaboradores c ON c.id=d.colaborador_id WHERE c.condominio_id<>d.condominio_id;

SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname;

SELECT id,public FROM storage.buckets ORDER BY id;

SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,p.prosecdef,p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','oraqui_private') ORDER BY n.nspname,p.proname;
