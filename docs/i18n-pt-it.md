# Português / Italiano — etapa 1 (22/10/2026)

Base: `origin/main`, commit `033c731`. Esta entrega é parcial e não representa a conversão integral do ORAQUI. O código foi preparado em `feat/pt-it-i18n`, sem publicar em produção.

## Entregue

- Dicionários locais revisados pt-BR/it-IT em `assets/i18n/`, sem serviço de tradução externo.
- PT como padrão e fallback; seletor acessível PT 🇧🇷 / IT 🇮🇹; `html.lang` atualizado.
- Escolha persistida em localStorage no aparelho e, após identificar o usuário, em chave por ID. Funciona offline no mesmo perfil de navegador. Não sincroniza entre aparelhos. Sem armazenamento disponível, a troca funciona na sessão.
- Login: textos, recuperação, estados de carregamento, erros locais e códigos de erro Auth conhecidos.
- Criar senha: instruções, campos, acessibilidade de mostrar/ocultar senha, validação, convites inválidos, sucesso e falhas.
- Atualização de mensagens existentes sem repetir autenticação ou requisições. Nomes de usuário e valores digitados permanecem literais.
- Service Worker inclui os quatro recursos i18n no shell e traduz a página de indisponibilidade offline. Mantém a normalização de redirects, push e IndexedDB.
- Formatação `I18n.date` aceita o fuso do posto via opções Intl; nenhum timestamp ou relatório foi migrado nesta etapa.

## Inventário e pendências precisas

O inventário é do código da main; presença de uma rota no repositório não comprova uso atual em produção. Não foram exercitados fluxos autenticados com contas reais.

| Página / módulo | Situação e próxima integração |
|---|---|
| `index.html` | Integrada: login online, recuperação e mensagens; botão leva ao fluxo offline existente, ainda em PT. |
| `definir-senha.html` | Integrada: textos e estados; criação de senha real com convite válido ainda precisa de homologação. |
| `reportar.html` | Pendente prioritária: formulário público, selects com dados de locais, cronograma, fotos, privacidade, acompanhamento e confirmação; integrar também `reportar-fotos.js` e `reportar-apresentacao.js`. Traduzir rótulos, preservar descrição do morador e payload `p_data`/`p_hora`. |
| `reportar-demo.html` | Pendente: demonstração e seus estados. |
| `sindico.html`, `sindico-gestao.js` | Pendente: login, histórico, filtros, ocorrência, mensagens, fotografias e impressão; rerenderizar caches de dados sem novas gravações. |
| `morador.html` | Pendente: portal, instruções, seletores e mensagens. |
| `colaborador.html`, `oraqui-offline.js` | Pendente: acesso PIN, ativação offline, turno/ponto, selfie/GPS, tarefas, pendências e sincronização. Associar preferência ao ID offline já validado sem mudar esquema ou fila IndexedDB. |
| `gestor.html`, `assets/gestor-3/` | Pendente: menus, modais, áreas, atividades, demandas, registros e configurações. |
| `admin.html` | Pendente: administração, convites e mensagens. |
| `chat.html`, `chat-config.html` | Pendente: interface, permissões e datas. Mensagens e nomes originais nunca são chaves de tradução. |
| `documentos-colaborador.html`, `documentos-gestao.html` | Pendente: rótulos, listas, upload e erros. Arquivos, conteúdo e títulos originais devem permanecer literais. |
| `perfil-foto.html` | Pendente: formulário, upload e mensagens. |
| `privacidade.html` | Pendente: versão italiana do aviso, preservando versão original. |
| `relatorio-gestor.js`, `assets/relatorios/` e impressão de gestor/síndico | Pendente: cabeçalhos, legendas, vazios e datas de apresentação em relatórios/PDF. Preservar nomes originais, filtros, competência no nome do arquivo e dados de auditoria. |
| `service-worker.js`, `manifest.webmanifest` | Shell e fallback i18n integrados. Nome/descrição do manifesto e instalação do PWA ainda em português. Não ampliamos cache para documentos ou respostas privadas. |
| `reservaigara/index.html`, `colaborador.html`, `gestor.html`, `definir-senha.html`, `ponto-teste.html` | Cópias independentes legadas, pendentes de confirmar uso e migrar. `reservaigara/reportar.html` redireciona ao formulário público raiz. |
| `supabase/functions/` | Inventariadas: convidar-colaborador, convidar-sindico, enviar-email-resolucao e sincronizar-ponto-offline. Pendente estabelecer códigos estáveis para erros customizados e idioma de e-mails; nenhum endpoint, template, RLS ou banco alterado. |

