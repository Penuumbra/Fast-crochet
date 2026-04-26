# Passo a Passo da Publicacao no Google Play

## O que ja esta pronto

- bundle para upload: [downloads/fast-crochet-google-play-release.aab](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/downloads/fast-crochet-google-play-release.aab)
- kit de submissao: [downloads/fast-crochet-google-play-kit.zip](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/downloads/fast-crochet-google-play-kit.zip)
- textos da ficha: [docs/play-console](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/play-console)
- paginas legais estaticas: [privacy.html](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/privacy.html), [terms.html](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/terms.html), [subscription-terms.html](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/subscription-terms.html)

## Publicacao manual no Play Console

1. Abra o app no Play Console e complete `Store settings` com o e-mail `Staffquaracidev@gmail.com`.
2. Em `App content`, preencha politica de privacidade, anuncios, publico-alvo, classificacao de conteudo e seguranca dos dados.
3. Em `Store listing`, use os textos de [docs/play-console](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/play-console) e os assets de [downloads/google-play-assets](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/downloads/google-play-assets).
4. Em `Testing` ou `Production`, crie uma nova release.
5. Envie [downloads/fast-crochet-google-play-release.aab](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/downloads/fast-crochet-google-play-release.aab).
6. Cole as notas de versao de [docs/play-console/release-notes-pt-BR.txt](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/docs/play-console/release-notes-pt-BR.txt).
7. Informe em `App access` que o app esta liberado sem login obrigatorio e que a conexao com Google aparece apenas para backup opcional.
8. Revise se o link de politica de privacidade responde publicamente antes de enviar para revisao.
9. Envie a release para revisao.

## Observacoes importantes

- A publicacao final precisa ser feita dentro do Play Console autenticado da sua conta. Esse passo nao pode ser concluido daqui sem acesso direto ao console.
- O backup Google depende de um `GOOGLE_CLIENT_ID` configurado no servidor. Sem isso, o app continua funcionando normalmente, apenas sem o recurso de sincronizacao.
- Hoje, [https://fast-crochet.onrender.com/privacy.html](https://fast-crochet.onrender.com/privacy.html), [https://fast-crochet.onrender.com/terms.html](https://fast-crochet.onrender.com/terms.html) e [https://fast-crochet.onrender.com/subscription-terms.html](https://fast-crochet.onrender.com/subscription-terms.html) ainda retornam `404`, entao voce precisa redeployar a versao mais recente do projeto no Render antes de enviar o app.
