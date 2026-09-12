import type { BillingCycle, Category, StatsSummary, Subscription, SubscriptionInput } from './types'
import { CATEGORIES } from './types'

interface SubscriptionRow {
  id: string
  name: string
  category: Category
  amount: number
  currency: string
  billing_cycle: BillingCycle
  next_renewal_date: string
  url: string | null
  notes: string | null
  is_active: number
  last_used_at: string | null
  last_reminder_sent_for: string | null
  created_at: string
  updated_at: string
}

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: row.amount,
    currency: row.currency,
    billingCycle: row.billing_cycle,
    nextRenewalDate: row.next_renewal_date,
    url: row.url,
    notes: row.notes,
    isActive: row.is_active === 1,
    lastUsedAt: row.last_used_at,
    lastReminderSentFor: row.last_reminder_sent_for,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Normalizes any billing cycle to its monthly cost, so totals/charts can compare
// a Netflix subscription (monthly) against a domain renewal (yearly) on one scale.
export function toMonthly(amount: number, cycle: BillingCycle): number {
  if (cycle === 'yearly') return amount / 12
  if (cycle === 'weekly') return (amount * 52) / 12
  return amount
}

function addCycle(iso: string, cycle: BillingCycle): string {
  const d = new Date(iso)
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1)
  else if (cycle === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  else d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString()
}

export async function listSubscriptions(db: D1Database, filters: { category?: Category; active?: boolean } = {}): Promise<Subscription[]> {
  const conditions: string[] = []
  const values: unknown[] = []
  if (filters.category) {
    conditions.push('category = ?')
    values.push(filters.category)
  }
  if (filters.active !== undefined) {
    conditions.push('is_active = ?')
    values.push(filters.active ? 1 : 0)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { results } = await db
    .prepare(`SELECT * FROM subscriptions ${where} ORDER BY next_renewal_date ASC`)
    .bind(...values)
    .all<SubscriptionRow>()
  return results.map(rowToSubscription)
}

export async function getSubscription(db: D1Database, id: string): Promise<Subscription | null> {
  const row = await db.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(id).first<SubscriptionRow>()
  return row ? rowToSubscription(row) : null
}

export async function createSubscription(db: D1Database, input: SubscriptionInput): Promise<Subscription> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO subscriptions
        (id, name, category, amount, currency, billing_cycle, next_renewal_date, url, notes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.name,
      input.category,
      input.amount,
      input.currency ?? 'CZK',
      input.billingCycle,
      input.nextRenewalDate,
      input.url ?? null,
      input.notes ?? null,
      input.isActive === false ? 0 : 1,
      now,
      now,
    )
    .run()
  return (await getSubscription(db, id))!
}

const PATCHABLE_FIELDS: Array<[keyof SubscriptionInput, string]> = [
  ['name', 'name'],
  ['category', 'category'],
  ['amount', 'amount'],
  ['currency', 'currency'],
  ['billingCycle', 'billing_cycle'],
  ['nextRenewalDate', 'next_renewal_date'],
  ['url', 'url'],
  ['notes', 'notes'],
]

