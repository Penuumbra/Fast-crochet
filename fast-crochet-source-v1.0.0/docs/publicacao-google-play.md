# Publicacao no Google Play

## Estado final preparado neste projeto

O projeto gera um `AAB release` pronto para Google Play e um modo de distribuicao `play` no shell Android.

Na versao atual, o app e distribuido como `app gratuito`: o usuario pode gerar diagramas sem bloqueio, e a conta Google serve apenas para backup opcional.

## O que esta pronto

- `AAB` release assinado para upload
- build Android em modo `play`
- paginas estaticas prontas para politica de privacidade e termos
- textos de store listing
- notas de revisao do app
- artefatos visuais para a ficha do app

## Arquivos principais

- [build-play-aab.ps1](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/build-play-aab.ps1)
- [fast-crochet-google-play-release.aab](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/downloads/fast-crochet-google-play-release.aab)
- [privacy.html](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/privacy.html)
- [terms.html](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/terms.html)
- [subscription-terms.html](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/subscription-terms.html)
- [docs/google-play-submission-kit.md](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/google-play-submission-kit.md)

## O que ainda depende da conta do Google Play

- criar a pagina do app no Play Console
- preencher os formularios de classificacao, privacidade e seguranca
- enviar o `AAB`
- subir screenshots e feature graphic
- informar paises e faixa etaria
- enviar para revisao

## O que ainda depende da infraestrutura publicada

- redeployar a versao mais recente do projeto no Render para publicar `privacy.html`, `terms.html` e `subscription-terms.html`
- confirmar que os links publicos respondem `200` antes de enviar o app ao Play
- configurar `GOOGLE_CLIENT_ID` no Render se quiser que o backup Google apareca ativo no app publicado

## Limite operacional deste ambiente

A publicacao automatica no Google Play nao foi executada daqui porque ela depende de acesso autenticado ao seu Play Console. O pacote final de submissao foi preparado localmente para upload manual.
