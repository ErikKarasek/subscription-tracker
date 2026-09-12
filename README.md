# Subscription Tracker

Track recurring subscriptions (streaming, software, fitness, hosting/domains...),
see real monthly/yearly spend by category, get reminded before renewals hit, and
see what's going unused.

React 19 + Vite + Tailwind v4 frontend, Hono API, Cloudflare Workers with static
assets + D1 for storage, a daily Cron Trigger to advance renewals and send
reminder/unused-subscription emails via Resend.

## Develop

```
npm install
npm run db:local        # apply the schema to local D1
npx wrangler dev        # real D1 + the scheduled handler
```

`npm run dev` (plain Vite) also works for UI-only work but has no real D1 —
use `wrangler dev` whenever a change needs actual persistence or the cron.

## Email reminders

Reminders are sent via [Resend](https://resend.com). Until `RESEND_API_KEY` is
set, the scheduled worker logs and skips sending — everything else works.

```
wrangler secret put RESEND_API_KEY
```

Also set `REMINDER_TO_EMAIL` in `wrangler.toml` to your own address (defaults
to a placeholder).

## Deploy

```
npm run deploy
```
