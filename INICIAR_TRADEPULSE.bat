@echo off
title TradePulse AI - Servidor
color 0A
echo.
echo ========================================
echo   TradePulse AI - Iniciando Servidor
echo ========================================
echo.
echo Aguarde... O servidor esta iniciando.
echo.
echo Quando aparecer "Local: http://localhost:5173/"
echo abra seu navegador e va em: http://localhost:5173
echo.
echo ========================================
echo.

cd /d "%~dp0"
npm run dev

pause
