const BASE = 'CZK'

// Frankfurter is free, keyless, ECB-rate-based — no account/API key needed. If it's
// unreachable, entries fall back to their raw amount (the old, wrong-but-not-crashing
// behavior) rather than failing the whole stats page.
export async function convertAllToCZK(entries: Array<{ amount: number; currency: string }>): Promise<number[]> {
  const foreign = new Set(entries.map((e) => e.currency.toUpperCase()).filter((c) => c !== BASE))
  if (foreign.size === 0) return entries.map((e) => e.amount)

  let rates: Record<string, number> = {}
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${BASE}`)
    if (res.ok) rates = ((await res.json()) as { rates: Record<string, number> }).rates
  } catch {
    // leave rates empty; entries below fall back to their raw amount
  }

  return entries.map((e) => {
    const currency = e.currency.toUpperCase()
    if (currency === BASE) return e.amount
    const rate = rates[currency] // units of `currency` per 1 CZK
    return rate ? e.amount / rate : e.amount
  })
}
