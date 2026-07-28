# Push Notifications Setup Guide

Your app now has Firebase Cloud Messaging (FCM) integrated for external push notifications on Android and Web. Follow these steps to complete the setup:

## 1. Firebase Console Configuration

### Create/Configure Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your existing Firebase project or create a new one
3. Add both **Android** and **Web** apps to your project

### For Android:
1. Register your Android app with package name (find it in `android/app/build.gradle`)
2. Download `google-services.json`
3. Place it in `android/app/` directory
4. Add the Firebase SDK to your Android project:
   - In `android/build.gradle` (project level), add:
     ```gradle
     buildscript {
       dependencies {
         classpath 'com.google.gms:google-services:4.4.0'
       }
     }
     ```
   - In `android/app/build.gradle` (app level), add at the bottom:
     ```gradle
     apply plugin: 'com.google.gms.google-services'
     ```

### For Web:
1. Go to Project Settings > General > Your apps > Web app
2. Copy your Firebase config object
3. Update `web/firebase-messaging-sw.js` with your config:
   ```javascript
   firebase.initializeApp({
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   });
   ```

### Enable Cloud Messaging:
1. In Firebase Console, go to **Build > Cloud Messaging**
2. Enable Cloud Messaging API
3. For Web: Generate a VAPID key pair
   - Go to Project Settings > Cloud Messaging > Web Push certificates
   - Click "Generate key pair"
   - Copy the key and update `PushNotificationService._getVapidKey()` in `lib/services/push_notification_service.dart`:
     ```dart
     String? _getVapidKey() {
       return 'YOUR_VAPID_KEY_HERE';
     }
     ```

## 2. Database Schema Update

Add the `fcm_token` column to your `users` table in Supabase:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;
```

## 3. Sending Push Notifications

### From Firebase Console (Testing):
1. Go to Firebase Console > Engage > Cloud Messaging
2. Click "New campaign" > "Notifications"
3. Enter title and text
4. Click "Send test message"
5. Enter the FCM token (check your app logs for the token)

### Programmatically (From Backend/Supabase Edge Function):

You can send notifications using the Firebase Admin SDK or REST API. Here's an example using the REST API:

```typescript
// Example Supabase Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { userId, title, body, data } = await req.json();
  
  // Get user's FCM token
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data: user } = await supabase
    .from('users')
    .select('fcm_token')
    .eq('id', userId)
    .single();
  
  if (!user?.fcm_token) {
    return new Response('User has no FCM token', { status: 404 });
  }
  
  // Send notification via FCM
  const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`key=\${Deno.env.get('FCM_SERVER_KEY')}\`
    },
    body: JSON.stringify({
      to: user.fcm_token,
      notification: { title, body },
      data: data || {}
    })
  });
  
  return new Response(JSON.stringify({ success: true }));
});
```

### Get FCM Server Key:
1. Firebase Console > Project Settings > Cloud Messaging
2. Copy "Server key" under Cloud Messaging API (Legacy)
3. Store it as an environment variable in your backend

## 4. Testing Push Notifications

### Android:
1. Build and run the app on a physical Android device (emulators may not receive notifications reliably)
2. Check the console logs for the FCM token
3. Send a test notification from Firebase Console using that token
4. Test foreground (app open), background (app minimized), and terminated (app closed) scenarios

### Web:
1. Deploy your app or run it on `localhost` (FCM requires HTTPS or localhost)
2. Grant notification permission when prompted
3. Check browser console for the FCM token
4. Send a test notification from Firebase Console
5. Test with browser open and closed

## 5. Notification Handling

The app already handles:
- **Foreground**: Shows local notification when app is open
- **Background**: System notification displayed automatically
- **Terminated**: Notification displayed, data available when app opens

To add custom navigation when users tap notifications, update `_handleNotificationTap()` in `push_notification_service.dart`:

```dart
void _handleNotificationTap(RemoteMessage message) {
  final type = message.data['type'];
  
  if (type == 'mission') {
    // Navigate to mission detail
    final missionId = message.data['mission_id'];
    // Use your router to navigate
  } else if (type == 'message') {
    // Navigate to chat
    final friendId = message.data['friend_id'];
    // Use your router to navigate
  }
}
```

## 6. Permissions

The necessary permissions have been added:
- **Android**: `android.permission.POST_NOTIFICATIONS`, `android.permission.INTERNET`
- **Web**: Notification permission requested at runtime

## Troubleshooting

### "No FCM token received"
- Ensure Firebase is properly configured
- Check that google-services.json is in the correct location
- For web, ensure VAPID key is set

### "Notifications not showing"
- Check notification permissions are granted
- For Android 13+, runtime permission is required
- Ensure FCM is enabled in Firebase Console

### "Token not saving to database"
- Verify the `fcm_token` column exists in your `users` table
- Check Supabase connection and user authentication

## Next Steps

1. Complete Firebase setup for Android and Web
2. Add the `fcm_token` column to your database
3. Configure VAPID key for web push
4. Test notifications in all scenarios
5. Implement backend logic to send notifications on events (new mission, new message, etc.)
