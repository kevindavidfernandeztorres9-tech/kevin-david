@echo off
setlocal EnableExtensions
title Dwell en Tiempo Real
cd /d "%~dp0"

rem ================== CONFIGURACION (edita si cambia algo) ==================
set "DWELL_URL=https://dwell-tiendas1.vercel.app"
set "TIENDA=airmaggnature"
set "TIENDA_WEB=https://airmaggnature.myshopify.com"
set "SUPABASE_PROJECT=ircyyaftyugfyvqrjark"
rem ==========================================================================

rem Doble clic = menu. Tambien acepta un atajo: Abrir_Dwell_en_Tiempo_Real.bat 1
if not "%~1"=="" (
    set "OP=%~1"
    goto ejecutar
)

:menu
cls
echo.
echo   ===============================================
echo              DWELL EN TIEMPO REAL
echo   ===============================================
echo    Panel: %DWELL_URL%
echo    Tienda: %TIENDA%
echo   -----------------------------------------------
echo    1. Abrir el panel (navegador)
echo    2. Abrir el panel como app (ventana propia)
echo    3. Probar la tienda en incognito (genera una visita)
echo    4. Comprobar que el script de seguimiento responde
echo    5. Copiar la linea para Shopify de una tienda
echo    6. Abrir el editor de temas de Shopify
echo    7. Ver los datos en Supabase
echo    8. Abrir Vercel (deploys y variables)
echo    9. Crear acceso directo en el Escritorio
echo    J. Abrir el Dwell antiguo (Java), si esta en esta carpeta
echo    0. Salir
echo   -----------------------------------------------
set "OP="
set /p "OP=   Elige una opcion y pulsa Enter [1]: "
if "%OP%"=="" set "OP=1"

:ejecutar
if "%OP%"=="1" goto panel
if "%OP%"=="2" goto app
if "%OP%"=="3" goto probar
if "%OP%"=="4" goto comprobar
if "%OP%"=="5" goto linea
if "%OP%"=="6" goto shopify
if "%OP%"=="7" goto supabase
if "%OP%"=="8" goto vercel
if "%OP%"=="9" goto acceso
if /i "%OP%"=="J" goto java
if "%OP%"=="0" goto fin
echo.
echo   Opcion no valida.
goto pausa

:panel
start "" "%DWELL_URL%"
goto fin

:app
call :buscar_navegador
if defined CHROME (
    start "" "%CHROME%" --app="%DWELL_URL%"
) else (
    start "" msedge --app="%DWELL_URL%"
)
goto fin

:probar
call :buscar_navegador
if defined CHROME (
    start "" "%CHROME%" --incognito "%TIENDA_WEB%"
) else (
    start "" msedge --inprivate "%TIENDA_WEB%"
)
echo.
echo   Se abrio tu tienda en incognito.
echo   Quedate unos 20 segundos, baja por la pagina y cierra esa ventana.
echo   Luego abre el panel (opcion 1) y pulsa "Actualizar".
goto pausa

:comprobar
echo.
echo   Comprobando %DWELL_URL%/dwell.js ...
curl.exe -s -o nul -w "   Respuesta del servidor: %%{http_code}\n" "%DWELL_URL%/dwell.js"
if errorlevel 1 (
    echo   No hubo respuesta. Revisa tu internet o el deploy en Vercel ^(opcion 8^).
) else (
    echo   Si dice 200, el script esta en linea. Otro numero = revisa Vercel ^(opcion 8^).
)
goto pausa

:linea
echo.
set "NOMBRE="
set /p "NOMBRE=   Nombre de la tienda para data-store [%TIENDA%]: "
if "%NOMBRE%"=="" set "NOMBRE=%TIENDA%"
set "TMPF=%TEMP%\dwell_linea.txt"
> "%TMPF%" echo ^<script src="%DWELL_URL%/dwell.js" data-store="%NOMBRE%" defer^>^</script^>
clip < "%TMPF%"
echo.
type "%TMPF%"
del "%TMPF%" >nul 2>&1
echo.
echo   Copiada al portapapeles. En Shopify: Temas ^> Editar codigo ^> theme.liquid,
echo   pegala con Ctrl+V justo antes de ^</head^> y pulsa Guardar.
goto pausa

:shopify
start "" "https://admin.shopify.com/store/%TIENDA%/themes"
goto fin

:supabase
start "" "https://supabase.com/dashboard/project/%SUPABASE_PROJECT%/editor"
goto fin

:vercel
start "" "https://vercel.com/dashboard"
goto fin

:acceso
set "LNK=%USERPROFILE%\Desktop\Dwell en Tiempo Real.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut($env:LNK); $s.TargetPath='%~f0'; $s.WorkingDirectory='%~dp0'; $s.IconLocation='%SystemRoot%\System32\shell32.dll,13'; $s.Save()"
if errorlevel 1 (
    echo.
    echo   No se pudo crear el acceso directo.
) else (
    echo.
    echo   Listo: "Dwell en Tiempo Real" esta en tu Escritorio.
)
goto pausa

:java
if not exist "build\dwell\Main.class" (
    echo.
    echo   No encontre el Dwell antiguo ^(carpeta build^) junto a este archivo.
    goto pausa
)
rem Reutiliza el JRE embebido de ControlNegocio si esta al lado; si no, usa el del sistema.
if exist "..\ControlNegocio\jre\bin\javaw.exe" (
    start "" "..\ControlNegocio\jre\bin\javaw.exe" --enable-native-access=ALL-UNNAMED -cp "build;lib\flatlaf.jar" dwell.Main
) else (
    start "" javaw --enable-native-access=ALL-UNNAMED -cp "build;lib\flatlaf.jar" dwell.Main
)
goto fin

:buscar_navegador
set "CHROME="
for %%P in ("%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LocalAppData%\Google\Chrome\Application\chrome.exe") do (
    if not defined CHROME if exist "%%~P" set "CHROME=%%~P"
)
exit /b 0

:pausa
echo.
pause
if "%~1"=="" goto menu

:fin
endlocal
exit /b 0
