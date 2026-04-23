# Fast Crochet

Aplicativo de crochê com captura por câmera, geração por IA, trial anônimo de `7 dias`, login/cadastro após o trial e assinatura mensal de `R$ 3,69`.

## Stack grátis recomendado

- `Render Free`: hospeda o app Node com HTTPS e subdomínio `onrender.com`
- `Neon Free`: persiste usuários, sessões, trials e assinatura em Postgres
- `Stripe`: ativa cobrança real depois, sem mensalidade fixa inicial
- `GitHub Releases`: distribui o APK Android sem custo

## O que já está pronto

- Frontend web responsivo com câmera, upload e renderização dos `4 estilos`.
- Backend Node com:
  - trial anônimo
  - login e cadastro
  - bloqueio após expirar o trial
  - assinatura mensal
  - integração com `Stripe Checkout`, `Payment Link` ou modo `demo`
  - persistência em `Postgres` via `DATABASE_URL`
  - fallback local em `data/database.json`
- Shell Android 14+ em Kotlin/WebView.
- `render.yaml` para deploy grátis no Render.
- Documentação de arquitetura, operação, publicação e textos legais.

## Fluxo comercial

1. O usuário entra sem conta.
2. O app cria um trial de `7 dias`.
3. Durante o trial, o uso é livre.
4. Ao fim do trial:
   - a geração é bloqueada
   - o usuário precisa entrar ou criar conta
5. Sem assinatura ativa, o uso continua bloqueado.
6. Com assinatura ativa, o acesso volta.

## Como rodar localmente

```powershell
.\start-app.ps1
```

O script instala dependências automaticamente se necessário.

## Variáveis de ambiente

Veja [.env.example](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/.env.example).

Principais:

- `DATABASE_URL`: conexão Postgres gratuita, recomendada com Neon
- `OPENAI_API_KEY`: obrigatória para gerar diagramas
- `APP_URL`: opcional localmente; no Render o app usa `RENDER_EXTERNAL_URL`
- `ALLOW_DEMO_SUBSCRIPTION=1`: deixa a assinatura de demonstração ativa até você plugar pagamento real

## Deploy grátis

Arquivos relevantes:

- [render.yaml](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/render.yaml)
- [docs/deploy-gratuito-render-neon.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/deploy-gratuito-render-neon.md)
- [docs/dados-publicos-para-preencher.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/dados-publicos-para-preencher.md)

## Android

Gerar APK:

```powershell
.\build-android.ps1
```

Saída:

- `downloads/fast-crochet-android14-debug.apk`

Antes do build final do APK, aponte:

- `android/gradle.properties`
- `webAppUrl=https://seu-servico.onrender.com`

## Publicação

- APK grátis: `GitHub Releases`
- Loja depois: `Google Play`, com conta paga e migração para `Google Play Billing`

Detalhes:

- [docs/arquitetura.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/arquitetura.md)
- [docs/publicacao-gratuita-github-releases.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/publicacao-gratuita-github-releases.md)
- [docs/publicacao-google-play.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/publicacao-google-play.md)
