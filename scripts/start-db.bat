@echo off
echo ========================================
echo   ClaudApp - Base de datos MongoDB
echo ========================================
echo.

REM Verificar si Docker está instalado
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker no esta instalado
    echo.
    echo Descarga Docker Desktop desde:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

echo Iniciando MongoDB en Docker...
echo.

REM Iniciar MongoDB
docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   MongoDB iniciado correctamente
    echo ========================================
    echo.
    echo Informacion de conexion:
    echo    URI: mongodb://claudapp:claudapp123@localhost:27017/claudapp?authSource=admin
    echo    Host: localhost
    echo    Port: 27017
    echo    Database: claudapp
    echo    User: claudapp
    echo    Password: claudapp123
    echo.
    echo Comandos utiles:
    echo    Detener MongoDB: docker-compose down
    echo    Ver logs: docker-compose logs -f
    echo    Reiniciar: docker-compose restart
    echo.
) else (
    echo.
    echo ERROR: No se pudo iniciar MongoDB
    echo.
    echo Ver logs con: docker-compose logs
    echo.
    pause
    exit /b 1
)

pause
