@echo off
title Gestao de OS - Seven
cd /d "%~dp0"

echo.
echo  ====================================
echo       GESTAO DE OS - SEVEN
echo  ====================================
echo.

echo  [1/3] Encerrando processos anteriores...
taskkill /f /im node.exe  > nul 2>&1
taskkill /f /im ngrok.exe > nul 2>&1
timeout /t 2 /nobreak > nul

set IP=
for /f "skip=1 tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    if not defined IP set IP=%%a
)
set IP=%IP: =%

if not exist "%~dp0ngrok.exe" goto :sem_ngrok

echo  [2/3] Iniciando ngrok...
cmd /c cscript //nologo "%~dp0ngrok_start.vbs"
timeout /t 4 /nobreak > nul

tasklist /fi "imagename eq ngrok.exe" 2>nul | find /i "ngrok.exe" > nul
if not errorlevel 1 goto :ngrok_ok

powershell -Command "Start-Process -FilePath '%~dp0ngrok.exe' -ArgumentList 'http 3000' -WindowStyle Normal"
timeout /t 3 /nobreak > nul

tasklist /fi "imagename eq ngrok.exe" 2>nul | find /i "ngrok.exe" > nul
if not errorlevel 1 goto :ngrok_ok

echo  [AVISO] ngrok nao iniciou - verifique ngrok.exe e authtoken.
goto :iniciar_servidor

:ngrok_ok
echo  [2/3] Ngrok ativo - URL publica aparece no sistema.
goto :iniciar_servidor

:sem_ngrok
echo  [2/3] ngrok.exe nao encontrado - apenas rede local.

:iniciar_servidor
echo  [3/3] Iniciando servidor...
echo.
echo  Local:  http://localhost:3000
if defined IP echo  Rede:   http://%IP%:3000
echo.

node backend\server.js
pause
