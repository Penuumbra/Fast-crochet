# Configurar Backup Google

## Objetivo

Habilitar o botao `Conectar Google` para salvar e restaurar backups do Fast Crochet.

## O que configurar

1. Crie um projeto no Google Cloud.
2. Ative a `Google Drive API`.
3. Configure a tela de consentimento OAuth.
4. Crie um `OAuth Client ID` do tipo `Web application`.
5. Em `Authorized JavaScript origins`, adicione:
   - `https://fast-crochet.onrender.com`
6. Copie o `Client ID`.
7. No Render, defina a variavel:
   - `GOOGLE_CLIENT_ID`
8. Redeploye o servico.

## Como o app usa isso

- o frontend carrega `https://accounts.google.com/gsi/client`
- o usuario inicia o fluxo com `google.accounts.oauth2.initTokenClient()`
- o backup e salvo em `appDataFolder` do Google Drive

## Verificacao rapida

1. Abra o app publicado.
2. Confirme que o card `backup do Google` mostra `Pronto para conectar`.
3. Clique em `Conectar Google`.
4. Gere um diagrama.
5. Clique em `Fazer backup agora`.
6. Teste `Restaurar ultimo backup` em outro aparelho ou navegador.
