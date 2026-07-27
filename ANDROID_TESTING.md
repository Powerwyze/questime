# Android phone testing

Questime can be tested on Android as a Capacitor debug APK.

## Prerequisites

- Node.js + npm
- Android SDK / Android Studio
- JDK 21 or JDK 17
- A physical Android phone with Developer options and USB debugging enabled

If Gradle cannot find the Android SDK, create `android/local.properties`:

```properties
sdk.dir=/Users/wyze/Library/Android/sdk
```

`local.properties` is machine-local and should not be committed.

## Build a debug APK

```bash
npm install
npm run android:build
```

The debug APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Install on a connected Android phone

1. Connect the phone over USB.
2. Accept the USB debugging prompt on the phone.
3. Confirm the device is visible:

```bash
npm run android:devices
```

4. Build and install:

```bash
npm run android:install
```

Or install an already-built APK directly:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## What to test on-device

- The app opens as **Questime**.
- The child quest screen renders without horizontal overflow.
- **Grown-up settings** opens and closes.
- Target chips toggle on/off.
- **Make New Quest** generates a local fallback quest when Supabase env vars are absent.
- **Allow Device Access** opens Android Usage Access settings.
- After enabling Usage Access for Questime, reopening the app should report device access as ready/authorized.
- **Start My Quest** should show the Android native bridge message. Current prototype status: usage tracking is wired; hard blocking still needs Device Owner/DPC or Accessibility-blocker work.

## Current Android limitation

The Android bridge currently verifies Usage Access and can open the correct settings screen. It does **not** yet hard-block selected apps. Production-grade blocking requires either:

- Device Owner / DPC lock-task controls, or
- a carefully reviewed Accessibility-based app blocker.
