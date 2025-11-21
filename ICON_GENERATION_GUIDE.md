# 📱 Vaye Driver - Icon Generation Guide

## Required Icon Sizes

Based on your Vaye logo, you need to generate the following PNG files from the original image:

### 🌐 Web/PWA Icons (public/icons/)
- `favicon.ico` - 16x16, 32x32, 48x48 (multi-size ICO file)
- `icon-16x16.png` - 16x16 pixels
- `icon-32x32.png` - 32x32 pixels
- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-120x120.png` - 120x120 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels
- `apple-touch-icon.png` - 180x180 pixels

### 📱 iOS Icons (ios/App/App/Assets.xcassets/AppIcon.appiconset/)
- `Icon-App-20x20@1x.png` - 20x20 pixels
- `Icon-App-20x20@2x.png` - 40x40 pixels
- `Icon-App-20x20@3x.png` - 60x60 pixels
- `Icon-App-29x29@1x.png` - 29x29 pixels
- `Icon-App-29x29@2x.png` - 58x58 pixels
- `Icon-App-29x29@3x.png` - 87x87 pixels
- `Icon-App-40x40@1x.png` - 40x40 pixels
- `Icon-App-40x40@2x.png` - 80x80 pixels
- `Icon-App-40x40@3x.png` - 120x120 pixels
- `Icon-App-60x60@2x.png` - 120x120 pixels
- `Icon-App-60x60@3x.png` - 180x180 pixels
- `Icon-App-76x76@1x.png` - 76x76 pixels
- `Icon-App-76x76@2x.png` - 152x152 pixels
- `Icon-App-83.5x83.5@2x.png` - 167x167 pixels
- `Icon-App-1024x1024@1x.png` - 1024x1024 pixels

### 🤖 Android Icons (android/app/src/main/res/)
- `mipmap-mdpi/ic_launcher.png` - 48x48 pixels
- `mipmap-hdpi/ic_launcher.png` - 72x72 pixels  
- `mipmap-xhdpi/ic_launcher.png` - 96x96 pixels
- `mipmap-xxhdpi/ic_launcher.png` - 144x144 pixels
- `mipmap-xxxhdpi/ic_launcher.png` - 192x192 pixels

### 🔔 Android Notification Icons (android/app/src/main/res/)
- `drawable-mdpi/ic_stat_icon_config_sample.png` - 24x24 pixels (white/transparent)
- `drawable-hdpi/ic_stat_icon_config_sample.png` - 36x36 pixels (white/transparent)
- `drawable-xhdpi/ic_stat_icon_config_sample.png` - 48x48 pixels (white/transparent)
- `drawable-xxhdpi/ic_stat_icon_config_sample.png` - 72x72 pixels (white/transparent)
- `drawable-xxxhdpi/ic_stat_icon_config_sample.png` - 96x96 pixels (white/transparent)

## 🛠️ How to Generate These Files

### Option 1: Online Tools (Recommended)
1. **App Icon Generator**: https://appicon.co/
   - Upload your Vaye logo
   - Select "iOS", "Android", and "Web" 
   - Download all generated sizes

2. **PWA Asset Generator**: https://pwa-asset-generator.dev/
   - Generate PWA icons and splash screens

### Option 2: Command Line (ImageMagick)
```bash
# Install ImageMagick first
# For each size, run:
magick convert vaye-logo.png -resize 192x192 icon-192x192.png
```

### Option 3: Figma/Photoshop
- Create artboards for each size
- Export as PNG with transparent backgrounds

## 📝 Important Notes

1. **Background**: Keep yellow (#FFC107) background for app icons
2. **Notification Icons**: Must be white silhouette on transparent background  
3. **iOS**: No transparency, square with rounded corners applied by system
4. **Android**: Can have transparency, adaptive icons supported
5. **Quality**: Use PNG-24 format for best quality

## ✅ Next Steps

1. Generate all the PNG files from your logo
2. Place them in the correct directories
3. Run `npx cap add ios android` to create native projects
4. Copy icons to native project directories
5. Build and test on devices

Let me know when you've generated the icons and I'll help you set up the native projects!