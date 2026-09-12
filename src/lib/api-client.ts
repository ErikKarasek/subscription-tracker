import type { Category, ExtractedSubscription, StatsSummary, Subscription, SubscriptionInput } from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  listSubscriptions: (category?: Category) =>
    request<Subscription[]>(category ? `/subscriptions?category=${category}` : '/subscriptions'),
  createSubscription: (input: SubscriptionInput) =>
    request<Subscription>('/subscriptions', { method: 'POST', body: JSON.stringify(input) }),
  updateSubscription: (id: string, patch: Partial<SubscriptionInput>) =>
    request<Subscription>(`/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteSubscription: (id: string) => request<void>(`/subscriptions/${id}`, { method: 'DELETE' }),
  markUsed: (id: string) => request<Subscription>(`/subscriptions/${id}/mark-used`, { method: 'POST' }),
  statsSummary: () => request<StatsSummary>('/stats/summary'),
  upcoming: (days = 7) => request<Subscription[]>(`/subscriptions/upcoming?days=${days}`),
  unused: (days = 30) => request<Subscription[]>(`/subscriptions/unused?days=${days}`),
  extractFromImage: (imageBase64: string, mediaType: string) =>
    request<ExtractedSubscription>('/extract-subscription', { method: 'POST', body: JSON.stringify({ imageBase64, mediaType }) }),
}
