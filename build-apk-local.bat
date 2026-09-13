@echo off
echo ========================================================
echo       Women Safety SOS - Local APK Build Script
echo ========================================================
echo.

REM 1. Check Node & Java
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java JDK is not installed or not in PATH.
    pause
    exit /b 1
)

REM 2. Check Android SDK
if "%ANDROID_HOME%"=="" (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
        echo [INFO] Detected Android SDK at %ANDROID_HOME%
    ) else (
        echo [WARNING] ANDROID_HOME is not set and Android SDK was not found in the default path.
        echo If you have Android Studio installed, please set ANDROID_HOME to your SDK directory.
        echo Alternatively, push to GitHub to generate the APK automatically with GitHub Actions!
    )
)

if not "%ANDROID_HOME%"=="" (
    echo sdk.dir=%ANDROID_HOME:\=\\% > android\local.properties
    echo [INFO] Created android\local.properties pointing to %ANDROID_HOME%
)

REM 3. Install NPM dependencies
echo.
echo [1/2] Installing Node.js dependencies...
call npm install --legacy-peer-deps

REM 4. Build APK with Gradle
echo.
echo [2/2] Compiling Android APK with Gradle...
cd android
call gradlew.bat assembleDebug

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! APK generated successfully:
    echo  Location: android\app\build\outputs\apk\debug\app-debug.apk
    echo ========================================================
) else (
    echo.
    echo [BUILD NOTICE] Gradle compilation requires Android SDK Build-Tools 34.
    echo To build without installing Android SDK locally on your PC,
    echo use the included GitHub Actions workflow (.github/workflows/build-apk.yml)
    echo by pushing this repo to GitHub to get a 1-click cloud-compiled APK!
)

cd ..
pause
