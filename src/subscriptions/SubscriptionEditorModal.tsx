import { useEffect, useRef } from 'react'
import type { Subscription, SubscriptionInput } from '../types'
import { BILLING_CYCLES, CATEGORIES } from '../types'
import { CATEGORY_LABELS } from '../lib/format'

interface SubscriptionEditorModalProps {
  // null = closed. 'new' = create mode. A Subscription = edit mode.
  target: Subscription | 'new' | null
  onClose: () => void
  onSave: (input: SubscriptionInput, editingId: string | null) => void
  onDelete: (id: string) => void
}

export function SubscriptionEditorModal({ target, onClose, onSave, onDelete }: SubscriptionEditorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isEditing = target !== null && target !== 'new'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (target !== null && !dialog.open) dialog.showModal()
    if (target === null && dialog.open) dialog.close()
  }, [target])

  if (target === null) return null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const str = (key: string) => {
      const v = form.get(key)
      return v && String(v).trim() !== '' ? String(v) : null
    }
    onSave(
      {
        name: String(form.get('name') ?? '').trim(),
        category: form.get('category') as SubscriptionInput['category'],
        amount: Number(form.get('amount')),
        currency: String(form.get('currency') ?? 'CZK').trim() || 'CZK',
        billingCycle: form.get('billingCycle') as SubscriptionInput['billingCycle'],
        nextRenewalDate: new Date(String(form.get('nextRenewalDate'))).toISOString(),
        url: str('url'),
        notes: str('notes'),
      },
      isEditing ? target.id : null,
    )
    onClose()
  }

  const defaultDate = isEditing ? target.nextRenewalDate.slice(0, 10) : new Date().toISOString().slice(0, 10)

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="subscription-editor-title"
      className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
    >
      <form method="dialog" onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
        <h2 id="subscription-editor-title" className="font-semibold text-lg">
          {isEditing ? 'Edit subscription' : 'New subscription'}
        </h2>

        <Field label="Name" name="name" defaultValue={isEditing ? target.name : ''} required />

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-ink-2">
            Category
            <select
              name="category"
              defaultValue={isEditing ? target.category : CATEGORIES[0]}
              className="rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-ink-2">
            Billing cycle
            <select
              name="billingCycle"
              defaultValue={isEditing ? target.billingCycle : 'monthly'}
              className="rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
            >
              {BILLING_CYCLES.map((cy) => (
                <option key={cy} value={cy}>
                  {cy}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-3">
          <Field label="Amount" name="amount" type="number" defaultValue={isEditing ? target.amount : ''} className="flex-1" required />
          <Field label="Currency" name="currency" defaultValue={isEditing ? target.currency : 'CZK'} className="flex-1" />
        </div>

        <Field label="Next renewal date" name="nextRenewalDate" type="date" defaultValue={defaultDate} required />
        <Field label="URL" name="url" type="url" defaultValue={isEditing ? (target.url ?? '') : ''} />

        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Notes
          <textarea
            name="notes"
            rows={3}
            defaultValue={isEditing ? (target.notes ?? '') : ''}
            className="rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
          />
        </label>

        <div className="mt-2 flex items-center justify-between gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={() => {
                onDelete(target.id)
                onClose()
              }}
              className="rounded-md border border-cat-streaming/50 px-3 py-1.5 text-sm text-cat-streaming hover:bg-cat-streaming/10"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-2 hover:text-ink">
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-signal-ink hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  className = '',
}: {
  label: string
  name: string
  defaultValue: string | number
  type?: string
  required?: boolean
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-ink-2 ${className}`}>
      {label}
      <input
        name={name}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        defaultValue={defaultValue}
        required={required}
        className="rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
      />
    </label>
  )
}
