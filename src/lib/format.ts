import type { BillingCycle, Category } from '../types'

export function formatMoney(amount: number, currency: string): string {
  return `${Math.round(amount * 100) / 100} ${currency}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Calendar days in Prague, not elapsed hours: a renewal stored at midnight today is 0 days away
// all day, rather than slipping to -1 as the morning goes on.
export function daysUntil(iso: string): number {
  const atMidnight = (day: string) => Date.parse(`${day}T00:00:00.000Z`)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Prague' })
  return Math.round((atMidnight(iso.slice(0, 10)) - atMidnight(today)) / 86_400_000)
}

/** How a renewal date reads on a card: 'today' is the one worth spelling out. */
export function dueLabel(iso: string): string {
  const days = daysUntil(iso)
  if (days < 0) return 'due'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `${days}d`
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

// Receipts show the charge that already happened, not the next one — so a screenshot
// import suggests the next renewal by stepping the charge date forward one cycle.
// Keeps the day of the month, clamped to a shorter one (31 January + a month is 28 February here,
// not 3 March) — the same step the server takes in server/dates.ts.
export function nextRenewalAfter(chargeDateIso: string, cycle: BillingCycle): string {
  const d = new Date(`${chargeDateIso.slice(0, 10)}T00:00:00.000Z`)
  if (cycle === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7)
    return d.toISOString()
  }
  const dayOfMonth = d.getUTCDate()
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1, d.getUTCMonth(), 1)
  else d.setUTCMonth(d.getUTCMonth() + 1, 1)
  const lastOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(dayOfMonth, lastOfMonth))
  return d.toISOString()
}

export const CATEGORY_LABELS: Record<Category, string> = {
  streaming: 'Streaming',
  software: 'Software',
  fitness: 'Fitness',
  hosting_domains: 'Hosting & domains',
  other: 'Other',
}

// Tailwind's scanner needs literal class names, so a template-literal `bg-cat-${category}`
// never gets generated — read the CSS custom property directly instead.
export const CATEGORY_COLOR: Record<Category, string> = {
  streaming: 'var(--color-cat-streaming)',
  software: 'var(--color-cat-software)',
  fitness: 'var(--color-cat-fitness)',
  hosting_domains: 'var(--color-cat-hosting_domains)',
  other: 'var(--color-cat-other)',
}
