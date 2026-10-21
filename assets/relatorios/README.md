# Logos dos relatórios de registros da equipe

O relatório aberto em `gestor.html` consulta o mapa `logosCondominios` de `relatorio-gestor.js` pelo ID do condomínio selecionado. Cada entrada aponta para um arquivo de imagem do repositório. Para cadastrar outra marca, acrescente o ID correto e seu arquivo; não use uma marca padrão de condomínio. Sem entrada, o relatório mantém o nome e o logo OraQui.

- `rni-reserva-igara.jpg`: imagem RNI Reserva Igara fornecida pelo usuário, exportada em JPEG para o relatório. O ID 1 corresponde ao Reserva Igara, conforme a configuração existente em `reportar.html`.
- `oraqui-horizontal.jpg`: marca verde/laranja isolada a partir da prancha fornecida pelo usuário com a ferramenta de imagens. A prancha completa não é incluída no site.

Os logos são carregados antes da prévia e incluídos no documento de impressão por URLs de imagem locais. O carregador nativo funciona tanto em HTTP(S) quanto em `file://`, sem buscar JSON nem converter os logos em canvas. As fotos dos registros continuam incorporadas. Falhas de imagem produzem aviso visível. Nenhuma alteração de banco de dados ou permissão é necessária.

Validação automatizada: com Node e Playwright instalados, execute `node tests/relatorio-gestor.cjs`. Opcionalmente defina `CHROME_PATH` para o executável de um Chromium local. Os dados de teste são fictícios e não acessam o banco de produção.
