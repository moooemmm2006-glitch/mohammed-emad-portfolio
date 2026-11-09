@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Imports workflow.json into the running n8n, publishes it and restarts n8n.
docker compose exec -T n8n n8n import:workflow --input=/files/project/workflow.json
if errorlevel 1 (
  echo Import failed. Is n8n running ^(start.bat^) and did you create the owner account?
  pause
  exit /b 1
)
docker compose exec -T n8n n8n publish:workflow --id=SocialPublisher01
docker compose restart n8n
echo Done. Open n8n, set the YouTube credential on the two YouTube nodes, then use http://localhost:5678/form/publish
pause
