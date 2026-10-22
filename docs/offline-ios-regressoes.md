# Correção offline — 22/10/2026

Cache v6 inclui CSS do colaborador, logo, símbolo e ícones. A instalação exige todos os recursos antes de ativar. Redirects continuam normalizados para Safari. /colaborador tem fallback para /colaborador.html; / preserva a página de login.

aplicarModulos configura Ponto online e offline, incluindo revogação. A entrada offline restaura inícios locais antes de renderizar e invalida carregamentos anteriores. carregarTudo não consulta a rede em modo avião. Nenhuma alteração em Supabase, IndexedDB, PIN, criptografia ou handlers push.

## Verificação

Execute `node tests/offline-shell.mjs`.

Valida sintaxe dos scripts inline, oraqui-offline.js e service-worker.js; instalação e falha de CSS; cache CSS/imagens com query string; rotas /, /colaborador e /colaborador.html; redirects; entrada offline; permissões; reentrada sem duplicação; sequência do Ponto com selfie/GPS na fila. DOM, perfil, câmera e GPS são simulados. CSS e logo publicados responderam 200 com tipos corretos antes da publicação da correção.

A tentativa de teste visual não conseguiu iniciar Chrome neste ambiente. Não foi realizado teste real de Safari/iPhone, PIN nem envio ao servidor.

## Atualização do iPhone após publicação

1. Com internet, abra https://oraqui.app/colaborador.html no mesmo Safari ou app da Tela de Início usado para ativar o offline. Esses ambientes têm armazenamento separado.
2. Recarregue e aguarde. Feche as abas OraQui e reabra a URL para o novo worker controlar a página.
3. Entre como Usuário Teste, matrícula 9999, Reserva Igara. Confira layout e Bater ponto. Atualize/ative o offline usando o PIN existente para atualizar o perfil.
4. Ative modo avião, reabra /colaborador.html e /colaborador, desbloqueie com PIN e confira logo, menus e Ponto.
5. Combine com a gestão uma marcação real de teste, incluindo selfie/GPS conforme solicitado. Confira próxima ação e pendência. Reconecte, sincronize e confira ausência de duplicação na gestão.

Não limpe histórico/dados dos sites, não desinstale e não use navegação privada: isso pode remover ou separar os dados locais pendentes.
