# ORAQUI — Etapa 2: contenção de acessos indevidos (PROPOSTA, NÃO APLICADA)
Data: 2026-10-20
Ambiente examinado: Supabase rhiosvsohvqqrxzwohqu / GitHub main
Status: SOMENTE PREPARAÇÃO. Não executar na produção sem backup restaurável e testes de regressão.

## Evidências observadas
1. public.registros_atividade: políticas anon SELECT, INSERT e UPDATE com USING true / WITH CHECK true; duplicatas.
2. public.atividades: anon SELECT e INSERT sem restrição de condomínio.
3. storage bucket fotos-atividades: public=true, anon SELECT e INSERT; authenticated INSERT sem escopo de usuário.
4. public.documentos_colaborador: política documentos_insert usa c.condominio_id = c.condominio_id (tautologia) em vez de comparar com documentos_colaborador.condominio_id.
5. public.demandas: UPDATE de colaborador com USING e WITH CHECK de vínculo, mas sem limite de colunas alteráveis. Políticas RLS são por linha, não por coluna.
6. storage selfies-colaboradores: anon INSERT e UPDATE sem vínculo com identidade.
7. storage fotos-ocorrencias: anon INSERT necessário avaliar para fluxo público de ocorrência; NÃO remover sem substituto.
8. Função enviar-push-demanda: autenticação interna ainda precisa de inspeção.

## Estratégia de correção — SEM EXECUTAR
### Fase A — dependências e testes
- Verificar todos os fluxos legados que usam atividades e registros_atividade antes de remover políticas anon.
- Criar testes com usuário anônimo, colaborador A do condomínio X, colaborador B do Y, gestor de X, gestor multicon domínio e gestor temporário expirado.
- Verificar leitura de fotos já armazenadas, inclusive URLs públicas já distribuídas: tornar bucket privado não revoga automaticamente arquivos em caches/URLs anteriores.
- Confirmar uso real do fluxo de ocorrências públicas e limitar uploads por tamanho, formato, volume e caminho.

### Fase B — migrações isoladas, uma por vez
- Substituir anon SELECT/INSERT/UPDATE amplos em atividades/registros_atividade por políticas autenticadas e escopo de condomínio, após mapear identidade de cada linha.
- Migrar fotos-atividades para acesso privado por condomínio, com URLs assinadas no front-end e política SELECT baseada em vínculo autorizado; só então retirar leitura pública.
- Corrigir comparação de condomínio na política documentos_insert: c.condominio_id = documentos_colaborador.condominio_id; validar storage_path e colaborador_id.
- Restringir atualizações em demandas com função de validação de campos/trigger, ou RPC SECURITY DEFINER de operações específicas com checagem de vínculo; preservar gestão e fluxos de conclusão.
- Retirar políticas anon obsoletas em selfies apenas depois de confirmar o fluxo atual.
- Inspecionar Edge Function enviar-push-demanda e aplicar autenticação/autorização interna se necessário.

### Fase C — implantação e rollback
- Antes de qualquer DDL: backup completo verificável e restauração ensaiada em ambiente separado.
- Capturar DDL exato das políticas e funções (o snapshot JSON da Etapa 1 não inclui todas as dependências).
- Aplicar somente uma migração por vez, validar contas reais e rollback imediato se houver regressão.
- Não fazer merge do PR #1 do Codex como substituto dos testes.

## Critérios de aceite
- Acesso de atendimento@oraqui.app, Bruno, Ellen e demais gestores autorizados mantido.
- Uma mesma conta pode acessar somente seus condomínios vinculados.
- Anônimo não consegue consultar/alterar dados internos de atividades.
- Colaborador não consegue editar campos administrativos de demandas.
- Gestor e colaborador visualizam apenas fotos/documentos autorizados.
- Morador consegue criar ocorrência pública conforme regras atuais.
- Nenhuma perda de fotos pendentes/offline no navegador dos colaboradores.

## Bloqueio atual
Etapa 1 não tem backup restaurável nem ambiente Supabase de testes. Portanto, NÃO executar migrações em produção ainda.
