# Vaye App Icons

Complete icon asset package for iOS, Android, and Web platforms.

## 📦 Package Contents

```
app_icons/
├── ios/                    # iOS App Icons
│   ├── Icon-App-*.png     # All required iOS sizes
│   └── Contents.json      # Asset catalog configuration
│
├── android/               # Android App Icons
│   ├── mipmap-mdpi/      # 48dp (1x density)
│   ├── mipmap-hdpi/      # 72dp (1.5x density)
│   ├── mipmap-xhdpi/     # 96dp (2x density)
│   ├── mipmap-xxhdpi/    # 144dp (3x density)
│   ├── mipmap-xxxhdpi/   # 192dp (4x density)
│   ├── mipmap-anydpi-v26/ # Adaptive icons (Android 8.0+)
│   └── values/           # Background color resource
│
└── web/                  # Web/PWA Icons
    ├── favicon.ico       # Multi-size favicon
    ├── favicon-*.png     # PNG favicons
    ├── apple-touch-icon.png
    ├── android-chrome-*.png
    ├── icon-*.png
    └── manifest.json     # PWA manifest
```

## 📱 iOS Integration

### For Native iOS Apps (Xcode)

1. **Using Asset Catalog (Recommended):**
   - In Xcode, navigate to your `Assets.xcassets` folder
   - Create a new App Icon set (or use existing `AppIcon`)
   - Drag and drop all icons from the `ios/` folder into the appropriate slots
   - Or simply copy the entire contents including `Contents.json`

2. **File Naming Convention:**
   - Files follow Apple's naming convention: `Icon-App-{size}@{scale}x.png`
   - The `Contents.json` maps these files to their purpose

3. **Included Sizes:**
   - iPhone notification: 20pt (@2x, @3x)
   - iPhone settings: 29pt (@2x, @3x)
   - iPhone spotlight: 40pt (@2x, @3x)
   - iPhone app: 60pt (@2x, @3x)
   - iPad notification: 20pt (@1x, @2x)
   - iPad settings: 29pt (@1x, @2x)
   - iPad spotlight: 40pt (@1x, @2x)
   - iPad app: 76pt (@1x, @2x)
   - iPad Pro app: 83.5pt (@2x)
   - App Store: 1024pt (@1x)

### For React Native (iOS)

1. Copy all files from `ios/` to:
   ```
   ios/YourAppName/Images.xcassets/AppIcon.appiconset/
   ```

2. Make sure `Contents.json` is included

3. Clean and rebuild:
   ```bash
   cd ios
   pod install
   cd ..
   npx react-native run-ios
   ```

## 🤖 Android Integration

### For Native Android Apps

1. **Copy Icon Files:**
   Copy all folders from `android/` to:
   ```
   app/src/main/res/
   ```

   This includes:
   - `mipmap-mdpi/`
   - `mipmap-hdpi/`
   - `mipmap-xhdpi/`
   - `mipmap-xxhdpi/`
   - `mipmap-xxxhdpi/`
   - `mipmap-anydpi-v26/`
   - `values/`

2. **Update AndroidManifest.xml:**
   ```xml
   <application
       android:icon="@mipmap/ic_launcher"
       android:roundIcon="@mipmap/ic_launcher_round"
       ...>
   ```

3. **Features:**
   - ✅ Standard launcher icons for all densities
   - ✅ Round icons for devices that support them
   - ✅ Adaptive icons (Android 8.0+) with foreground/background layers
   - ✅ Background color: #F4CE37 (Vaye yellow)

### For React Native (Android)

1. Copy all folders from `android/` to:
   ```
   android/app/src/main/res/
   ```

2. Clean and rebuild:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

### For Flutter

1. Copy all folders from `android/` to:
   ```
   android/app/src/main/res/
   ```

2. Update `android/app/src/main/AndroidManifest.xml` as shown above

## 🌐 Web/PWA Integration

### Favicon Setup

1. **Copy favicon files to your public/root directory:**
   ```
   favicon.ico
   favicon-16x16.png
   favicon-32x32.png
   favicon-48x48.png
   ```

2. **Add to your HTML `<head>`:**
   ```html
   <link rel="icon" type="image/x-icon" href="/favicon.ico">
   <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
   <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
   <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
   ```

### Apple Touch Icon

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### PWA Manifest

1. **Copy `manifest.json` to your public directory**

2. **Update paths in manifest.json if needed**

3. **Link in your HTML:**
   ```html
   <link rel="manifest" href="/manifest.json">
   <meta name="theme-color" content="#F4CE37">
   ```

4. **Customize manifest.json:**
   - Update `name`, `short_name`, `description`
   - Adjust `start_url` if needed
   - Modify colors to match your brand

## 🎨 Design Specifications

- **Brand Color:** #F4CE37 (Yellow)
- **Logo Style:** White text with dark blue outline
- **Format:** PNG with transparency
- **Source:** 512x512px high-resolution logo

## 🔧 Regenerating Icons

If you need to regenerate icons from a new source image:

1. Update the `SOURCE_IMAGE` path in `generate_app_icons.py`
2. Run:
   ```bash
   python3 generate_app_icons.py
   ```

## 📋 Icon Checklist

### iOS
- [x] iPhone app icons (60pt @2x, @3x)
- [x] iPhone notification icons (20pt)
- [x] iPhone settings icons (29pt)
- [x] iPhone spotlight icons (40pt)
- [x] iPad app icons (76pt, 83.5pt)
- [x] iPad notification/settings/spotlight icons
- [x] App Store icon (1024pt)
- [x] Contents.json for asset catalog

### Android
- [x] Standard launcher icons (all densities)
- [x] Round launcher icons
- [x] Adaptive icon foreground layers
- [x] Adaptive icon background color
- [x] XML configuration files

### Web
- [x] Favicon (multi-size .ico)
- [x] PNG favicons (16x16, 32x32, 48x48)
- [x] Apple touch icon (180x180)
- [x] PWA icons (192x192, 512x512)
- [x] PWA manifest.json

## 🚀 Quick Start

### React Native

```bash
# iOS
cp -r ios/* path/to/your/project/ios/AppName/Images.xcassets/AppIcon.appiconset/

# Android
cp -r android/* path/to/your/project/android/app/src/main/res/
```

### Flutter

```bash
# iOS
cp -r ios/* path/to/your/project/ios/Runner/Assets.xcassets/AppIcon.appiconset/

# Android
cp -r android/* path/to/your/project/android/app/src/main/res/
```

### Web/React

```bash
# Copy web assets to public folder
cp web/* path/to/your/project/public/
```

## 📝 Notes

- All icons maintain the original aspect ratio and design
- PNG format with transparency support
- Optimized for both light and dark themes
- Includes support for latest Android adaptive icons
- PWA-ready with proper manifest configuration

## 🆘 Troubleshooting

### iOS Icons Not Showing

1. Clean build folder: Xcode → Product → Clean Build Folder
2. Delete derived data
3. Restart Xcode
4. Rebuild project

### Android Icons Not Showing

1. Clean project:
   ```bash
   cd android
   ./gradlew clean
   ```
2. Invalidate caches in Android Studio
3. Rebuild project

### React Native Icons Not Updating

```bash
# iOS
cd ios && rm -rf build && cd ..
npx react-native run-ios

# Android
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

## 📞 Support

For issues or questions, refer to platform-specific documentation:
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android App Icon Guidelines](https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher)
- [PWA Icon Guidelines](https://web.dev/add-manifest/)

---

Generated with ❤️ for Vaye
