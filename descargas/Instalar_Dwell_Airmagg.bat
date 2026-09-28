@echo off
title Instalar Dwell airmaggnature
echo.
echo   Descargando e instalando Dwell airmaggnature en tu carpeta Documentos...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $docs=[Environment]::GetFolderPath('MyDocuments'); $zip=Join-Path $env:TEMP 'DwellAirmagg.zip'; [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/kevindavidfernandeztorres9-tech/kevin-david/claude/youthful-ritchie-6e4v7w/descargas/DwellAirmagg.zip' -OutFile $zip; Expand-Archive -Force $zip $docs; $dir=Join-Path $docs 'DwellAirmagg'; Write-Host ('   Instalado en: ' + $dir); Start-Process explorer.exe $dir; Start-Process (Join-Path $dir 'Abrir_Dwell_Airmagg.bat') -WorkingDirectory $dir"
if errorlevel 1 (
    echo.
    echo   No se pudo descargar. Revisa tu internet y vuelve a intentar.
    pause
    exit /b 1
)
echo.
echo   Listo. Se abrio la carpeta y la app. El icono "Dwell Airmagg" queda en tu Escritorio.
timeout /t 8 >nul
