# Instalacao do APK no Android 14+

## Arquivo

- `downloads/fast-crochet-android14-debug.apk`

## Como instalar

1. Baixe o APK no aparelho Android 14 ou superior.
2. Toque no arquivo.
3. Se o Android bloquear a instalacao, autorize a instalacao de apps dessa origem.
4. Conclua a instalacao.
5. Abra o app.

## Observacao importante

Se o APK abrir a tela de configuracao inicial em vez do app, ajuste a URL em:

- `android/gradle.properties`

Use:

- `webAppUrl=https://seu-dominio-publico`

Depois gere um novo APK com:

```powershell
.\build-android.ps1
```
