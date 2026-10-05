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

The daily run sends one mail with two parts: what is being charged *today*, and
what renews in the next three days. Today's renewals are advanced only on the
following day, so the day the money leaves is a day the app can still talk about
— advancing first is what used to make a charge-day pass in silence.

## Reading a screenshot

"Import from screenshot" pre-fills the form from a receipt. It asks Gemini
(`gemini-3.8-flash`, then two older ones) through Google's OpenAI-compatible
endpoint, and falls back to Workers AI's small vision model when there is no key
or the free tier is busy. Dates are where a receipt is most often misread, so the
prompt spells out the Czech and US orders; whatever comes back only pre-fills the
form, and nothing is saved without you.

```
wrangler secret put GEMINI_API_KEY     # a free key from Google AI Studio
```

## Migrations

`npm run db:remote` applies `0001` only. Later ones are applied by hand:

```
wrangler d1 execute subscription-tracker-db --remote --file=./migrations/0003_charge_notice.sql
```

## Deploy

```
npm run deploy
```
