import { useEffect, useState } from 'react'
import type { SpendHistoryPoint, StatsSummary, Subscription } from '../types'
import { api } from '../lib/api-client'
import { StatTile } from './StatTile'
import { CategoryBarChart } from './CategoryBarChart'
import { SpendHistoryChart } from './SpendHistoryChart'
import { daysSince, daysUntil, formatDate, formatMoney } from '../lib/format'

export function OverviewDashboard() {
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [upcoming, setUpcoming] = useState<Subscription[]>([])
  const [unused, setUnused] = useState<Subscription[]>([])
  const [history, setHistory] = useState<SpendHistoryPoint[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.statsSummary(), api.upcoming(7), api.unused(30), api.spendHistory(12)])
      .then(([s, u, un, h]) => {
        setSummary(s)
        setUpcoming(u)
        setUnused(un)
        setHistory(h)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load overview'))
  }, [])

  if (error) return <p role="alert" className="p-4 text-sm text-cat-streaming">{error}</p>
  if (!summary) return <p className="p-4 text-sm text-mute">Loading…</p>

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <h1 className="font-semibold text-xl text-ink">Overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Monthly total" value={formatMoney(summary.monthlyTotal, 'CZK')} />
        <StatTile label="Yearly total" value={formatMoney(summary.yearlyTotal, 'CZK')} />
        <StatTile label="Active subscriptions" value={summary.activeCount} />
      </div>

      <section className="rounded-lg border border-line-soft bg-surface p-4">
        <CategoryBarChart byCategory={summary.byCategory} />
      </section>

      <section className="rounded-lg border border-line-soft bg-surface p-4 overflow-x-auto">
        {history.length > 0 ? (
          <SpendHistoryChart points={history} />
        ) : (
          <p className="text-sm text-mute">No renewal history yet — check back after your first subscriptions renew.</p>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="rounded-lg border border-signal/30 bg-signal/5 p-4">
          <h2 className="font-semibold text-ink">Renewing soon</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {upcoming.map((s) => (
              <li key={s.id} className="flex justify-between text-sm text-ink-2">
                <span>{s.name}</span>
                <span className="font-mono text-xs text-signal">
                  {formatDate(s.nextRenewalDate)} · {daysUntil(s.nextRenewalDate)}d
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unused.length > 0 && (
        <section className="rounded-lg border border-line-soft bg-surface p-4">
          <h2 className="font-semibold text-ink">Going unused</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {unused.map((s) => (
              <li key={s.id} className="flex justify-between text-sm text-ink-2">
                <span>{s.name} · {formatMoney(s.amount, s.currency)}/{s.billingCycle}</span>
                <span className="font-mono text-xs text-mute">
                  {s.lastUsedAt ? `${daysSince(s.lastUsedAt)}d since use` : 'never used'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
