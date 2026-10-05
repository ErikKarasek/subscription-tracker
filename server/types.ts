export type Category = 'streaming' | 'software' | 'fitness' | 'hosting_domains' | 'other'
export const CATEGORIES: Category[] = ['streaming', 'software', 'fitness', 'hosting_domains', 'other']

export type BillingCycle = 'monthly' | 'yearly' | 'weekly'
export const BILLING_CYCLES: BillingCycle[] = ['monthly', 'yearly', 'weekly']

export interface Subscription {
  id: string
  name: string
  category: Category
  amount: number
  currency: string
  billingCycle: BillingCycle
  nextRenewalDate: string
  url: string | null
  notes: string | null
  isActive: boolean
  lastUsedAt: string | null
  lastReminderSentFor: string | null
  chargeNoticeSentFor: string | null
  createdAt: string
  updatedAt: string
}

export interface SubscriptionInput {
  name: string
  category: Category
  amount: number
  currency?: string
  billingCycle: BillingCycle
  nextRenewalDate: string
  url?: string | null
  notes?: string | null
  isActive?: boolean
}

export interface StatsSummary {
  monthlyTotal: number
  yearlyTotal: number
  activeCount: number
  byCategory: Array<{ category: Category; monthly: number }>
}

export interface SpendHistoryPoint {
  month: string
  total: number
}

export interface ExtractedSubscription {
  name: string
  amount: number
  currency: string
  billingCycle: BillingCycle
  category: Category
  /** The charge on the receipt. */
  chargeDate: string | null
  /** Only when the receipt names the next billing date itself; otherwise the form steps forward from chargeDate. */
  nextChargeDate: string | null
  /** Which model read the screenshot, shown with the pre-filled form so a bad read has a name. */
  via: string
}

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  AI: Ai
  /** Google AI Studio key; without it screenshot reading falls back to Workers AI. */
  GEMINI_API_KEY?: string
  RESEND_API_KEY?: string
  REMINDER_TO_EMAIL?: string
}