export async function updateSubscription(db: D1Database, id: string, patch: Partial<SubscriptionInput>): Promise<Subscription | null> {
  const existing = await getSubscription(db, id)
  if (!existing) return null

  const sets: string[] = ['updated_at = ?']
  const values: unknown[] = [new Date().toISOString()]

  for (const [key, column] of PATCHABLE_FIELDS) {
    if (key in patch) {
      sets.push(`${column} = ?`)
      values.push(patch[key] ?? null)
    }
  }
  if (patch.isActive !== undefined) {
    sets.push('is_active = ?')
    values.push(patch.isActive ? 1 : 0)
  }

  values.push(id)
  await db.prepare(`UPDATE subscriptions SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run()
  return getSubscription(db, id)
}

export async function deleteSubscription(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM subscriptions WHERE id = ?').bind(id).run()
  return result.meta.changes > 0
}

export async function markUsed(db: D1Database, id: string): Promise<Subscription | null> {
  const now = new Date().toISOString()
  await db.prepare('UPDATE subscriptions SET last_used_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run()
  return getSubscription(db, id)
}

export async function getStatsSummary(db: D1Database): Promise<StatsSummary> {
  const { results } = await db
    .prepare('SELECT category, amount, billing_cycle FROM subscriptions WHERE is_active = 1')
    .all<{ category: Category; amount: number; billing_cycle: BillingCycle }>()

  const byCategoryMap = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>
  let monthlyTotal = 0
  for (const row of results) {
    const monthly = toMonthly(row.amount, row.billing_cycle)
    monthlyTotal += monthly
    byCategoryMap[row.category] += monthly
  }

  return {
    monthlyTotal: round2(monthlyTotal),
    yearlyTotal: round2(monthlyTotal * 12),
    activeCount: results.length,
    byCategory: CATEGORIES.map((category) => ({ category, monthly: round2(byCategoryMap[category]) })),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function getUpcomingRenewals(db: D1Database, days: number): Promise<Subscription[]> {
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()
  const { results } = await db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE is_active = 1 AND next_renewal_date BETWEEN ? AND ?
       ORDER BY next_renewal_date ASC`,
    )
    .bind(now, cutoff)
    .all<SubscriptionRow>()
  return results.map(rowToSubscription)
}

// "Unused" excludes anything created within the same grace window, so a subscription
// added yesterday isn't immediately flagged just because it has no last_used_at yet.
export async function getUnusedSubscriptions(db: D1Database, days: number): Promise<Subscription[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { results } = await db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE is_active = 1
         AND created_at < ?
         AND (last_used_at IS NULL OR last_used_at < ?)
       ORDER BY (last_used_at IS NULL) DESC, last_used_at ASC`,
    )
    .bind(cutoff, cutoff)
    .all<SubscriptionRow>()
  return results.map(rowToSubscription)
}

// Advances any subscription whose next_renewal_date has passed, one cycle at a time
// (handles multiple missed cycles), logging a renewal_events row for each cycle crossed.
// Returns the subscriptions that were advanced, for the scheduled worker to consider for reminders.
export async function advanceDueRenewals(db: D1Database): Promise<Subscription[]> {
  const now = new Date().toISOString()
  const { results } = await db
    .prepare('SELECT * FROM subscriptions WHERE is_active = 1 AND next_renewal_date < ?')
    .bind(now)
    .all<SubscriptionRow>()

  const advanced: Subscription[] = []
  for (const row of results) {
    let nextDate = row.next_renewal_date
    while (nextDate < now) {
      await db
        .prepare('INSERT INTO renewal_events (subscription_id, renewed_at, amount, currency) VALUES (?, ?, ?, ?)')
        .bind(row.id, nextDate, row.amount, row.currency)
        .run()
      nextDate = addCycle(nextDate, row.billing_cycle)
    }
    await db
      .prepare('UPDATE subscriptions SET next_renewal_date = ?, last_reminder_sent_for = NULL, updated_at = ? WHERE id = ?')
      .bind(nextDate, now, row.id)
      .run()
    advanced.push({ ...rowToSubscription(row), nextRenewalDate: nextDate })
  }
  return advanced
}

export async function markReminderSent(db: D1Database, id: string, forDate: string): Promise<void> {
  await db.prepare('UPDATE subscriptions SET last_reminder_sent_for = ? WHERE id = ?').bind(forDate, id).run()
}

// Actual money spent per month, from the renewal_events log — distinct from stats/summary's
// projected monthly total, this only counts charges that have actually happened.
export async function getSpendHistory(db: D1Database, months: number): Promise<Array<{ month: string; total: number }>> {
  const { results } = await db
    .prepare(
      `SELECT month, total FROM (
         SELECT strftime('%Y-%m', renewed_at) as month, SUM(amount) as total
         FROM renewal_events
         GROUP BY month
         ORDER BY month DESC
         LIMIT ?
       ) ORDER BY month ASC`,
    )
    .bind(months)
    .all<{ month: string; total: number }>()
  return results.map((r) => ({ month: r.month, total: round2(r.total) }))
}
