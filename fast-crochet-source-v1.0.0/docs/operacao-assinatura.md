# Operacao do App e Backup Google

> Este arquivo substitui a antiga operacao de assinatura. A versao final atual nao cobra assinatura.

## Regra do produto

- geracao livre sem trial
- sem bloqueio de uso
- sem checkout ativo
- backup Google opcional

## Como o backend decide acesso

- `free_open_access`: uso livre sem login obrigatorio
- `free_signed_in`: uso livre com uma conta local opcional

## Backup Google

Quando `GOOGLE_CLIENT_ID` estiver configurado, o frontend:

1. abre o fluxo OAuth do Google
2. pede os escopos `openid`, `email`, `profile` e `drive.appdata`
3. grava um JSON no `appDataFolder` do Google Drive
4. permite restaurar esse mesmo JSON em outro aparelho

## Variaveis necessarias

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_ID` apenas se quiser backup Google
