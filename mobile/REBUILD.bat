@echo off
echo ========================================
echo Google Messages App - Rebuild Script
echo ========================================
echo.
echo This script will rebuild your app with the SMS fixes.
echo.
echo IMPORTANT: Make sure you have:
echo - Java Development Kit (JDK) installed
echo - Android SDK configured
echo - Node.js and npm installed
echo.
pause

echo.
echo Navigating to project directory...
cd /d "%~dp0"

echo.
echo Cleaning previous build...
cd android
if exist gradlew.bat (
    call gradlew.bat clean
) else (
    echo Gradlew not found, skipping Gradle clean...
)
cd ..

echo.
echo Building and running app on Android...
call npx expo run:android

echo.
echo ========================================
echo Build complete!
echo ========================================
echo.
echo Next steps:
echo 1. Grant SMS permissions when prompted
echo 2. Go to Android Settings to set as default SMS app:
echo    Settings ^> Apps ^> Default apps ^> SMS app
echo.
pause
