# OraQui — Condomínios e equipes em ação

Aplicação do ecossistema **Tuttiora** para gestão operacional de condomínios.

**Site:** [oraqui.app](https://oraqui.app)

O OraQui reúne atividades, demandas, ocorrências de moradores, cronogramas, relatórios, comunicações, gestão de equipes e controle operacional de ponto. Há interfaces para **gestor**, **colaborador**, **morador** e **síndico**, conforme as permissões habilitadas para cada condomínio.

**Tecnologia:** HTML/CSS/JavaScript (PWA) e Supabase (Auth, Postgres/RLS, Storage e Edge Functions). Recursos offline dependem da preparação do dispositivo e da sincronização posterior. O espelho de ponto é operacional, **não equivale a REP-P certificado**.

## 🐎 VAI CAVALO — Migração para Cloudflare

[**🐎 ABRIR O BOTÃO VAI CAVALO NO GITHUB**](https://github.com/dapievejukio/cuidados/actions/workflows/vai-cavalo-oraqui.yml)

O processo manual oferece **PREPARAR** (testar prévia, sem alterar o site) e **VAI CAVALO** (publicar no endereço principal e tornar este repositório privado, após testes).

**Leia o [guia](docs/guia-vai-cavalo.md) antes de usar.** A fase definitiva requer credenciais armazenadas em GitHub Secrets, domínio validado no Cloudflare e conferência de login/PWA/offline no iPhone. O endereço **oraqui.app** deve ser mantido para preservar a origem dos dados offline já existentes.

O repositório ainda é público enquanto a migração não for finalizada. Nenhuma fase é executada automaticamente.
