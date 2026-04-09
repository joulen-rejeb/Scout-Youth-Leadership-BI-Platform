@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "prometheus.native.yml" (
  echo Fichier prometheus.native.yml manquant dans %~dp0
  pause
  exit /b 1
)

echo.
echo  Demarrer l API avant : cd ..\..  puis  npm run ml-api  (port 5050)
echo  Interface web       : http://127.0.0.1:9090
echo.

REM 1) Prometheus dans le PATH (installation systeme)
where prometheus.exe >nul 2>&1
if %errorlevel%==0 (
  prometheus.exe --config.file="%~dp0prometheus.native.yml" --web.listen-address=127.0.0.1:9090
  goto :end
)
where prometheus >nul 2>&1
if %errorlevel%==0 (
  prometheus --config.file="%~dp0prometheus.native.yml" --web.listen-address=127.0.0.1:9090
  goto :end
)

REM 2) prometheus.exe copie dans ce dossier
if exist "%~dp0prometheus.exe" (
  "%~dp0prometheus.exe" --config.file="%~dp0prometheus.native.yml" --web.listen-address=127.0.0.1:9090
  goto :end
)

echo  ======================================================================
echo   Prometheus introuvable : ni dans le PATH, ni en %~dp0prometheus.exe
echo   Ajoutez le dossier d installation au PATH, ou copiez prometheus.exe ici.
echo  ======================================================================
pause
exit /b 1

:end
pause