## Contrato de integração

Carregar `pt-BR.js`, `it-IT.js`, `i18n.js` nessa ordem e o CSS. Um contêiner `data-i18n-selector` define a posição do seletor; caso contrário ele entra no início de `main` ou `body`.

- Texto estático de propriedade da interface: `data-i18n="chave"`. Não aplicar ao elemento pai de dados originais ou formulários.
- Estado dinâmico: `I18n.bindText(elemento, I18n.ui(chave, valores))`. A chave permanece vinculada e a troca atualiza o estado atual. Para limpar, `I18n.bindText(elemento, '')`.
- Dado original: `I18n.bindText(elemento, nomeOriginal)` ou a renderização literal existente. Strings comuns nunca passam pelo dicionário.
- Templates/listas: renderizar com `I18n.t` e assinar `I18n.subscribe` para rerender a partir do estado em memória; escapar HTML quando necessário. Chamar `I18n.apply(container)` para novos elementos anotados. Não observar ou traduzir textos arbitrários do DOM.
- Atributos dinâmicos: `I18n.bindAttribute`. Suporte estático para placeholder, aria-label, title e alt.
- Erro de servidor: `I18n.serverError(error, chaveGenerica)`. Somente códigos conhecidos são mapeados; nenhuma mensagem bruta é inserida como tradução. Referência: https://supabase.com/docs/guides/auth/debugging/error-codes
- Após autenticação/identificação offline validada: `I18n.setUser(id)`. Não usar nomes/metadados como autorização.
- Datas de apresentação: `I18n.date(valor, {timeZone: fusoDoPosto, ...opcoes})`. Não aplicar a valores enviados ao servidor, datas de banco, nomes de arquivo técnicos ou registros de auditoria.
- As chaves são textos-fonte explícitos, estáveis e revisados. Se o texto PT mudar, atualizar ambos os dicionários e referências. O fallback de uma chave ausente em IT é o catálogo PT.

## Validação realizada

Passaram `tests/i18n-unit.mjs`, `tests/online-auth.mjs`, `tests/offline-shell.mjs` e `tests/relatorio-gestor-unit.cjs`. Cobrem catálogos, estados dinâmicos, precedência sobre anotação estática, dados literais, preferência por usuário/aparelho, fallback, erros por código, fuso explícito, armazenamento bloqueado, abas, login, PIN, fila de ponto, normalização iOS e regressão de relatórios.

Na prévia integrada desktop foram conferidos login PT/IT, troca imediata de mensagem de recuperação sem enviar e-mail, persistência ao recarregar, convite inválido em ambos os idiomas e alinhamento visual. Captura em `tests/i18n-preview.png`. A marca gráfica original conserva seu texto em português.

`tests/i18n-browser.cjs` prepara teste desktop/mobile e ciclo real de Service Worker offline com backend simulado. Sua execução não chegou aos testes: o ambiente bloqueou a inicialização de Chrome e Chromium (`MachPortRendezvousServer: Permission denied`). Portanto, **mobile, recarga offline em navegador real, Safari/iOS, PWA instalado e convite válido não estão homologados**. Testes de DOM/Service Worker simulados não substituem essa validação. Mensagens nativas de validação do navegador seguem o idioma do próprio navegador.

Para executar o teste de navegador em ambiente habilitado, instalar Playwright e Chromium e rodar `node tests/i18n-browser.cjs`. Opcional: `ORAQUI_BROWSER_CHANNEL=chrome`. As dependências de teste não são enviadas ao usuário final.

## Publicação incremental

Revisar a etapa em branch separada. Antes de publicar, executar a suíte de navegador em ambiente habilitado e homologar login/convite com conta de teste. Após implantação, abrir online uma vez para atualizar o shell, selecionar IT e testar offline no aparelho. A atualização troca somente os caches `oraqui-shell-*`; não exclui IndexedDB. Para reverter, reverter os commits e publicar um novo identificador de cache, sem limpar dados locais.
