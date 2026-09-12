const BASE = 'CZK'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// Rates only move daily at most, so a fresh fetch on every stats/history load is wasted
// latency — cache the result in D1 (survives cold starts, unlike an in-memory cache).
async function getRates(db: D1Database): Promise<Record<string, number>> {
  const cached = await db
    .prepare('SELECT rates_json, fetched_at FROM fx_rates_cache WHERE id = 1')
    .first<{ rates_json: string; fetched_at: string }>()
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
    return JSON.parse(cached.rates_json)
  }

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${BASE}`)
    if (res.ok) {
      const rates = ((await res.json()) as { rates: Record<string, number> }).rates
      await db
        .prepare(
          `INSERT INTO fx_rates_cache (id, rates_json, fetched_at) VALUES (1, ?, ?)
           ON CONFLICT(id) DO UPDATE SET rates_json = excluded.rates_json, fetched_at = excluded.fetched_at`,
        )
        .bind(JSON.stringify(rates), new Date().toISOString())
        .run()
      return rates
    }
  } catch {
    // fall through to stale cache below
  }

  // A stale cached rate beats no conversion at all if today's live fetch failed.
  return cached ? JSON.parse(cached.rates_json) : {}
}

// Frankfurter is free, keyless, ECB-rate-based — no account/API key needed. If both the
// live fetch and any cache are unavailable, entries fall back to their raw amount (the
// old, wrong-but-not-crashing behavior) rather than failing the whole stats page.
export async function convertAllToCZK(db: D1Database, entries: Array<{ amount: number; currency: string }>): Promise<number[]> {
  const foreign = new Set(entries.map((e) => e.currency.toUpperCase()).filter((c) => c !== BASE))
  if (foreign.size === 0) return entries.map((e) => e.amount)

  const rates = await getRates(db)

  return entries.map((e) => {
    const currency = e.currency.toUpperCase()
    if (currency === BASE) return e.amount
    const rate = rates[currency] // units of `currency` per 1 CZK
    return rate ? e.amount / rate : e.amount
  })
}
