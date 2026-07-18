# Native shell patches (applied after `npx cap add ios|android`)

## iOS — Info.plist usage strings

Add under `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Relune needs the camera for video calls, stories, and photo posts.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Relune needs the microphone for voice messages and calls.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Relune needs photo library access to share media.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Relune can save media you download to your library.</string>
```

Also enable Background Modes → Voice over IP / Audio if you ship CallKit later.

## Android — AndroidManifest.xml permissions

Ensure `android/app/src/main/AndroidManifest.xml` includes:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

For deep links, add an intent-filter for your HTTPS host (see `docs/MOBILE.md`).
