import type { BillingCycle } from './types'

// Everything about a renewal happens on a *day*, not at an instant: a charge on 5 October is
// still 5 October at 07:00 UTC, when the cron runs, and at 23:00 in Prague. Stored dates are a
// mix of 'YYYY-MM-DD' (typed into the form) and full ISO stamps (written by addCycle), so every
// comparison here goes through the day part of the string.

/** Today in Prague, as YYYY-MM-DD — the day Erik is in when the cron fires at 09:00 his time. */
export function pragueDay(at: Date = new Date()): string {
  return at.toLocaleDateString('en-CA', { timeZone: 'Europe/Prague' })
}

/** The day a stored date falls on, whatever shape it was stored in. */
export function dayOf(iso: string): string {
  return iso.slice(0, 10)
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${dayOf(day)}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return dayOf(d.toISOString())
}

/**
 * The next renewal after this one. A monthly charge keeps its day of the month, clamped to the
 * end of a shorter one: `setUTCMonth` alone turns 31 January into 3 March, which then reminds on
 * the wrong day every month after. (Clamping does mean a 31st that passes through February comes
 * out on the 28th and stays there — only the real billing day, which the app never sees, could
 * fix that, and the editor can set it back.)
 */
export function addCycle(iso: string, cycle: BillingCycle): string {
  const d = new Date(`${dayOf(iso)}T00:00:00.000Z`)
  if (cycle === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7)
    return d.toISOString()
  }
  const dayOfMonth = d.getUTCDate()
  // Move to the 1st first, so stepping a month from the 31st cannot overflow on the way.
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1, d.getUTCMonth(), 1)
  else d.setUTCMonth(d.getUTCMonth() + 1, 1)
  const lastOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(dayOfMonth, lastOfMonth))
  return d.toISOString()
}
