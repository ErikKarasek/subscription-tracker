import { useRef, useState } from 'react'
import type { Category, ExtractedSubscription, Subscription, SubscriptionInput } from '../types'
import { CATEGORIES } from '../types'
import { CATEGORY_LABELS, nextRenewalAfter } from '../lib/format'
import { api } from '../lib/api-client'
import { useSubscriptionsData } from './useSubscriptionsData'
import { SubscriptionCard } from './SubscriptionCard'
import { SubscriptionEditorModal } from './SubscriptionEditorModal'

export function SubscriptionsView() {
  const { subscriptions, loading, error, createSubscription, updateSubscription, deleteSubscription, markUsed } =
    useSubscriptionsData()
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [editorTarget, setEditorTarget] = useState<Subscription | 'new' | null>(null)
  const [prefill, setPrefill] = useState<Partial<SubscriptionInput> | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const visible = filter === 'all' ? subscriptions : subscriptions.filter((s) => s.category === filter)

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportError(null)
    setImporting(true)
    try {
      const dataUrl = await readAsDataUrl(file)
      const [, base64] = /^data:[^;]+;base64,(.*)$/s.exec(dataUrl) ?? []
      if (!base64) throw new Error('Could not read that image')

      const extracted: ExtractedSubscription = await api.extractFromImage(base64)
      setPrefill({
        name: extracted.name,
        category: extracted.category,
        amount: extracted.amount,
        currency: extracted.currency,
        billingCycle: extracted.billingCycle,
        nextRenewalDate: extracted.chargeDate ? nextRenewalAfter(extracted.chargeDate, extracted.billingCycle) : undefined,
      })
      setEditorTarget('new')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not read that screenshot — add it manually instead')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-semibold text-xl text-ink">Subscriptions</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-2 hover:text-ink disabled:opacity-50"
          >
            {importing ? 'Reading screenshot…' : 'Import from screenshot'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
          <button
            type="button"
            onClick={() => {
              setPrefill(null)
              setEditorTarget('new')
            }}
            className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-signal-ink hover:brightness-110"
          >
            Add subscription
          </button>
        </div>
      </div>

      {importError && <p role="alert" className="text-sm text-cat-streaming">{importError}</p>}

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
            <SubscriptionCard
              key={s.id}
              subscription={s}
              onEdit={() => setEditorTarget(s)}
              onMarkUsed={() => markUsed(s.id)}
              onToggleActive={() => updateSubscription(s.id, { isActive: !s.isActive })}
            />
          ))}
        </div>
      )}

      <SubscriptionEditorModal
        target={editorTarget}
        prefill={prefill}
        onClose={() => setEditorTarget(null)}
        onSave={(input, editingId) => (editingId ? updateSubscription(editingId, input) : createSubscription(input))}
        onDelete={deleteSubscription}
      />
    </div>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
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
