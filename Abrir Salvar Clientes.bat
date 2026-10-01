@echo off
cd /d "%~dp0"

rem Reutiliza el JRE embebido de ControlNegocio si esta al lado (asi esta app
rem funciona igual en una laptop sin Java instalado); si no, usa el del sistema.
rem
rem El argumento opcional es la seccion de arranque: 0 En peligro, 1 El caso,
rem 2 Casos, 3 Mal envio, 4 Mensajes, 5 Resumen. Ej: Abrir Salvar Clientes.bat 1
if exist "..\ControlNegocio\jre\bin\javaw.exe" (
    start "" "..\ControlNegocio\jre\bin\javaw.exe" --enable-native-access=ALL-UNNAMED -cp "build;lib\flatlaf.jar" salvar.Main %1
) else (
    start "" javaw --enable-native-access=ALL-UNNAMED -cp "build;lib\flatlaf.jar" salvar.Main %1
)
