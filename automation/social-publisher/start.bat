@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Social Publisher

docker info >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop is not running. Open Docker Desktop, wait until it says "Engine running", then try again.
  pause
  exit /b 1
)
if not exist ".env" (
  echo Missing .env  -  copy .env.example to .env and fill it in. See README.md, section "أول مرة".
  pause
  exit /b 1
)
if not exist "accounts.json" (
  echo Missing accounts.json  -  copy accounts.example.json to accounts.json and put your pages in it.
  pause
  exit /b 1
)
if not exist "logs" mkdir logs
if not exist "data\uploads" mkdir data\uploads

echo Starting n8n...
docker compose up -d
if errorlevel 1 (
  pause
  exit /b 1
)

echo Waiting for n8n to be ready...
for /l %%i in (1,1,60) do (
  curl -s http://localhost:5678/healthz/readiness | find "ok" >nul && goto ready
  timeout /t 2 /nobreak >nul
)
echo n8n did not answer in 2 minutes. Run: docker compose logs n8n
pause
exit /b 1

:ready
echo n8n is ready.
echo   Publish form : http://localhost:5678/form/publish
echo   TikTok link  : http://localhost:5678/form/tiktok-connect
echo   n8n editor   : http://localhost:5678
start "" "http://localhost:5678/form/publish"
start "" "http://localhost:5678"
timeout /t 5 >nul
