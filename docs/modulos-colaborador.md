# Módulos por colaborador e condomínio

No painel do gestor, CADASTRAR e EDITAR permitem ligar ou desligar Ponto,
Chat, Demandas, Cronograma, Registrar atividades, Registros posteriores e Documentos.
O histórico acompanha o módulo da execução (programada ou avulsa). Selfie,
geolocalização e intervalo continuam sendo configurações do Ponto.

Os seis novos campos booleanos ficam em `colaboradores`, no vínculo identificado
por `id` e `condominio_id`. O valor padrão é `true`. `ponto_ativo` mantém seu
valor anterior. Assim, nenhuma conta existente perde os novos módulos na migração.
As restrições anteriores do Chat entre colaboradores continuam valendo.

Para um acesso somente ao Ponto, ligue Ponto e desligue os seis outros módulos.
Cada vínculo da mesma conta pode ter uma configuração diferente.

## Enforcement

- As políticas RLS de colaborador e demonstração conservam seus predicados
  anteriores e acrescentam a autorização do módulo no mesmo condomínio.
- Gestão conserva suas políticas e o acesso aos registros históricos.
- Chat valida o módulo dos participantes; documentos validam leitura, arquivo
  privado e confirmação de ciência. Ponto valida também upload de selfie.
- Execuções e inícios verificam o módulo correspondente. Execuções programadas
  exigem uma programação visível no mesmo condomínio e tipo compatível.
- Uploads atuais de atividades (`v2`, `inicios`, `demandas`) recebem uma política
  restritiva com o vínculo e o módulo. Políticas e caminhos de fotos legados,
  inclusive conteúdos públicos do portal de moradores, não foram reformulados.
- O cliente atualiza os módulos a cada recarga online. A API bloqueia uma
  operação imediatamente após revogação, mesmo com uma página antiga aberta.
- A fila offline bloqueada permanece no aparelho; não é apagada. A gestão pode
  reabilitar o módulo para permitir sua sincronização. Links privados já assinados
  continuam válidos até seu prazo de expiração existente.
- O convite grava permissões junto com o cadastro, reutiliza a identidade Auth
  e conserva as permissões ao reenviar um convite existente.

## Implantação

Aplicado no projeto `rhiosvsohvqqrxzwohqu`:

1. Migração `colaborador_modulos_granulares`, reproduzida em
   `supabase/sql/colaborador_modulos.sql`.
2. Migração `colaborador_modulos_execucao_consistente`, reproduzida em
   `supabase/sql/colaborador_modulos_execucao.sql`.
3. Edge Function `convidar-colaborador`, versão 10, com verificação JWT preservada.

Os arquivos SQL são registros das migrações já aplicadas; não reaplicar manualmente.
O frontend entra no ar após integração e publicação da alteração do GitHub.
O convite de gestor agora envia o `condominio_id` esperado pela função existente.

## Verificação

Passaram os testes DOM de módulos, cadastro/edição, menus e navegação do
colaborador, menus do gestor, testes do convite com serviços simulados e testes
unitários dos relatórios. Os scripts inline e o TypeScript do convite foram
verificados quanto à sintaxe.

`tests/modulos-rls.sql` foi executado com o papel `authenticated` no projeto:
defaults, acesso permitido, revogação, início e conclusão, isolamento entre
vínculos, isolamento de gestores, bloqueio de autoedição, Ponto, Chat, documentos
e RPC de ciência. Todas as fixtures são revertidas com ROLLBACK; nenhum convite
real é enviado pelos testes. Identificadores negativos evitam depender de
sequências de dados existentes.

O Chrome headless encerrou ao iniciar neste ambiente, portanto não houve
validação visual nem teste completo com uma sessão real no navegador.
Os avisos de segurança do Supabase têm os mesmos tipos e contagens antes e
depois da alteração; as pendências anteriores não foram modificadas.
