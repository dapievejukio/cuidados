-- A program id cannot be used to bypass the avulsa module or cross condominiums.
create policy oraqui_modulos_execucao_insert on public.execucoes as restrictive
for insert to authenticated with check (
 public.usuario_gestao_do_condominio(condominio_id) or
 ((programacao_id is null and tipo='avulsa' and public.oraqui_modulo_liberado(condominio_id,'atividades',colaborador_id)) or
  (programacao_id is not null and tipo in ('programada','extraordinaria') and
   exists(select 1 from public.programacoes p where p.id=execucoes.programacao_id and p.condominio_id=execucoes.condominio_id)
   and public.oraqui_modulo_liberado(condominio_id,'cronograma',colaborador_id)))
);
create policy oraqui_modulos_execucao_update on public.execucoes as restrictive
for update to authenticated using (true) with check (
 public.usuario_gestao_do_condominio(condominio_id) or
 ((programacao_id is null and tipo='avulsa' and public.oraqui_modulo_liberado(condominio_id,'atividades',colaborador_id)) or
  (programacao_id is not null and tipo in ('programada','extraordinaria') and
   exists(select 1 from public.programacoes p where p.id=execucoes.programacao_id and p.condominio_id=execucoes.condominio_id)
   and public.oraqui_modulo_liberado(condominio_id,'cronograma',colaborador_id)))
);

