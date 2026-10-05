import type { BillingCycle, Category, Env, ExtractedSubscription } from './types'
import { BILLING_CYCLES, CATEGORIES } from './types'
import { pragueDay } from './dates'

// Reading a receipt is mostly reading small print: an amount, a currency, and a date written in
// whatever order the issuer felt like. The small vision model this started on (llava-1.5-7b, free
// on Workers AI) got names right and dates wrong often enough that a subscription could sit in the
// tracker on the wrong day for months — which is exactly how a charge goes unannounced. Gemini's
// free tier reads the same screenshot far more reliably and costs nothing, so it goes first and
// llava stays as the fallback for when there is no key or Gemini is having a bad day.
//
// Same chain and the same endpoint as job-tracker's server/ai/chat.ts, so one AI Studio key
// serves both. Either way this only pre-fills the form — nothing is saved without Erik.
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash']
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const GEMINI_TIMEOUT_MS = 25_000
// The free tier turns requests away with 503 "high demand" a fair share of the time, and the next
// call a second later usually goes through (measured 2026-10-05: roughly one in three attempts was
// turned away, in bursts). A busy model is therefore tried again instead of being written off and
// dropping the whole import to the small model.
// Two rounds, because this runs while Erik watches a spinner: every model busy costs about 25 s
// before the small model takes over, and three rounds made that close to a minute.
const BUSY_ROUNDS = 2
const BUSY_PAUSE_MS = 1_500
const WORKERS_MODEL = '@cf/llava-hf/llava-1.5-7b-hf'

const SHAPE =
  '{"name": string, "amount": number, "currency": string (ISO code like CZK/USD/EUR), ' +
  '"billingCycle": "monthly"|"yearly"|"weekly", "category": "streaming"|"software"|"fitness"|' +
  '"hosting_domains"|"other", "chargeDate": "YYYY-MM-DD" or null, "nextChargeDate": "YYYY-MM-DD" or null}'

// The date rules are spelled out because this is where a receipt is most often misread: Czech
// invoices write 5. 10. 2026 and US ones 10/5/2026 for the very same day.
const dateRules = (today: string) =>
  `Today is ${today}. Dates: "5. 10. 2026" and "5.10.2026" are Czech, day first (5 October 2026). ` +
  `"10/5/2026" is US, month first (5 October 2026). A date with no year is the most recent one up ` +
  `to today. chargeDate is the charge shown on the receipt; nextChargeDate only if the image ` +
  `states the next billing date outright, otherwise null. Amount: digits only, no currency sign, ` +
  `and a Czech decimal comma ("269,00") is a decimal point.`

const PROMPT = (today: string) =>
  `This is a screenshot of a payment, receipt, or subscription charge. Reply with ONLY a JSON ` +
  `object, no other text, in this exact shape: ${SHAPE}. ${dateRules(today)} Guess billingCycle ` +
  `("monthly" if unsure) and category ("other" if unsure) rather than omitting them.`

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' },
    billingCycle: { type: 'string', enum: BILLING_CYCLES },
    category: { type: 'string', enum: CATEGORIES },
    chargeDate: { type: ['string', 'null'] },
    nextChargeDate: { type: ['string', 'null'] },
  },
  required: ['name', 'amount', 'currency', 'billingCycle', 'category'],
}

/** Thrown for the answers worth trying again: the free tier being busy, or a request that timed out. */
class Busy extends Error {}

export async function extractSubscriptionFromImage(
  env: Env,
  imageBase64: string,
  mimeType = 'image/png',
): Promise<ExtractedSubscription> {
  const prompt = PROMPT(pragueDay())
  const models = env.GEMINI_API_KEY ? [...GEMINI_MODELS] : []

  for (let round = 0; round < BUSY_ROUNDS && models.length > 0; round++) {
    if (round > 0) await new Promise((resolve) => setTimeout(resolve, BUSY_PAUSE_MS))
    for (const model of [...models]) {
      try {
        return parse(await gemini(env.GEMINI_API_KEY!, model, prompt, imageBase64, mimeType), model)
      } catch (err) {
        console.warn(`[extract] ${model} failed: ${String(err).slice(0, 300)}`)
        // Anything other than "busy" is this model's own problem — a gone model, a rejected
        // request — so it does not get another round.
        if (!(err instanceof Busy)) models.splice(models.indexOf(model), 1)
      }
    }
  }
  return parse(await workersAi(env, prompt, imageBase64), WORKERS_MODEL)
}

async function gemini(key: string, model: string, prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'subscription', schema: SCHEMA } },
    }),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  }).catch((err: unknown) => {
    throw new Busy(`request failed: ${String(err).slice(0, 200)}`)
  })
  if (!res.ok) {
    const detail = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`
    throw res.status === 429 || res.status >= 500 ? new Busy(detail) : new Error(detail)
  }
  const out = (await res.json()) as { choices?: { message?: { content?: string | null } }[] }
  return out.choices?.[0]?.message?.content ?? ''
}

async function workersAi(env: Env, prompt: string, imageBase64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0))
  const result = (await env.AI.run(WORKERS_MODEL, { image: [...bytes], prompt, max_tokens: 512 })) as {
    description?: string
    response?: string
  }
  return result.description ?? result.response ?? ''
}

const UNREADABLE = 'Could not read that screenshot clearly — try a clearer image or add it manually'

function parse(text: string, via: string): ExtractedSubscription {
  // Gemini answers with the bare object; llava tends to wrap it in a sentence.
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(UNREADABLE)

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error(UNREADABLE)
  }

  const name = typeof parsed.name === 'string' ? parsed.name.trim() : ''
  const amount = Number(parsed.amount)
  if (!name || !Number.isFinite(amount)) {
    throw new Error('Could not make out the name or amount in that screenshot — try a clearer image or add it manually')
  }

  const date = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null)

  return {
    name,
    amount,
    currency: typeof parsed.currency === 'string' && parsed.currency.trim() ? parsed.currency.trim().toUpperCase() : 'CZK',
    billingCycle: BILLING_CYCLES.includes(parsed.billingCycle as BillingCycle) ? (parsed.billingCycle as BillingCycle) : 'monthly',
    category: CATEGORIES.includes(parsed.category as Category) ? (parsed.category as Category) : 'other',
    chargeDate: date(parsed.chargeDate),
    nextChargeDate: date(parsed.nextChargeDate),
    via,
  }
}
