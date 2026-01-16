@echo off
echo ===================================
echo 올프(All Day Price) 크롤러 실행
echo ===================================

cd /d "%~dp0"

REM Python 가상환경 활성화 (있으면)
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM 크롤러 실행
python main.py

echo.
echo 크롤링이 완료되었습니다!
pause
