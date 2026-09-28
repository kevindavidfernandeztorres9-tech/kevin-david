@echo off
setlocal
title Dwell airmaggnature
cd /d "%~dp0"
set "JAR=%~dp0DwellAirmagg.jar"

rem Crea un acceso directo en el Escritorio la primera vez
if not exist "%APPDATA%\DwellAirmagg\acceso.ok" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$l=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Dwell Airmagg.lnk'; $s=(New-Object -ComObject WScript.Shell).CreateShortcut($l); $s.TargetPath='%~f0'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.IconLocation='%SystemRoot%\System32\shell32.dll,13'; $s.Save()" >nul 2>&1
    if not exist "%APPDATA%\DwellAirmagg" mkdir "%APPDATA%\DwellAirmagg"
    echo ok> "%APPDATA%\DwellAirmagg\acceso.ok"
)

rem 1) Java que venga al lado (carpeta jre) o el de ControlNegocio, como tu Dwell anterior
for %%J in ("%~dp0jre\bin\javaw.exe" "%~dp0..\ControlNegocio\jre\bin\javaw.exe" "%~dp0..\..\ControlNegocio\jre\bin\javaw.exe") do (
    if exist "%%~J" (
        start "" "%%~J" -jar "%JAR%"
        exit /b 0
    )
)

rem 2) Java instalado en la laptop
where javaw >nul 2>&1
if not errorlevel 1 (
    start "" javaw -jar "%JAR%"
    exit /b 0
)

echo.
echo   No encontre Java en esta laptop.
echo   Se abrira la pagina para instalarlo (Java 21, gratis). Instala el "JRE" .msi,
echo   marca "Set JAVA_HOME" y "Add to PATH" si te lo pregunta, y vuelve a abrir este archivo.
echo.
start "" "https://adoptium.net/es/temurin/releases/?os=windows&arch=x64&package=jre&version=21"
pause
