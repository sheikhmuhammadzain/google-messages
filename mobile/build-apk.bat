@echo off
echo ========================================
echo EAS Cloud Build - APK Builder
echo ========================================
echo.
echo Logged in as: zainafzal
echo Project: google-messages-mobile
echo.
echo Choose build type:
echo.
echo 1. Development APK (for testing - faster)
echo 2. Production APK (for release - optimized)
echo 3. Check build status
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Building DEVELOPMENT APK...
    echo This will take 5-15 minutes.
    echo.
    call eas build --profile development --platform android
) else if "%choice%"=="2" (
    echo.
    echo Building PRODUCTION APK...
    echo This will take 10-20 minutes.
    echo.
    call eas build --profile production-apk --platform android
) else if "%choice%"=="3" (
    echo.
    echo Fetching build list...
    call eas build:list
) else (
    echo Invalid choice!
    pause
    exit /b
)

echo.
echo ========================================
echo Build command executed!
echo ========================================
echo.
echo What happens next:
echo 1. EAS will queue your build
echo 2. You'll get a build URL to monitor progress
echo 3. When complete, you'll get a download link
echo 4. Download APK and install on your device
echo.
echo To check builds later, run: eas build:list
echo.
pause
