# Questime

Questime is a Capacitor-first family screen-time app. The web layer owns the dashboard, quest generation, and Supabase calls. Native iOS/Android code owns device screen-time permissions and enforcement.

This repository is the Capacitor fallback prototype. Active product development continues in the Flutter-based [TaskAssassin repository](https://github.com/Powerwyze/TaskAssassin), which is being renamed and evolved into Questime.

## Run the web app

```bash
npm install
npm run dev
```

## Server-side AI

The OpenAI key belongs only in Supabase Edge Functions or local server env files. The Vite client reads only `VITE_` variables.

Local env:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENAI_MODEL=gpt-5.6
```

The `OPENAI_API_KEY` has been saved to `.env.local` for local Edge Function work.

## Capacitor

```bash
npm run cap:add:ios
npm run cap:add:android
npm run cap:sync
```

Native screen-time bridge templates live in `native/`.
