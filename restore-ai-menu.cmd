@echo off
setlocal
cd /d "%~dp0"
node scripts\restore-ai-menu.js %*
exit /b %errorlevel%
