# Ponto após confirmação da selfie — 23/10/2026

A marcação é escolhida antes da câmera. O evento `change` com imagem válida inicia automaticamente a marcação. Não há segunda confirmação de selfie nem botão de registrar após a foto. Perfis com selfie opcional podem escolher registrar sem foto; GPS continua sujeito à configuração do vínculo.

Cancelar a câmera, fechar o diálogo ou selecionar imagem vazia, corrompida, de formato incompatível ou acima de 5 MB não envia ponto. A imagem é decodificada antes do envio. Eventos sucessivos de seleção invalidam validações anteriores; a promessa do diálogo só conclui uma vez.

Cada intenção recebe UUID, tipo, vínculo, escala e instante da confirmação. GPS negado não permite envio excepcional sem evidência. A tentativa conserva foto, horário e UUID e mostra TENTAR NOVAMENTE. SALVANDO bloqueia outras marcações. A mesma promessa protege envio simultâneo com reconexão; consulta por UUID e índice único protegem respostas perdidas e outras abas. O registro local offline usa a fila existente e exige PIN desbloqueado. Online sem PIN, a foto fica em memória até subir no bucket privado; apenas o caminho e metadados entram na fila persistente. Antes de fechar a página com tentativa em memória, o navegador solicita confirmação.

O sucesso online só aparece após resposta ou recuperação do registro no servidor. Offline informa explicitamente que foi salvo no aparelho e aguarda sincronização. Nenhum comprovante ou arquivo existente é removido.

## Ajuste necessário no servidor

Aplicada `ponto_confirmacao_selfie_idempotente` em `rhiosvsohvqqrxzwohqu`. Fonte: `supabase/sql/ponto_confirmacao_selfie.sql`.

A validação anterior substituía horário e apagava o UUID de marcas online, impossibilitando preservação da confirmação e idempotência. Agora, quando o novo cliente fornece UUID e captura, preserva ambos, com a janela já usada pelo fluxo offline (72 horas; tolerância futura de 5 minutos). `recebido_em` e `created_at` continuam sendo definidos pelo servidor. `confianca_horario=conferencia_pendente` identifica corretamente o relógio do aparelho. Clientes anteriores sem captura continuam usando horário do servidor. Origem online/offline permanece correta. As validações de vínculo, escala, GPS, selfie privada e permissões permanecem. Nenhuma linha operacional foi inserida, atualizada ou excluída para testar.

## Evidência

- 11 suítes locais aprovadas: chat, menus, convites, ponto do gestor, módulos, shell/PIN offline, login, novo fluxo de selfie, relatórios e reportar.
- `tests/ponto-selfie-auto.mjs`: cancelamento nativo, imagens inválidas, duas fotos sucessivas, timestamp anterior à validação/upload, selfie opcional, quatro tipos, duplo clique, GPS negado, retentativa com mesmo ID/horário, isolamento de condomínio, PIN, fila, resposta perdida, upload repetido e permissão de módulo.
- `tests/offline-shell.mjs`: sequência completa entrada/intervalo/retorno/saída com foto, GPS, vínculo e estados dos botões.
- `tests/ponto-confirmacao-temporario.sql`: executado com sucesso no PostgreSQL em tabelas temporárias, usando a função proposta e revertendo tudo ao final. Valida captura online, legado, janela de tempo, GPS/selfie obrigatórios, escala de outro vínculo e compatibilidade offline.
- Sintaxe dos scripts HTML e `git diff --check` aprovados.
- Bucket `selfies-ponto-privadas` verificado como privado; RLS e índice único preservados.
- Câmera física/iOS não testados. A tentativa de executar Chrome em modo headless foi interrompida pelo ambiente antes de abrir a página; os testes de eventos de captura usam simulação.

Execução das suítes: `LINKEDOM_WORKER=/caminho/linkedom/worker.js node --test tests/*.mjs tests/relatorio-gestor-unit.cjs`. LinkeDOM 0.18.12 foi instalado apenas em diretório temporário para testes.
