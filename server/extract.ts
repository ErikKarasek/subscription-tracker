import type { BillingCycle, Category, Env, ExtractedSubscription } from './types'
import { BILLING_CYCLES, CATEGORIES } from './types'

const MODEL = '@cf/llava-hf/llava-1.5-7b-hf'

const PROMPT =
  'This is a screenshot of a payment, receipt, or subscription charge. Reply with ONLY a JSON object, ' +
  'no other text, in this exact shape: {"name": string, "amount": number, "currency": string (ISO code ' +
  'like CZK/USD/EUR), "billingCycle": "monthly"|"yearly"|"weekly", "category": "streaming"|"software"|' +
  '"fitness"|"hosting_domains"|"other", "chargeDate": "YYYY-MM-DD" or null}. Guess billingCycle ' +
  '("monthly" if unsure) and category ("other" if unsure) rather than omitting them.'

// Free (Cloudflare Workers AI, within the daily neuron allowance) but a much smaller/older
// vision model than a frontier LLM — expect it to misread amounts/dates more often, which is
// why this only ever pre-fills the form for the user to check, never saves directly.
export async function extractSubscriptionFromImage(env: Env, imageBase64: string): Promise<ExtractedSubscription> {
  const bytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0))
  const result = (await env.AI.run(MODEL, { image: [...bytes], prompt: PROMPT, max_tokens: 512 })) as {
    description?: string
    response?: string
  }

  const text = result.description ?? result.response ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not read that screenshot clearly — try a clearer image or add it manually')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('Could not read that screenshot clearly — try a clearer image or add it manually')
  }

  const name = typeof parsed.name === 'string' ? parsed.name.trim() : ''
  const amount = Number(parsed.amount)
  if (!name || !Number.isFinite(amount)) {
    throw new Error('Could not make out the name or amount in that screenshot — try a clearer image or add it manually')
  }

  return {
    name,
    amount,
    currency: typeof parsed.currency === 'string' && parsed.currency.trim() ? parsed.currency.trim().toUpperCase() : 'CZK',
    billingCycle: BILLING_CYCLES.includes(parsed.billingCycle as BillingCycle) ? (parsed.billingCycle as BillingCycle) : 'monthly',
    category: CATEGORIES.includes(parsed.category as Category) ? (parsed.category as Category) : 'other',
    chargeDate:
      typeof parsed.chargeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.chargeDate) ? parsed.chargeDate : null,
  }
}
