import type { BillingCycle, Category } from '../types'

export function formatMoney(amount: number, currency: string): string {
  return `${Math.round(amount * 100) / 100} ${currency}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

// Receipts show the charge that already happened, not the next one — so a screenshot
// import suggests the next renewal by stepping the charge date forward one cycle.
export function nextRenewalAfter(chargeDateIso: string, cycle: BillingCycle): string {
  const d = new Date(chargeDateIso)
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1)
  else if (cycle === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  else d.setUTCMonth(d.getUTCMonth() + 1)
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
