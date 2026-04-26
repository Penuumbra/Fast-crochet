# Checklist de Publicacao

## Obrigatorio para qualquer distribuicao

- nome comercial do app definido
- URL publica com `HTTPS` definida
- `OPENAI_API_KEY` configurada no servidor
- politica de privacidade revisada
- termos de uso revisados
- e-mail de suporte criado
- logo e icone finalizados

## Obrigatorio para o backend

- `DATABASE_URL` configurada
- teste de camera e upload executado
- teste de geracao executado
- backup do banco ou da base definido

## Opcional para backup Google

- projeto no Google Cloud criado
- tela de consentimento configurada
- `OAuth Client ID` web criado
- origem autorizada incluindo `https://fast-crochet.onrender.com`
- `GOOGLE_CLIENT_ID` conectado no Render
- teste de backup e restauracao executado

## Obrigatorio para stack gratis

- conta gratuita no Render criada
- conta gratuita no Neon criada
- `render.yaml` presente no repositorio
- `DATABASE_URL` do Neon conectada no Render
- primeira URL `onrender.com` validada

## Obrigatorio para GitHub Releases

- APK gerado
- release notes curtas
- changelog
- instrucoes de instalacao por sideload
- link para politica de privacidade

## Obrigatorio para Google Play

- conta de desenvolvedor ativa
- taxa de registro paga
- AAB assinado
- screenshots
- icone 512x512
- feature graphic
- classificacao de conteudo
- dados de seguranca e privacidade
- link publico da politica de privacidade respondendo `200`

## Recomendado antes de divulgar

- adicionar pagina de suporte
- adicionar restauracao server-side no futuro
- adicionar analytics e monitoramento
