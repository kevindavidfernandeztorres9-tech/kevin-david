@echo off
cd /d "%~dp0"
echo Compilando Salvar Clientes...

rem El JRE embebido de ControlNegocio trae javaw pero NO javac, asi que para compilar
rem se usa el JDK del sistema. Si algun dia ese jre pasa a ser un JDK completo, la
rem primera rama lo aprovecha sin tocar nada.
if exist "..\ControlNegocio\jre\bin\javac.exe" (
    "..\ControlNegocio\jre\bin\javac.exe" -encoding UTF-8 -d build -cp "lib\flatlaf.jar" src\salvar\*.java
) else (
    javac -encoding UTF-8 -d build -cp "lib\flatlaf.jar" src\salvar\*.java
)

if errorlevel 1 (
    echo.
    echo FALLO la compilacion. Revisa los errores de arriba.
) else (
    echo.
    echo Listo. Abrela con "Abrir Salvar Clientes.bat".
)
pause
