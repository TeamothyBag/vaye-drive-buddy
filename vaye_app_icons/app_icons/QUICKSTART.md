# Quick Start Guide - Vaye App Icons

## 🚀 1-Minute Integration

### React Native

**iOS:**
```bash
# Navigate to your iOS assets folder
cd ios/YourAppName/Images.xcassets/AppIcon.appiconset/

# Copy all iOS icons
cp /path/to/app_icons/ios/* .
```

**Android:**
```bash
# Navigate to Android resources
cd android/app/src/main/

# Copy all Android resources
cp -r /path/to/app_icons/android/* res/
```

**Rebuild:**
```bash
# Clean and rebuild
npx react-native run-ios
npx react-native run-android
```

---

### Flutter

**iOS:**
```bash
cp -r /path/to/app_icons/ios/* ios/Runner/Assets.xcassets/AppIcon.appiconset/
```

**Android:**
```bash
cp -r /path/to/app_icons/android/* android/app/src/main/res/
```

**Rebuild:**
```bash
flutter clean
flutter run
```

---

### Web/React/Vue/Angular

**Copy to public folder:**
```bash
cp /path/to/app_icons/web/* public/
```

**Add to index.html `<head>`:**
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#F4CE37">
```

---

## 📋 Platform-Specific Notes

### iOS
- ✅ All required sizes included (20pt to 1024pt)
- ✅ iPhone & iPad support
- ✅ Includes Contents.json for asset catalog
- ⚠️ Don't forget to clean build folder after adding icons

### Android
- ✅ All density variants (mdpi to xxxhdpi)
- ✅ Adaptive icons for Android 8.0+
- ✅ Round icons for supported launchers
- ⚠️ Make sure to update AndroidManifest.xml with icon references

### Web/PWA
- ✅ Multi-size favicon.ico
- ✅ PNG favicons for all sizes
- ✅ PWA manifest ready
- ✅ Apple touch icon included
- ⚠️ Update manifest.json with your app details

---

## 🎯 What's Included

**iOS:** 21 icon files + Contents.json
**Android:** 15 icon files + XML configs
**Web:** 8 icon files + manifest.json

**Total:** 44 PNG icons + config files

---

## 🔍 Verify Installation

### iOS (Xcode)
1. Open your project in Xcode
2. Navigate to Assets.xcassets
3. Click AppIcon
4. All slots should be filled with yellow Vaye icons

### Android (Android Studio)
1. Open project in Android Studio
2. Navigate to res/mipmap folders
3. Should see ic_launcher icons in each density folder
4. Check res/mipmap-anydpi-v26 for adaptive icon XMLs

### Web
1. Open your site in browser
2. Check favicon in browser tab
3. Bookmark the page to see Apple touch icon
4. Use Lighthouse to verify PWA manifest

---

## 🆘 Common Issues

**Icons not showing after integration?**

**iOS:**
```bash
# Clean build
Product → Clean Build Folder in Xcode
# Or terminal:
cd ios && xcodebuild clean && cd ..
```

**Android:**
```bash
cd android && ./gradlew clean && cd ..
```

**React Native:**
```bash
# Reset cache
npx react-native start --reset-cache

# Reinstall (if needed)
cd ios && pod install && cd ..
```

---

## 📚 Full Documentation

See `README.md` for:
- Detailed integration instructions
- Platform-specific guidelines
- Troubleshooting guide
- Regeneration instructions

---

## 🎨 Design Specs

- **Color:** #F4CE37 (Vaye Yellow)
- **Style:** White text, dark blue outline
- **Format:** PNG with transparency
- **Source:** 512x512px optimized

---

**Need help?** Check `README.md` or platform documentation:
- [iOS Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android Guidelines](https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher)
- [PWA Guidelines](https://web.dev/add-manifest/)
