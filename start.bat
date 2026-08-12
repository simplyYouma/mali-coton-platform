@echo off
rem PASET Mali - lanceur de developpement pour Windows.
rem
rem Double-cliquez sur ce fichier pour demarrer le projet.
rem Il delegue tout le travail a start.sh, execute par Git Bash.

setlocal enabledelayedexpansion
cd /d "%~dp0"

set "BASH="

rem Emplacements habituels de Git pour Windows.
if exist "%ProgramFiles%\Git\bin\bash.exe"        set "BASH=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH if exist "%ProgramFiles(x86)%\Git\bin\bash.exe" set "BASH=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not defined BASH if exist "%LocalAppData%\Programs\Git\bin\bash.exe" set "BASH=%LocalAppData%\Programs\Git\bin\bash.exe"

rem Sinon, on deduit l'emplacement depuis le git present dans le PATH.
if not defined BASH (
  for /f "delims=" %%G in ('where git 2^>nul') do (
    if not defined BASH (
      set "GITDIR=%%~dpG"
      if exist "!GITDIR!..\bin\bash.exe" set "BASH=!GITDIR!..\bin\bash.exe"
      if not defined BASH if exist "!GITDIR!bash.exe" set "BASH=!GITDIR!bash.exe"
    )
  )
)

if not defined BASH (
  echo.
  echo   [X] Git pour Windows est introuvable.
  echo.
  echo   Ce lanceur a besoin de Git Bash pour fonctionner.
  echo.
  echo   A faire :
  echo     1. Telecharger Git pour Windows sur https://git-scm.com/download/win
  echo     2. L'installer en laissant toutes les options par defaut
  echo     3. Fermer cette fenetre, puis relancer start.bat
  echo.
  echo   Solution de secours sans Git Bash, dans un terminal :
  echo     npm install
  echo     npm run dev
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0start.sh" (
  echo.
  echo   [X] Fichier start.sh introuvable.
  echo.
  echo   start.bat et start.sh doivent rester cote a cote,
  echo   a la racine du projet.
  echo.
  echo   Dossier inspecte : %~dp0
  echo.
  pause
  exit /b 1
)

"%BASH%" "%~dp0start.sh" %*
exit /b %errorlevel%
