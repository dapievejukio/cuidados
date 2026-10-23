# Auditoria de convites de colaboradores — 23/10/2026

## Decisão operacional

O fluxo não deve ser considerado homologado de ponta a ponta. Há correções neste PR e falta um convite real para endereço autorizado, seguido de abertura do link e login. Nenhum convite real foi enviado, nenhuma conta foi criada e nenhum dado/configuração de produção foi alterado nesta auditoria. Este PR não implanta funções nem publica páginas.

## Base e evidências de produção

- GitHub main: `c6c844c9775640ecc299fb673ae664dc98d324db`.
- `https://oraqui.app/{index.html,gestor.html,colaborador.html,definir-senha.html}` responderam HTTP 200 e tinham conteúdo idêntico à main no momento da inspeção. Scripts inline passaram na análise de sintaxe.
- Supabase `rhiosvsohvqqrxzwohqu`: `convidar-colaborador` ACTIVE v10, `verify_jwt=true`, fonte publicada idêntica à main. `reenviar-convite-colaborador` ACTIVE v12, `verify_jwt=true`; sua fonte não estava versionada na main e foi incorporada ao PR antes da correção.
- OPTIONS dos dois endpoints: HTTP 200, CORS `*`, origem consultada `https://oraqui.app`. Os logs de funções registraram essas sondagens. Isso comprova disponibilidade/CORS, não execução autenticada do convite.
- Configuração visual do painel: Site URL `https://oraqui.app`; allowlist contém `https://oraqui.app/definir-senha.html`. SMTP customizado habilitado, host `smtp.resend.com`, porta 587. Portanto o provedor configurado é Resend; Gmail é destino, não provedor de envio.
- Templates de convite, magic link e recuperação usam `{{ .ConfirmationURL }}` e estão em inglês. Os fluxos apontam para a URL autorizada. Não houve mudança de template.
- Gmail conectado: localizado convite antigo, recebido em 07/10/2026, remetente `ORAQUI <atendimento@oraqui.app>`, cabeçalho do projeto correto, SPF e DKIM `pass`; infraestrutura Resend/Amazon SES. Não foi aberto link de autenticação nem consultado corpo contendo tokens. Essa entrega histórica não comprova entrega atual.
- Painel de secrets mostra `RESEND_API_KEY` e os secrets padrão `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Nenhum valor foi aberto, copiado ou alterado; presença não comprova validade. A correção de reenvio passa a usar o SMTP Auth já utilizado no convite inicial.

## Bugs e efeitos das correções

1. A página legada `reservaigara/gestor.html` omitia `condominio_id` no convite e no reenvio: ambas as funções exigem esse campo. Agora envia o condomínio da tela e trata erros e avisos.
2. `gestor.html` ignorava `aviso` quando a conta já existia, o vínculo era salvo, mas o e-mail falhava: agora mostra o aviso para permitir reenvio.
3. Busca `ilike(email)` interpretava `_` e `%` como curingas. Agora escapa esses caracteres, evitando localizar outra pessoa ou bloquear erroneamente um endereço válido.
4. Cadastrar novamente um colaborador inativo enviava acesso sem reativá-lo; um registro sem Auth poderia receber link usando identidade encontrada em outro vínculo, permanecendo desconectado localmente. Agora retorna 409 e exige reativação/regularização explícita, sem alterar permissões.
5. O reenvio publicado aceitava gestor temporário expirado e não bloqueava ambiente demo, diferentemente do convite inicial. Agora usa as mesmas condições de validade e bloqueia demo.
6. O reenvio publicado confirmava administrativamente o e-mail antes de enviar e dependia de geração de recovery + chamada direta à API Resend. Agora envia recovery para e-mail confirmado e magic link com `shouldCreateUser:false` para não confirmado, pelo SMTP Auth. Não confirma e-mail, muda senha, cria usuário ou muda vínculos durante o reenvio. Efeito: passa a respeitar limites/templates SMTP Auth; mensagens podem aparecer em inglês, conforme templates atuais.
7. A definição de senha recusava Auth reutilizado sem `user_metadata.perfil` OraQui, embora houvesse colaborador ativo. Agora aceita como alternativa um vínculo ativo da mesma identidade consultado sob RLS. Continua exigindo credencial Auth na URL, validação no servidor e mesma identidade no submit. Não atribui perfil nem altera metadados ou autorização de banco.
8. O rollback do convite excluía Auth quando a inserção local falhava. Em concorrência, outra solicitação pode já usar a identidade em outro condomínio. Agora preserva Auth; uma nova tentativa encontra e reutiliza a conta. O convite inicial ainda precede a inserção local: se esta falhar, pode existir e-mail já enviado e conta sem vínculo até nova tentativa/regularização. Não há transação distribuída entre Auth, SMTP e banco.
9. A inicialização do colaborador podia aguardar Auth/consulta de vínculo/condomínio indefinidamente. Agora limita essas esperas a 15 segundos e troca o estado de carregamento por erro visível. Não apaga sessão, PIN, IndexedDB ou fila; uma operação rejeitada por timeout não continua para liberar o perfil. Escolha manual de condomínio não recebe timeout.

## Identidade, condomínio e RLS

- A função inicial exige usuário validado por `getUser`, perfil gestor/supervisor/admin_cliente/admin_oraqui ativo no condomínio escolhido e acesso permanente válido ou temporário ativado e não expirado. Bloqueia condomínio inativo/demo.
- Reutiliza Auth por vínculo existente ou busca administrativa paginada, confere e-mail e recusa múltiplas identidades divergentes. Não muda senha de uma conta reutilizada: envia link. O login prioriza gestão se a mesma identidade também tem acesso de gestor; esse comportamento foi preservado.
- Índices únicos presentes: `(condominio_id, lower(email))`, `(auth_user_id, condominio_id)` e matrícula por `(condominio, matricula)`. Não havia grupos duplicados por e-mail/condomínio na consulta.
- RLS habilitada em `colaboradores`, `usuarios_gestao`, `condominios`. Colaborador lê seu perfil por `auth_user_id=auth.uid()`; gestão lê/altera por `usuario_gestao_do_condominio(condominio_id)`, com USING e WITH CHECK no UPDATE. A função auxiliar exige Auth, condomínio ativo e acesso válido; não usa user_metadata. Sua checagem não restringe a coluna perfil, enquanto as Edge Functions restringem; não foi alterada nesta auditoria.
- Nos condomínios operacionais 1, 2 e 5, todos os colaboradores ativos estavam vinculados a Auth existente, com e-mail correspondente e confirmado. Nove ativos sem Auth pertencem ao laboratório ID 4 e aos demos 10002/10003; não foram tratados como falhas de novos convites reais.
- Advisors de segurança e performance consultados. Avisos incluem RPCs SECURITY DEFINER executáveis por authenticated e proteção contra senhas vazadas desabilitada. O aviso genérico de SECURITY DEFINER não prova exploração; auditoria integral dessas RPCs fica fora deste fluxo. Nenhuma política/migração foi aplicada.

## Screenshot “Carregando... Validando acesso”

O screenshot mostra o estado inicial, sem nome nem condomínio carregado. Os logs recentes incluem `refresh_token_not_found` e falhas de credenciais, mas não identificam com segurança o aparelho/conta do screenshot. Não há evidência de que convite ou RLS tenha causado esse estado específico. A execução completa do script em ambiente simulado alcançou o inicializador, sem erro síncrono; timeout Auth reproduzido e tratado. Não houve acesso à sessão desse colaborador, inspeção de console do celular ou reprodução no aparelho. O timeout é uma melhoria de recuperação, não uma causa raiz comprovada. Não limpar dados do app para investigar, pois pode haver fotos/ponto pendentes locais.

## Validação executada

Node 24, testes locais sem rede:

- `tests/convites-auditoria.mjs`: 25 cenários executando handlers reais com Auth/banco/e-mail simulados e fetch proibido: novo usuário, reuso de identidade, reenvio confirmado/não confirmado, escopo do condomínio, falta de sessão, demo, gestor negado/expirado, duplicidade de matrícula, inativo/sem vínculo, falha SMTP, escape de e-mail, falha de inserção sem exclusão Auth e avisos das duas telas de gestão.
- `tests/onboarding-auditoria.mjs`: sintaxe das páginas; script completo de colaborador e timeout Auth; senha para identidade existente sem metadados; submit com revalidação do vínculo; rejeição de link ausente, token inválido e ausência de vínculo.
- Regressões existentes `tests/convite-modulos.mjs`, `tests/online-auth.mjs`, `tests/offline-shell.mjs`: todas passaram. Ajustados apenas fixtures de ativo e relógio nos testes existentes.
- `git diff --check`: passou.

Limites: não foi executado Deno/typecheck nem deploy. Mocks não substituem integração real de SMTP, JWT de sessão válida, tokens de convite, RLS sob identidades reais e interface no celular. A revisão automática bloqueou sondagem POST em endpoint de convite por risco de envio/criação; nenhuma dessas chamadas foi executada. Prosseguiu-se somente com leituras/OPTIONS e simulações locais.

## Aplicação e homologação pendentes

1. Revisar e integrar PR; publicar páginas e implantar **as duas** funções com validação JWT mantida. Merge de arquivos de função, por si só, não confirma deploy Supabase. Não há alteração de esquema.
2. Fornecer endereço de teste e autorizar convite real. Validar recebimento, remetente, abrir link mais recente, criar senha e entrar online; testar identidade já existente em segundo condomínio e seleção do vínculo; reenvio e ausência de acesso cruzado.
3. Em caso de erro após e-mail enviado e antes de salvar vínculo, tentar novamente com o mesmo e-mail/condomínio e revisar eventual conflito. Não excluir Auth compartilhado.
4. Para o aparelho do screenshot, registrar horário, mensagem de erro/console e modo online/offline sem apagar dados. A ausência de reprodução impede concluir causa raiz.

Documentação consultada: [fluxos de senha](https://supabase.com/docs/guides/auth/passwords), [magic links](https://supabase.com/docs/guides/auth/auth-email-passwordless), [redirects](https://supabase.com/docs/guides/auth/redirect-urls), [changelog](https://supabase.com/changelog.md).
