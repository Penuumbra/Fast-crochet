@echo off
title Build APK - Fast Crochet

echo ===============================
echo BUILD AUTOMATICA DO APK
echo ===============================

REM Verifica se existe package.json
if not exist package.json (
    echo ERRO: package.json nao encontrado!
    pause
    exit /b
)

REM Detecta gerenciador de pacotes
where pnpm >nul 2>nul
if %errorlevel%==0 (
    set PKG=pnpm
) else (
    set PKG=npm
)

echo Usando %PKG%...

REM Instala dependencias
echo.
echo Instalando dependencias...
%PKG% install

REM Build web
echo.
echo Gerando build do app...
%PKG% run build

REM Verifica se capacitor ja foi iniciado
if not exist capacitor.config.* (
    echo.
    echo Inicializando Capacitor...
    npx cap init FastCrochet com.fastcrochet.app --web-dir=dist
)

REM Adiciona Android se nao existir
if not exist android (
    echo.
    echo Criando projeto Android...
    npx cap add android
)

REM Sincroniza
echo.
echo Sincronizando com Android...
npx cap sync

REM Entra na pasta android
cd android

REM Gera APK debug
echo.
echo Gerando APK DEBUG...
call gradlew.bat assembleDebug

REM Verifica sucesso
if %errorlevel% neq 0 (
    echo.
    echo ERRO ao gerar APK!
    pause
    exit /b
)

echo.
echo ===============================
echo APK GERADO COM SUCESSO
echo ===============================
echo.

echo Caminho do APK:
echo android\app\build\outputs\apk\debug\app-debug.apk

echo.
pause
