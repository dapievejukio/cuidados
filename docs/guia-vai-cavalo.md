# 🐎 VAI CAVALO — Guia de preparação e migração

## Objetivo
Publicar o OraQui pela infraestrutura Cloudflare Workers Static Assets, semelhante ao OraDesk, e somente depois tornar o repositório `dapievejukio/cuidados` privado. O domínio principal permanece **https://oraqui.app**. O banco Supabase, autenticação, PIN e histórico não devem ser migrados.

## Configuração inicial (uma única vez)
1. Na mesma conta Cloudflare do Desk, adicione a **zona `oraqui.app`** e valide status **Active**. A delegação de nameservers exige planejamento: preserve registros de DNS atuais enquanto o GitHub Pages atende o site. **Não altere o DNS precipitadamente.**
2. Crie um Cloudflare API Token limitado à conta e à zona `oraqui.app`, com permissões de deploy Workers e domínio personalizado/DNS; inclua leitura de zona. Nunca publique o token.
3. No GitHub, em **cuidados > Settings > Secrets and variables > Actions**, cadastre:
   - Secret `CLOUDFLARE_ACCOUNT_ID`: ID da conta Cloudflare.
   - Secret `CLOUDFLARE_API_TOKEN`: token de API restrito.
   - Secret `ORAQUI_REPO_ADMIN_TOKEN`: token GitHub fine-grained exclusivo deste repositório com **Administration: Read and write**, necessário para a futura mudança para privado.
4. Garanta que Actions está habilitado. Opcionalmente, configure o environment `oraqui-producao` com aprovação obrigatória, se disponível no plano.
5. **Sincronize o ponto, fotos e demandas pendentes de todos os iPhones** antes do corte. Nunca remova o atalho instalado ou apague Safari/IndexedDB para tentar atualizar.

## 🐎 Botão manual
Abra [Actions > 🐎 VAI CAVALO](https://github.com/dapievejukio/cuidados/actions/workflows/vai-cavalo-oraqui.yml) e clique **Run workflow**.

- **PREPARAR:** valida sintaxe e testes, cria uma pasta com apenas os recursos públicos do app e, se as credenciais Cloudflare estiverem presentes, publica o Worker **oraqui-migracao** em `workers.dev`. Não altera DNS nem privacidade.
- **VAI CAVALO:** somente após a prévia ser testada manualmente, selecione essa opção, digite `VAI CAVALO` e marque `qa_ios`. O workflow confere os pré-requisitos, publica e testa a prévia, implanta no domínio principal, verifica a prova de versão e privatiza o repo por último.

As etapas ficam visíveis no histórico de execuções do GitHub Actions. **Se faltar token, domínio ativo ou verificação da prévia, o corte é bloqueado.**

## Testes antes de autorizar
- iPhone Safari e PWA: instalação existente, login, PIN offline, modo avião, fila de pendências e reconexão, sem excluir dados.
- Gestor e colaborador: alternância de condomínios, permissões, demandas, fotos antes/depois, relatórios PDF, registros de ponto e histórico.
- Portal do morador e síndico: envios e leituras com perfis corretos.
- URLs: `/`, `/colaborador`, `/colaborador.html`, `/gestor.html`, `/reportar.html`, `/reservaigara/`, arquivos do SW e ícones.
- A prévia `workers.dev` é outra origem e **não enxerga o IndexedDB de oraqui.app**. Ela não substitui o teste pós-corte no endereço principal.

## Segurança e reversão
A pasta estática é construída por `scripts/build-cloudflare.mjs`, evitando publicar SQL, documentação interna, testes ou secrets. JavaScript servido ao navegador continua inspecionável mesmo após privatizar o GitHub; dados devem estar protegidos no Supabase.

Se o teste **PREPARAR** falhar, o site atual não é afetado. Se o corte falhar após a atribuição do domínio, o repositório permanecerá público e será necessária intervenção no Cloudflare para restabelecer a rota anterior. **O workflow não reverte DNS automaticamente**, pois isso pode agravar uma mudança de nameservers. Não apague dados offline durante uma reversão.
