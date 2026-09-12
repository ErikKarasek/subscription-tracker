import type { Subscription } from '../types'
import { CATEGORY_COLOR, CATEGORY_LABELS, daysSince, daysUntil, formatDate, formatMoney } from '../lib/format'

export function SubscriptionCard({
  subscription,
  onEdit,
  onMarkUsed,
  onToggleActive,
}: {
  subscription: Subscription
  onEdit: () => void
  onMarkUsed: () => void
  onToggleActive: () => void
}) {
  const due = daysUntil(subscription.nextRenewalDate)
  const dueSoon = subscription.isActive && due <= 3

  return (
    <div className={`flex flex-col gap-2 rounded-lg border border-line-soft bg-surface p-4 ${subscription.isActive ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <button type="button" onClick={onEdit} className="text-left font-medium text-ink hover:text-signal">
            {subscription.name}
          </button>
          <p className="flex items-center gap-1.5 text-xs text-mute">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLOR[subscription.category] }}
            />
            {CATEGORY_LABELS[subscription.category]}
            {!subscription.isActive && <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-mute">Paused</span>}
          </p>
        </div>
        <p className="font-mono text-sm text-ink">{formatMoney(subscription.amount, subscription.currency)}</p>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={dueSoon ? 'font-medium text-signal' : 'text-ink-2'}>
          {subscription.isActive ? `Renews ${formatDate(subscription.nextRenewalDate)} (${due >= 0 ? `${due}d` : 'due'})` : 'Not counted while paused'}
        </span>
        <span className="text-mute">{subscription.billingCycle}</span>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs text-mute">
          {subscription.lastUsedAt ? `Used ${daysSince(subscription.lastUsedAt)}d ago` : 'Never marked used'}
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:border-signal hover:text-signal"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onToggleActive}
            className="rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:border-signal hover:text-signal"
          >
            {subscription.isActive ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={onMarkUsed}
            className="rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:border-signal hover:text-signal"
          >
            Mark used
          </button>
        </div>
      </div>
    </div>
  )
}
