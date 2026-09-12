import { useCallback, useEffect, useState } from 'react'
import type { Subscription, SubscriptionInput } from '../types'
import { api } from '../lib/api-client'

// Same optimistic-update shape as job-tracker's useBoardData: apply the change locally
// immediately, roll back to the pre-change snapshot if the request fails.
export function useSubscriptionsData() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listSubscriptions()
      .then(setSubscriptions)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load subscriptions'))
      .finally(() => setLoading(false))
  }, [])

  const createSubscription = useCallback((input: SubscriptionInput) => {
    setError(null)
    api
      .createSubscription(input)
      .then((created) => setSubscriptions((prev) => [created, ...prev]))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to create subscription'))
  }, [])

  const updateSubscription = useCallback((id: string, patch: Partial<SubscriptionInput>) => {
    setError(null)
    let snapshot: Subscription[] = []
    setSubscriptions((prev) => {
      snapshot = prev
      return prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    })
    api.updateSubscription(id, patch).catch((e) => {
      setSubscriptions(snapshot)
      setError(e instanceof Error ? e.message : 'Failed to update subscription')
    })
  }, [])

  const deleteSubscription = useCallback((id: string) => {
    setError(null)
    let snapshot: Subscription[] = []
    setSubscriptions((prev) => {
      snapshot = prev
      return prev.filter((s) => s.id !== id)
    })
    api.deleteSubscription(id).catch((e) => {
      setSubscriptions(snapshot)
      setError(e instanceof Error ? e.message : 'Failed to delete subscription')
    })
  }, [])

  const markUsed = useCallback((id: string) => {
    setError(null)
    const now = new Date().toISOString()
    let snapshot: Subscription[] = []
    setSubscriptions((prev) => {
      snapshot = prev
      return prev.map((s) => (s.id === id ? { ...s, lastUsedAt: now } : s))
    })
    api.markUsed(id).catch((e) => {
      setSubscriptions(snapshot)
      setError(e instanceof Error ? e.message : 'Failed to mark as used')
    })
  }, [])

  return { subscriptions, loading, error, createSubscription, updateSubscription, deleteSubscription, markUsed }
}
