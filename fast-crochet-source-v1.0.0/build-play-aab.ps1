$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidDir = Join-Path $root "android"
$downloadsDir = Join-Path $root "downloads"
$javaHomeCandidates = @(
  (Join-Path $root ".tools\jdk17\jdk-17.0.18+8"),
  (Join-Path $root ".tools\jdk17"),
  $env:JAVA_HOME,
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
) | Where-Object { $_ }
$gradle = Join-Path $root ".tools\gradle\gradle-8.7\bin\gradle.bat"
$localProps = Join-Path $androidDir "local.properties"
$keystoreDir = Join-Path $androidDir "keystore"
$keystoreFile = Join-Path $keystoreDir "fast-crochet-upload.jks"
$keystorePropsFile = Join-Path $keystoreDir "play-upload.local.properties"
$releaseBundle = Join-Path $androidDir "app\build\outputs\bundle\release\app-release.aab"
$targetBundle = Join-Path $downloadsDir "fast-crochet-google-play-release.aab"

$javaHome = $javaHomeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (!(Test-Path $gradle)) {
  throw "Gradle local nao encontrado em $gradle"
}

if (!(Test-Path $javaHome)) {
  throw "JDK nao encontrado. Verifique .tools\\jdk17 ou JAVA_HOME."
}

if (!(Test-Path "C:\asdk")) {
  throw "Android SDK nao encontrado em C:\asdk"
}

if (!(Test-Path $downloadsDir)) {
  New-Item -ItemType Directory -Path $downloadsDir | Out-Null
}

if (!(Test-Path $keystoreDir)) {
  New-Item -ItemType Directory -Path $keystoreDir | Out-Null
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = "C:\asdk"
$env:ANDROID_SDK_ROOT = "C:\asdk"
$env:GRADLE_USER_HOME = Join-Path $root ".tools\gradle-home"
$env:Path = "$($env:JAVA_HOME)\bin;$env:ANDROID_SDK_ROOT\platform-tools;$env:Path"

if (!(Test-Path $localProps)) {
  @"
sdk.dir=C\:\\asdk
"@ | Set-Content -Path $localProps -Encoding UTF8
}

if (!(Test-Path $keystorePropsFile)) {
  $alphabet = (48..57 + 65..90 + 97..122 | ForEach-Object { [char]$_ })
  $storePassword = -join (1..24 | ForEach-Object { $alphabet | Get-Random })
  $keyPassword = -join (1..24 | ForEach-Object { $alphabet | Get-Random })
  $keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"

  & $keytool `
    -genkeypair `
    -v `
    -keystore $keystoreFile `
    -storetype JKS `
    -storepass $storePassword `
    -keypass $keyPassword `
    -alias fast-crochet-upload `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -dname "CN=Quaraci Dev, OU=Mobile, O=Quaraci Dev, L=Fortaleza, ST=CE, C=BR"

  @"
storeFile=keystore/fast-crochet-upload.jks
storePassword=$storePassword
keyAlias=fast-crochet-upload
keyPassword=$keyPassword
"@ | Set-Content -Path $keystorePropsFile -Encoding UTF8
}

Push-Location $androidDir
try {
  & $gradle clean bundleRelease -PappDistributionMode=play --no-daemon --console=plain
} finally {
  Pop-Location
}

if (!(Test-Path $releaseBundle)) {
  throw "AAB release nao foi gerado."
}

if (!(Test-Path $keystorePropsFile)) {
  throw "Arquivo de configuracao da chave nao encontrado em $keystorePropsFile"
}

$keystoreProps = @{}
Get-Content $keystorePropsFile | ForEach-Object {
  if ($_ -match "^(?<key>[^=]+)=(?<value>.*)$") {
    $keystoreProps[$matches["key"]] = $matches["value"]
  }
}

$jarsigner = Join-Path $env:JAVA_HOME "bin\jarsigner.exe"

& $jarsigner `
  -sigalg SHA256withRSA `
  -digestalg SHA-256 `
  -keystore $keystoreFile `
  -storepass $keystoreProps["storePassword"] `
  -keypass $keystoreProps["keyPassword"] `
  $releaseBundle `
  $keystoreProps["keyAlias"]

Copy-Item -Path $releaseBundle -Destination $targetBundle -Force

Write-Host ""
Write-Host "Pacote Google Play gerado em:" -ForegroundColor Cyan
Write-Host $targetBundle -ForegroundColor Green
Write-Host ""
