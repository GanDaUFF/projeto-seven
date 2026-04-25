@echo off
chcp 65001 > nul
title Gestão de OS — Seven

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         GESTÃO DE OS — SEVEN             ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Descobre o IP local automaticamente
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP: =%

echo  Acesso local:    http://localhost:3000
echo  Acesso na rede:  http://%IP%:3000
echo.

:: Verifica se ngrok.exe existe na pasta
if exist "%~dp0ngrok.exe" (
    echo  [NGROK] Iniciando túnel externo...
    start "ngrok" /min "%~dp0ngrok.exe" http 3000
    echo  [NGROK] Aguarde alguns segundos e acesse http://localhost:4040
    echo  [NGROK] A URL pública aparecerá automaticamente no sistema.
) else (
    echo  [NGROK] ngrok.exe não encontrado — rodando apenas na rede local.
)

echo.
echo  Pressione Ctrl+C para encerrar.
echo  ─────────────────────────────────────────
echo.

node backend\server.js

pause
