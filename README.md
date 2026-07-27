# Questime

Questime is a Capacitor-first family screen-time app. The web layer owns the dashboard, quest generation, and Supabase calls. Native iOS/Android code owns device screen-time permissions and enforcement.

This repository is the Capacitor fallback prototype. Active product development continues in the Flutter-based [TaskAssassin repository](https://github.com/Powerwyze/TaskAssassin), which is being renamed and evolved into Questime.

## Run the web app

```bash
npm install
npm run dev
```

## Test on Android phones

Questime now includes debug-phone scripts:

```bash
npm run android:devices
npm run android:build
npm run android:install
```

The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`. See [ANDROID_TESTING.md](./ANDROID_TESTING.md) for the full phone-testing checklist.

## Server-side AI

The OpenAI key belongs only in Supabase Edge Functions or local server env files. The Vite client reads only `VITE_` variables.

Local env:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENAI_MODEL=gpt-5.6
```

Keep `OPENAI_API_KEY` out of the Vite client. Use it only from Supabase Edge Functions or local server-side env files that are ignored by Git.

## Capacitor

```bash
npm run cap:add:ios
npm run cap:add:android
npm run cap:sync
```

Native screen-time bridge templates live in `native/`.
