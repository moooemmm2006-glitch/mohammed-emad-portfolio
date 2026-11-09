@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Stopping n8n... (your workflows, credentials and logs are kept)
docker compose stop
echo Done.
timeout /t 3 >nul
