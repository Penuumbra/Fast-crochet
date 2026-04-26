# Deploy Gratuito: Render + Neon

## Objetivo

Subir o `Fast Crochet` com custo inicial zero usando:

- `Render Free` para o backend Node com HTTPS
- `Neon Free` para persistencia Postgres

## 1. Criar o banco Neon

1. Crie uma conta gratuita no Neon.
2. Crie um projeto Postgres Free.
3. Copie a `connection string`.
4. Guarde esse valor como `DATABASE_URL`.

## 2. Subir o codigo para um repositorio Git

1. Crie um repositorio no GitHub.
2. Envie este projeto com o arquivo `render.yaml`.

## 3. Criar o servico gratis no Render

1. Crie uma conta no Render.
2. Escolha `New +`.
3. Escolha `Blueprint`.
4. Conecte o repositorio.
5. O Render vai ler o [render.yaml](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/render.yaml).
6. Preencha os segredos solicitados:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `GOOGLE_CLIENT_ID` apenas se quiser backup Google

## 4. URL final validada

Instancia publicada:

- `https://fast-crochet.onrender.com`
- `https://fast-crochet.onrender.com/health`

## 5. Comportamento recomendado no modo zero custo

- manter o app em `uso livre`
- ativar `GOOGLE_CLIENT_ID` so quando o backup Google estiver pronto
- redeployar sempre que atualizar HTML estatico, service worker ou assets do PWA

## 6. Quando o deploy terminar

1. Abra `https://fast-crochet.onrender.com`.
2. Valide `https://fast-crochet.onrender.com/health`.
3. Teste captura por camera, upload de imagem e geracao dos quatro estilos.
4. Se o backup Google estiver configurado, teste conexao, backup e restauracao.

## 7. Depois disso

Com a URL final do Render em maos, atualize:

- [android/gradle.properties](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/android/gradle.properties)

Use:

- `webAppUrl=https://fast-crochet.onrender.com`

Depois gere o APK novamente.
