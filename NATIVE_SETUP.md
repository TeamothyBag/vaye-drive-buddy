# Vaye Driver - Native Mobile App Setup

This guide will help you set up and run the Vaye Driver app as a native iOS or Android application.

## Prerequisites

### For iOS Development
- macOS computer
- Xcode 14 or later
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer Account (for device testing)

### For Android Development
- Android Studio
- Android SDK (API level 22 or higher)
- Java Development Kit (JDK) 11 or later

### For Both Platforms
- Node.js and npm installed
- Git

## Initial Setup

### 1. Export and Clone Project

1. In Lovable, click "Export to GitHub" button
2. Clone the project from your GitHub repository:
   ```bash
   git clone <your-repo-url>
   cd vaye-drive-buddy
   ```

### 2. Install Dependencies

```bash
npm install
```

### 3. Add Native Platforms

#### For iOS:
```bash
npx cap add ios
npx cap update ios
```

#### For Android:
```bash
npx cap add android
npx cap update android
```

## Native Features Included

### ✅ GPS Tracking
- Real-time location tracking when driver is online
- High-accuracy positioning
- Battery-efficient tracking

### ✅ Background GPS Tracking
- Continues tracking during active trips
- Works even when app is in background
- Distance-based updates (every 10 meters)

### ✅ Push Notifications
- Receive ride requests instantly
- Works even when app is closed
- Custom notification sounds and vibrations

### ✅ Local Notifications
- On-device notifications for ride alerts
- Scheduled notifications
- Rich notification content

### ✅ Camera Access
- Take photos for profile picture
- Pick from photo gallery
- Image cropping and editing

### ✅ Haptic Feedback
- Tactile feedback for important actions
- Different vibration patterns for different events
- Enhances user experience

### ✅ Network Monitoring
- Real-time connection status
- Automatic offline mode
- Connection recovery handling

### ✅ App State Management
- Detect when app goes to background
- Handle app lifecycle events
- Optimize battery usage

## Required Permissions

### iOS (Info.plist)

You need to add these permissions to `ios/App/App/Info.plist`:

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Vaye Driver needs your location to connect you with passengers and track trips</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Vaye Driver needs your location to show nearby ride requests</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Vaye Driver needs background location access to track your trip progress</string>

<key>NSCameraUsageDescription</key>
<string>Vaye Driver needs camera access to update your profile photo and verify documents</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Vaye Driver needs photo access to let you choose a profile picture</string>

<key>NSMicrophoneUsageDescription</key>
<string>Vaye Driver needs microphone access for in-app calls with passengers</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

### Android (AndroidManifest.xml)

Add these permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Location Permissions -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Camera Permissions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- Network Permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Notification Permissions -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Foreground Service (for background tracking) -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

## Building and Running

### Build the Web Assets

Before running on a device, build the web assets:

```bash
npm run build
```

### Sync Capacitor

Sync the web code with native projects:

```bash
npx cap sync
```

### Run on iOS

```bash
npx cap open ios
```

Then in Xcode:
1. Select your development team
2. Choose a device or simulator
3. Click Run (▶️)

### Run on Android

```bash
npx cap open android
```

Then in Android Studio:
1. Wait for Gradle sync to complete
2. Select a device or emulator
3. Click Run (▶️)

Alternatively, run directly from command line:

```bash
# For Android
npx cap run android

# For iOS (Mac only)
npx cap run ios
```

## Development Workflow

### Hot Reload During Development

The app is configured to hot-reload from the Lovable sandbox:
- Make changes in Lovable
- Changes appear instantly on your device
- No need to rebuild the app

### Making Code Changes

After pulling code changes from Git:

```bash
npm install           # Install any new dependencies
npm run build        # Build web assets
npx cap sync         # Sync with native projects
```

## Testing Push Notifications

### iOS
1. Use a physical device (simulator doesn't support push)
2. Get device token from console logs
3. Send test notification using Firebase or APNS

### Android
1. Can test on emulator or physical device
2. Get device token from console logs
3. Send test notification using Firebase Cloud Messaging

## Background Geolocation Testing

1. Start a trip in the app
2. Put app in background
3. Move around (or simulate movement)
4. Check console logs for location updates
5. Background tracking will continue until trip ends

## Troubleshooting

### iOS Build Errors

**Problem:** Code signing issues
**Solution:** 
- Open project in Xcode
- Select your development team
- Check provisioning profiles

**Problem:** CocoaPods errors
**Solution:**
```bash
cd ios/App
pod install --repo-update
cd ../..
```

### Android Build Errors

**Problem:** Gradle sync failed
**Solution:**
```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

**Problem:** SDK not found
**Solution:** Open Android Studio → SDK Manager → Install required SDKs

### Location Not Working

1. Check permissions are granted
2. Enable location services on device
3. Check console for permission errors
4. For iOS: Make sure background modes are enabled

### Push Notifications Not Received

1. Check notification permissions are granted
2. Verify token registration in console
3. For iOS: Use physical device
4. Check Firebase/APNS configuration

## Production Build

### iOS

1. Open Xcode
2. Select "Any iOS Device (arm64)"
3. Product → Archive
4. Follow App Store submission process

### Android

1. Generate signed APK or AAB
2. In Android Studio: Build → Generate Signed Bundle/APK
3. Follow Google Play submission process

## Important Notes

- **Always run `npx cap sync` after:**
  - Installing new Capacitor plugins
  - Updating native code
  - Pulling changes from Git
  
- **Camera and location features only work on physical devices or specific emulators**

- **Background location tracking:**
  - Drains battery faster
  - Only active during trips
  - Automatically stops when trip ends

- **Push notifications:**
  - Require backend setup with Firebase
  - Need valid APNs certificates for iOS
  - Must request permissions at runtime

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Geolocation Plugin](https://capacitorjs.com/docs/apis/geolocation)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Capacitor Camera Plugin](https://capacitorjs.com/docs/apis/camera)
- [Background Geolocation Plugin](https://github.com/capacitor-community/background-geolocation)

## Support

For issues or questions:
1. Check Capacitor documentation
2. Review device logs in Xcode/Android Studio
3. Enable debug mode in capacitor.config.json
4. Check the project's GitHub issues

---

Happy coding! 🚗💨
