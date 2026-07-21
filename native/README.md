# Questime Native Screen-Time Bridge

The web app calls `src/native/screenTime.ts`. On iOS and Android that bridge should be backed by a local Capacitor plugin named `ScreenTime`.

## iOS

Copy `native/ios/ScreenTimePlugin.swift` into `ios/App/App`, add a custom `CAPBridgeViewController`, and register the plugin in `capacitorDidLoad()`:

```swift
override open func capacitorDidLoad() {
    bridge?.registerPluginInstance(ScreenTimePlugin())
}
```

Production iOS screen-time control also needs Apple's Family Controls entitlement, a `FamilyActivityPicker` selection flow, `ManagedSettingsStore` shielding, and `DeviceActivity` schedules.

## Android

Copy `native/android/ScreenTimePlugin.java` into `android/app/src/main/java/com/questime/app`, then register it in `MainActivity.java` before `super.onCreate(savedInstanceState)`:

```java
registerPlugin(ScreenTimePlugin.class);
```

The Android stub opens usage-access settings and reports status. Hard blocking requires a Device Owner / DPC flow for lock task mode, or a carefully reviewed Accessibility-based blocker.
