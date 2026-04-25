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

echo  Iniciando servidor...
echo.
echo  Acesso local:    http://localhost:3000
echo  Acesso na rede:  http://%IP%:3000
echo.
echo  Pressione Ctrl+C para encerrar.
echo  ─────────────────────────────────────────
echo.

node backend\server.js

pause
