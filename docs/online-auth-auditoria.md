# Auditoria de login online — 22/10/2026

## Evidência e limites

- Base: main 1a31351693e17c3e0c85ef81f11255590023fa36, incluindo correção de CSS e ponto offline.
- Auth registrou login por senha da conta vinculada a Usuário Teste às 18:47:26 UTC (15:47:26 Brasília), logout às 18:48:02 UTC e recusa `invalid_credentials` às 18:54:58 UTC. A recusa não identifica a conta tentada; não se pode atribuí-la conclusivamente ao mesmo usuário.
- A conta vinculada aos perfis de teste possui e-mail confirmado e senha cadastrada. Nenhuma senha/hash foi extraída ou alterada.
- Há outras recusas por senha às 21:03–21:05 UTC. As requisições chegaram ao endpoint Auth; isso não prova que o iPhone tem todos os arquivos atualizados.
- O formulário já enviava e-mail/senha a signInWithPassword. O módulo oraqui-offline.js não intercepta Auth nem grava uma sessão Supabase. O service worker não intercepta POST nem API do Supabase. Não há evidência de que PIN/cache tenha causado a recusa de credenciais observada.
- O botão offline antes abria colaborador.html sem distinguir intenção; o aplicativo escolhia apenas por navigator.onLine. Essa ambiguidade foi corrigida, mas não constitui causa comprovada de invalid_credentials.

## Alterações

- Online abre colaborador.html?modo=online: sessão Supabase, usuário validado por getUser e consulta do perfil ativo.
- Offline abre colaborador.html?modo=offline: PIN local mesmo com conexão; exige aparelho ativado. A rota sem modo mantém a entrada offline automática quando sem rede.
- Inicialização do login bloqueia o formulário durante consulta da sessão; falhas liberam nova tentativa. Falha de consulta dos vínculos sem nenhum vínculo confirmado não é tratada como ausência de acesso.
- Mensagem de credenciais distingue senha online e PIN; senha enviada sem trim/transformações.
- Ausência confirmada de perfil encerra apenas sessão local, sem invalidar outros aparelhos.
- Nova versão do cache e verificação de atualização na página inicial. Mantida normalização de redirects iOS e instalação completa antes de substituir o cache anterior.
- oraqui-offline.js, CSS, criptografia, IndexedDB e filas não foram alterados.

## Validação

- tests/online-auth.mjs: execução do formulário com Auth simulado; preservação literal da senha; roteamento; erro de credenciais; falhas de consulta; ausência de autorização; bloqueio sem internet; execução das ramificações reais do inicializador online/offline.
- tests/offline-shell.mjs: sintaxe; falha de instalação; cache CSS/imagens; aliases; redirects iOS; visibilidade e permissões de módulos; sequência completa de ponto offline com selfie e GPS, vínculo à conta e ausência de duplicação ao reabrir.
- Endpoint real Auth com endereço deliberadamente inexistente example.invalid: HTTP 400 invalid_credentials, sem criar conta.
- Consulta somente leitura de cadastro Auth e políticas existentes. Nenhuma alteração de banco, convite, senha ou autorização.
- Não realizado login real com credenciais válidas: não há senha de conta de teste independente disponível. Testes simulados não substituem essa validação.

## Verificação pendente no iPhone

1. Conectar à internet; abrir https://oraqui.app/ e recarregar, aguardar alguns segundos e recarregar novamente para usar o service worker atualizado.
2. Não apagar dados do site, não reinstalar o app nem remover PIN: isso pode perder acesso aos registros locais.
3. Usar ENTRAR ONLINE com e-mail/senha Supabase; confirmar seleção do perfil Usuário Teste / Reserva Igara.
4. Se Auth recusar, registrar horário e mensagem, sem compartilhar a senha. A recusa de credenciais continua exigindo investigação da combinação de e-mail/senha, sem substituí-la por PIN nem redefinir senha automaticamente.
5. Usar ACESSAR ORAQUI OFFLINE; testar PIN conectado e depois em modo avião. Confirmar ponto e pendências preservados; sincronizar com sessão online da mesma conta e perfil.
