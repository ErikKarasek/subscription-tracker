import { useState } from 'react'
import type { Category, Subscription } from '../types'
import { CATEGORIES } from '../types'
import { CATEGORY_LABELS } from '../lib/format'
import { useSubscriptionsData } from './useSubscriptionsData'
import { SubscriptionCard } from './SubscriptionCard'
import { SubscriptionEditorModal } from './SubscriptionEditorModal'

export function SubscriptionsView() {
  const { subscriptions, loading, error, createSubscription, updateSubscription, deleteSubscription, markUsed } =
    useSubscriptionsData()
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [editorTarget, setEditorTarget] = useState<Subscription | 'new' | null>(null)

  const visible = filter === 'all' ? subscriptions : subscriptions.filter((s) => s.category === filter)

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-semibold text-xl text-ink">Subscriptions</h1>
        <button
          type="button"
          onClick={() => setEditorTarget('new')}
          className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-signal-ink hover:brightness-110"
        >
          Add subscription
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {CATEGORY_LABELS[c]}
          </FilterChip>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-cat-streaming">{error}</p>}
      {loading ? (
        <p className="text-sm text-mute">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-mute">No subscriptions yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <SubscriptionCard key={s.id} subscription={s} onEdit={() => setEditorTarget(s)} onMarkUsed={() => markUsed(s.id)} />
          ))}
        </div>
      )}

      <SubscriptionEditorModal
        target={editorTarget}
        onClose={() => setEditorTarget(null)}
        onSave={(input, editingId) => (editingId ? updateSubscription(editingId, input) : createSubscription(input))}
        onDelete={deleteSubscription}
      />
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-xs ${
        active ? 'border-signal bg-signal/10 text-signal' : 'border-line text-ink-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
