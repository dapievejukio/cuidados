# Gestor 3.0

Identidade da gestão baseada na prancha OraQui verde/laranja e no novo Reportar: creme `#f6f1e7`, verde `#0f5132`, laranja `#ff8a3d`, superfícies claras, cartões arredondados e ícones de traço.

O cabeçalho e a entrada usam `assets/relatorios/oraqui-horizontal.jpg`, marca isolada da prancha fornecida pelo usuário. O símbolo SVG reaproveita o desenho vetorial do novo Reportar para tamanhos pequenos e favicon. Os ícones de interface são vetores embutidos, sem dependência de fontes ou serviço externo.

`gestor-3.css` é carregado após os estilos existentes para aplicar o novo layout, inclusive em telas pequenas. IDs, ações, funções de autenticação, seleção de condomínio e permissões são preservados. A antiga exceção de cor do cabeçalho por nome de usuário foi substituída pela identidade comum da gestão. Reportar e Colaborador não são modificados.

Validação: IDs e controles comparados com a base, scripts verificados quanto à sintaxe e testes do relatório executados. Prévia visual com dados fictícios gerada fora do repositório para revisão local; conferência em navegador pendente porque a ferramenta bloqueia URLs `file://`.
