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
$debugApk = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
$targetApk = Join-Path $downloadsDir "fast-crochet-android14-debug.apk"

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

Push-Location $androidDir
try {
  & $gradle clean assembleDebug --no-daemon --console=plain
} finally {
  Pop-Location
}

if (!(Test-Path $debugApk)) {
  throw "APK de debug nao foi gerado."
}

Copy-Item -Path $debugApk -Destination $targetApk -Force

Write-Host ""
Write-Host "APK gerado em:" -ForegroundColor Cyan
Write-Host $targetApk -ForegroundColor Green
Write-Host ""
