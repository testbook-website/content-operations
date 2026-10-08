@echo off
title Deploy to Vercel (Direct - No GitHub)
echo =====================================================================
echo   DIRECT VERCEL DEPLOYMENT (NO GITHUB EXPOSURE)
echo =====================================================================
echo.
echo This command uploads your dashboard files directly to Vercel.
echo No code or API keys will ever be sent to GitHub!
echo.
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
call vercel --prod
if %ERRORLEVEL% NEQ 0 (
    call npx -y vercel --prod
)
echo.
if %ERRORLEVEL% EQU 0 (
    echo =====================================================================
    echo [SUCCESS] Your dashboard is now LIVE on Vercel!
    echo =====================================================================
) else (
    echo =====================================================================
    echo [INFO] If this is your first time, please follow the login prompt.
    echo =====================================================================
)
echo.
pause
