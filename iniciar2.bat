@echo off
title Gestao de OS - Nova Stack
cd /d "%~dp0"

echo.
echo  ====================================
echo       GESTAO DE OS - NOVA STACK
echo  ====================================
echo.
echo  Escolha o modo de inicializacao:
echo.
echo    [1] Desenvolvimento  (ts-node-dev + Vite dev, hot reload)
echo    [2] Producao         (build + node dist + vite preview)
echo.
set /p MODO="  Digite 1 ou 2: "

if "%MODO%"=="2" goto :producao
goto :desenvolvimento

:: ═══════════════════════════════════════════════════════════
::  DEV
:: ═══════════════════════════════════════════════════════════
:desenvolvimento
echo.
echo  [1/4] Encerrando processos anteriores...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " 2^>nul') do (
    taskkill /f /pid %%a > nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do (
    taskkill /f /pid %%a > nul 2>&1
)
taskkill /f /im ngrok.exe > nul 2>&1
timeout /t 2 /nobreak > nul

call :detectar_ip
call :verificar_deps
call :iniciar_ngrok

echo  [4/4] Iniciando servidores em modo DEV...
echo.
echo  Backend  (TypeScript): http://localhost:3001
echo  Frontend (React/Vite): http://localhost:5173
if defined IP echo  Rede frontend:         http://%IP%:5173
echo.

start "New Backend DEV - 3001" cmd /k "cd /d "%~dp0new-backend" && npx ts-node-dev --respawn --transpile-only src/server.ts"
timeout /t 3 /nobreak > nul
start "New Frontend DEV - 5173" cmd /k "cd /d "%~dp0new-frontend" && npx vite --host"
goto :fim

:: ═══════════════════════════════════════════════════════════
::  PROD
:: ═══════════════════════════════════════════════════════════
:producao
echo.
echo  [1/4] Encerrando processos anteriores...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " 2^>nul') do (
    taskkill /f /pid %%a > nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4173 " 2^>nul') do (
    taskkill /f /pid %%a > nul 2>&1
)
timeout /t 2 /nobreak > nul

call :detectar_ip
call :verificar_deps

echo  [2/4] Compilando frontend (Vite build)...
cd /d "%~dp0new-frontend"
call npm run build
if errorlevel 1 (
    echo  [ERRO] Falha no build do frontend. Verifique os erros acima.
    pause
    exit /b 1
)
cd /d "%~dp0"

echo  [3/4] Compilando backend (TypeScript)...
cd /d "%~dp0new-backend"
call npm run build
if errorlevel 1 (
    echo  [ERRO] Falha no build do backend. Verifique os erros acima.
    pause
    exit /b 1
)
cd /d "%~dp0"

echo  [4/4] Iniciando backend em modo PRODUCAO (serve o frontend)...
echo.
echo  App em: http://localhost:3001
if defined IP echo  Rede:   http://%IP%:3001
echo.
echo  Para expor externamente, configure Cloudflare Tunnel apontando para
echo  http://localhost:3001 e preencha publicBaseUrl em /configuracoes.
echo.

start "New Backend PROD - 3001" cmd /k "cd /d "%~dp0new-backend" && set "NODE_ENV=production" && node dist/server.js"
goto :fim

:: ═══════════════════════════════════════════════════════════
::  Subrotinas
:: ═══════════════════════════════════════════════════════════

:detectar_ip
set IP=
for /f "skip=1 tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    if not defined IP set IP=%%a
)
set IP=%IP: =%
goto :eof

:verificar_deps
if not exist "%~dp0new-backend\node_modules" (
    echo   Instalando dependencias do new-backend...
    cd /d "%~dp0new-backend"
    call npm install
    cd /d "%~dp0"
)
if not exist "%~dp0new-frontend\node_modules" (
    echo   Instalando dependencias do new-frontend...
    cd /d "%~dp0new-frontend"
    call npm install
    cd /d "%~dp0"
)
goto :eof

:iniciar_ngrok
echo  [3/4] Iniciando ngrok (porta 5173)...
if not exist "%~dp0ngrok.exe" (
    echo  ngrok.exe nao encontrado - apenas rede local.
    goto :eof
)
powershell -Command "Start-Process -FilePath '%~dp0ngrok.exe' -ArgumentList 'http 5173' -WindowStyle Normal"
timeout /t 4 /nobreak > nul
tasklist /fi "imagename eq ngrok.exe" 2>nul | find /i "ngrok.exe" > nul
if not errorlevel 1 (echo  Ngrok ativo.) else (echo  [AVISO] ngrok nao iniciou.)
goto :eof

:iniciar_ngrok_prod
echo  [4/5] Iniciando ngrok (porta 4173)...
if not exist "%~dp0ngrok.exe" (
    echo  ngrok.exe nao encontrado - apenas rede local.
    goto :eof
)
powershell -Command "Start-Process -FilePath '%~dp0ngrok.exe' -ArgumentList 'http 4173' -WindowStyle Normal"
timeout /t 4 /nobreak > nul
tasklist /fi "imagename eq ngrok.exe" 2>nul | find /i "ngrok.exe" > nul
if not errorlevel 1 (echo  Ngrok ativo.) else (echo  [AVISO] ngrok nao iniciou.)
goto :eof

:fim
echo  Aguarde os servidores iniciarem nas janelas abertas...
echo  Pressione qualquer tecla para fechar esta janela.
echo.
pause
