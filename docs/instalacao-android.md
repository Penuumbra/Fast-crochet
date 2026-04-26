# Instalacao do APK no Android 14+

## Arquivo

- `downloads/fast-crochet-android14-debug.apk`

## Como instalar

1. Baixe o APK no aparelho Android 14 ou superior.
2. Toque no arquivo.
3. Se o Android bloquear a instalacao, autorize a instalacao de apps dessa origem.
4. Conclua a instalacao.
5. Abra o app.

## URL configurada neste build

O APK final aponta para:

- `https://fast-crochet.onrender.com`

Se algum build antigo abrir a tela de configuracao inicial em vez do app, ajuste:

- [android/gradle.properties](C:/Users/kalle/Documents/Codex/2026-04-23-quero-um-app-que-atraves-da/android/gradle.properties)
- `webAppUrl=https://fast-crochet.onrender.com`

Depois gere um novo APK com:

```powershell
.\build-android.ps1
```
