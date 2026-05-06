@echo off
title RecruitAI Backend Server
echo.
echo  RecruitAI Backend Server
echo  ========================
echo.
echo  Uygulama baslatiliyor...
echo  Adres: http://127.0.0.1:8000
echo.
echo  Durdurmak icin: Ctrl+C
echo  ========================
echo.

cd /d "%~dp0"
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

echo.
echo  Sunucu durduruldu.
pause
