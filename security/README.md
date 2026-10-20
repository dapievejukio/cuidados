# ORAQUI: primeira etapa de segurança (proposta, não implantada)

Esta alteração preserva as páginas e a estrutura do Gestor. Não contém certificados,
senhas, dados de usuários, arquivos `.env` ou chamadas ao eSocial.

## Escopo

- Revoga permissões anônimas das tabelas legadas `atividades` e `registros_atividade`
  e das RPCs antigas de login/PIN. A aplicação Auth atual não chama essas RPCs.
- Remove TRUNCATE, REFERENCES e TRIGGER de clientes nas tabelas de `public`.
- Centraliza a validade do vínculo da gestão por ID de condomínio.
- Cria autorização explícita `oraqui_dp_acessos` para documentos; ser gestor ou
  supervisor não concede automaticamente acesso a holerites. A própria página de
  documentos passa a listar somente os condomínios liberados para DP.
- Corrige o vínculo colaborador/condomínio na inserção de documentos, impede
  ciência forjada na publicação e bloqueia leitura por colaborador inativo.
- Aplica a validade do acesso temporário ao chat, fotos de perfil, selfies e áudio.
- Remove políticas de ocorrências baseadas em nomes. Impede mover ocorrências e
  demandas entre condomínios e valida as referências das demandas no servidor.
- Restringe a atualização de demandas pelo colaborador a campos de execução,
  valida transições e evidências obrigatórias. Não resolve ocorrências no trigger.
- Torna fotos de atividades privadas e substitui permissões amplas por vínculo
  com o condomínio, colaborador e ocorrência encaminhada.
- Alinha `reportar.html` ao resumo público já usado em `reservaigara/reportar.html`:
  consulta a RPC limitada ao local público, sem ler execuções ou fotos diretamente.

## Testes reproduzíveis

Requer Node.js e pnpm. Na raiz do repositório:

```sh
pnpm install --frozen-lockfile
pnpm test
```

Os testes executam SQL real em PostgreSQL embutido (PGlite 0.5.10), com roles
`anon`/`authenticated`, RLS, funções e triggers. São 42 verificações de isolamento,
expiração, DP, fotos, demandas e confirmação do gestor, usando somente dados fictícios.
`tests/baseline.sql` é uma fixture reduzida de colunas, políticas e funções obtidas
na auditoria; não é dump de dados, restauração completa nem migration de produção.
As RPCs de PIN são stubs nessa fixture: só a revogação é testada, sem ler seus dados.

Limites: não exercitam PostgREST, Supabase Auth real, Storage HTTP/CDN, envio de
e-mails/push, todas as Edge Functions ou os fluxos reais do navegador. Não equivalem
a uma homologação integral. A migration ainda não foi aplicada ao Supabase.

## Condições para implantação

1. Obter autorização específica para a alteração de produção e confirmar o projeto.
2. Capturar backup de schema/configuração de acesso e verificar `preflight.sql` em
   leitura. Revisar divergências em políticas, registros sem ID e referências entre
   condomínios. A migration não corrige nem exclui registros existentes.
3. Aplicar em homologação com schema completo e usuários fictícios. O schema
   `oraqui_private` não deve ser adicionado aos schemas expostos na Data API.
4. Confirmar nominalmente quais contas podem acessar DP e em quais condomínios.
   Provisionar essas autorizações administrativamente antes de liberar a página.
   A tabela começa vazia por segurança; não há concessão automática a gestores.
   Exemplo apenas ilustrativo (substituir os parâmetros no procedimento aprovado):

   ```sql
   INSERT INTO public.oraqui_dp_acessos(auth_user_id,condominio_id)
   VALUES (:auth_user_id_aprovado,:condominio_id_aprovado);
   ```

5. Validar fotos antigas: novos uploads suportam caminhos `v2/`, `inicios/` e
   `demandas/`. Fotos antigas referenciadas em execuções permanecem acessíveis à
   gestão autorizada. Caminhos antigos não reconhecidos precisam de inventário.
6. Validar o portal do morador: `reportar.html` passa a consultar somente
   `resumo_local_ocorrencia`, já existente. Não exibe fotografias de execução para
   visitantes sem vínculo. Caso seja necessário fornecer fotos a moradores por
   protocolo, isso exige um fluxo separado que confira código de acesso e limite
   tentativas; não reabrir o bucket público para contornar essa necessidade.
7. Validar integrações que usavam a leitura pública de fotos e os clientes antigos
   de login por PIN. A desativação desses acessos é deliberada, mas deve ser comunicada.
8. Aplicar a migration revisada e depois publicar `documentos-gestao.html` e
   `reportar.html`. Nenhum
   `db push`, merge ou deploy deve ser automático nesta etapa. Reexecutar advisors
   e testes de permissão após implantação autorizada.

## Pendências de segurança fora desta primeira etapa

- Auditoria completa das Edge Functions e dos mecanismos de envio/retentativa.
  A função `enviar-push-demanda` foi inspecionada em leitura: há `auth.getUser()` e
  vínculo no condomínio da demanda, apesar de `verify_jwt=false` no gateway.
  Essa configuração isolada não comprova ausência de autenticação.
- O chat de rede (`oraqui_chat_rede_mensagens`) não possui `condominio_id`.
  Antes de liberar DP, decidir sua migração para conversas com contexto de
  condomínio; ele não foi reestruturado silenciosamente nesta alteração.
- Revisão de todas as relações das demais tabelas (execuções, programações etc.)
  e políticas do portal, não apenas demandas e documentos.
- Conferir proteção contra senhas vazadas, RPCs privilegiadas e `search_path`
  sinalizados pelos advisors. Uma RPC SECURITY DEFINER acessível não é, por si só,
  prova de vulnerabilidade: cada corpo precisa de revisão.
- Homologação completa de ponto, documentos em lote, chat e entrega de fotos.

Esta proposta reduz os riscos encontrados; não declara o sistema inteiro seguro.
Não deve ser aplicada sem homologar o resumo público e provisionar as contas de
DP aprovadas. Se houver regressão, parar a liberação e
corrigir em homologação. Evitar rollback que reabra dados ao público; qualquer
restauração de permissões exige revisão do backup e autorização explícita.

Referências: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Storage](https://supabase.com/docs/guides/storage/security/access-control),
[privilégios e limites do RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
