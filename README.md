# Fast Crochet

Aplicativo de crochet com captura por camera, geracao por IA, uso livre sem tela de bloqueio e backup opcional com Google.

## Stack gratis recomendado

- `Render Free`: hospeda o app Node com HTTPS e subdominio `onrender.com`
- `Neon Free`: persiste usuarios, sessoes, trials e assinatura em Postgres
- `Stripe`: ativa cobranca real depois, sem mensalidade fixa inicial
- `GitHub Releases`: distribui o APK Android sem custo

## O que ja esta pronto

- Frontend web responsivo com camera, upload e renderizacao dos `4 estilos`
- Backend Node com acesso livre, sem bloqueio de trial ou assinatura para gerar
- Integracao com `Stripe Checkout`, `Payment Link` ou modo `demo`
- Persistencia em `Postgres` via `DATABASE_URL`, com fallback local em `data/database.json`
- Shell Android 14+ em Kotlin/WebView
- [render.yaml](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/render.yaml) para deploy gratis no Render
- Documentacao de arquitetura, operacao, publicacao e textos legais
- Backup opcional no Google Drive quando `GOOGLE_CLIENT_ID` estiver configurado

## Fluxo comercial

1. O usuario abre a camera ou envia uma imagem.
2. O app gera os `4 estilos` sem bloqueio.
3. Se quiser, conecta a conta Google apenas para backup e restauracao.

## Como rodar localmente

```powershell
.\start-app.ps1
```

O script instala dependencias automaticamente se necessario.

## Variaveis de ambiente

Veja [.env.example](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/.env.example).

Principais:

- `DATABASE_URL`: conexao Postgres gratuita, recomendada com Neon
- `OPENAI_API_KEY`: obrigatoria para gerar diagramas
- `APP_URL`: opcional localmente; no Render o app usa `RENDER_EXTERNAL_URL`
- `GOOGLE_CLIENT_ID`: opcional; habilita conexao com Google apenas para backups
- `ALLOW_DEMO_SUBSCRIPTION=0`: mantem a assinatura de demonstracao desativada em producao

## Deploy gratis

Arquivos relevantes:

- [render.yaml](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/render.yaml)
- [docs/deploy-gratuito-render-neon.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/deploy-gratuito-render-neon.md)
- [docs/dados-publicos-para-preencher.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/dados-publicos-para-preencher.md)

Instancia ativa:

- `https://fast-crochet.onrender.com`
- `https://fast-crochet.onrender.com/health`

## Android

Gerar APK:

```powershell
.\build-android.ps1
```

Saida:

- `downloads/fast-crochet-android14-debug.apk`

Configuracao final aplicada:

- [android/gradle.properties](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/android/gradle.properties)
- `webAppUrl=https://fast-crochet.onrender.com`

## Publicacao

- APK gratis: `GitHub Releases`
- Google Play: pacote `AAB` pronto em modo `consumption-only`

Detalhes:

- [docs/arquitetura.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/arquitetura.md)
- [docs/publicacao-gratuita-github-releases.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/publicacao-gratuita-github-releases.md)
- [docs/publicacao-google-play.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/publicacao-google-play.md)
- [docs/publicacao-google-play-passo-a-passo.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/publicacao-google-play-passo-a-passo.md)
- [downloads/fast-crochet-google-play-release.aab](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/downloads/fast-crochet-google-play-release.aab)
- [downloads/fast-crochet-google-play-kit.zip](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/downloads/fast-crochet-google-play-kit.zip)
