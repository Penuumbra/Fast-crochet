# Deploy Gratuito: Render + Neon

## Objetivo

Subir o `Fast Crochet` com custo inicial zero usando:

- `Render Free` para o backend Node com HTTPS
- `Neon Free` para persistência Postgres

## 1. Criar o banco Neon

1. Crie uma conta gratuita no Neon.
2. Crie um projeto Postgres Free.
3. Copie a `connection string`.
4. Guarde esse valor como `DATABASE_URL`.

## 2. Subir o código para um repositório Git

1. Crie um repositório no GitHub.
2. Envie este projeto com o arquivo `render.yaml`.

## 3. Criar o serviço grátis no Render

1. Crie uma conta no Render.
2. Escolha `New +`.
3. Escolha `Blueprint`.
4. Conecte o repositório.
5. O Render vai ler o [render.yaml](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/render.yaml).
6. Preencha os segredos solicitados:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - opcionalmente os dados do Stripe

## 4. URL grátis resultante

O app ficará disponível em um endereço como:

- `https://fast-crochet.onrender.com`

O nome final depende da disponibilidade no Render.

## 5. Comportamento recomendado no modo zero custo

- deixar `ALLOW_DEMO_SUBSCRIPTION=1` enquanto o Stripe não estiver conectado
- usar Stripe real só quando quiser começar a monetizar

## 6. Quando o deploy terminar

1. Abra a URL `onrender.com`.
2. Valide o endpoint `/health`.
3. Teste:
   - trial anônimo
   - cadastro
   - login
   - bloqueio após trial
   - assinatura demo

## 7. Depois disso

Com a URL final do Render em mãos, atualize:

- [android/gradle.properties](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/android/gradle.properties)

Use:

- `webAppUrl=https://seu-servico.onrender.com`

Depois gere o APK novamente.

