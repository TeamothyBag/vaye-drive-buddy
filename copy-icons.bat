@echo off
echo Copying Vaye app icons to Android project...

REM Copy mipmap-hdpi icons
copy "vaye_app_icons\app_icons\android\mipmap-hdpi\*.png" "android\app\src\main\res\mipmap-hdpi\" /Y

REM Copy mipmap-mdpi icons  
copy "vaye_app_icons\app_icons\android\mipmap-mdpi\*.png" "android\app\src\main\res\mipmap-mdpi\" /Y

REM Copy mipmap-xhdpi icons
copy "vaye_app_icons\app_icons\android\mipmap-xhdpi\*.png" "android\app\src\main\res\mipmap-xhdpi\" /Y

REM Copy mipmap-xxhdpi icons
copy "vaye_app_icons\app_icons\android\mipmap-xxhdpi\*.png" "android\app\src\main\res\mipmap-xxhdpi\" /Y

REM Copy mipmap-xxxhdpi icons
copy "vaye_app_icons\app_icons\android\mipmap-xxxhdpi\*.png" "android\app\src\main\res\mipmap-xxxhdpi\" /Y

echo.
echo Icon copying completed!
echo.
echo Next steps:
echo 1. Run: npx cap sync
echo 2. Build the Android app in Android Studio
echo.
pause