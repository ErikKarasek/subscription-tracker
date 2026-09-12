import { Hono } from 'hono'
import type { Category, Env, SubscriptionInput } from './types'
import { BILLING_CYCLES, CATEGORIES } from './types'
import {
  createSubscription,
  deleteSubscription,
  getStatsSummary,
  getUnusedSubscriptions,
  getUpcomingRenewals,
  listSubscriptions,
  markUsed,
  updateSubscription,
} from './db'
import { extractSubscriptionFromImage } from './extract'

export const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/api/subscriptions', async (c) => {
  const category = c.req.query('category') as Category | undefined
  if (category && !CATEGORIES.includes(category)) return c.json({ error: 'invalid category' }, 400)
  const active = c.req.query('active')
  return c.json(await listSubscriptions(c.env.DB, { category, active: active === undefined ? undefined : active === 'true' }))
})

app.post('/api/subscriptions', async (c) => {
  const body = await c.req.json<SubscriptionInput>()
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  if (!CATEGORIES.includes(body.category)) return c.json({ error: 'invalid category' }, 400)
  if (!BILLING_CYCLES.includes(body.billingCycle)) return c.json({ error: 'invalid billingCycle' }, 400)
  if (!(body.amount > 0)) return c.json({ error: 'amount must be positive' }, 400)
  if (!body.nextRenewalDate) return c.json({ error: 'nextRenewalDate is required' }, 400)
  return c.json(await createSubscription(c.env.DB, body), 201)
})

app.patch('/api/subscriptions/:id', async (c) => {
  const patch = await c.req.json<Partial<SubscriptionInput>>()
  if (patch.category && !CATEGORIES.includes(patch.category)) return c.json({ error: 'invalid category' }, 400)
  if (patch.billingCycle && !BILLING_CYCLES.includes(patch.billingCycle)) return c.json({ error: 'invalid billingCycle' }, 400)
  const updated = await updateSubscription(c.env.DB, c.req.param('id'), patch)
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

app.delete('/api/subscriptions/:id', async (c) => {
  const deleted = await deleteSubscription(c.env.DB, c.req.param('id'))
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.body(null, 204)
})

app.post('/api/subscriptions/:id/mark-used', async (c) => {
  const updated = await markUsed(c.env.DB, c.req.param('id'))
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

app.post('/api/extract-subscription', async (c) => {
  const body = await c.req.json<{ imageBase64: string }>()
  if (!body.imageBase64) return c.json({ error: 'imageBase64 is required' }, 400)
  try {
    return c.json(await extractSubscriptionFromImage(c.env, body.imageBase64))
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'extraction failed' }, 502)
  }
})

app.get('/api/stats/summary', async (c) => c.json(await getStatsSummary(c.env.DB)))

app.get('/api/subscriptions/upcoming', async (c) => {
  const days = Number(c.req.query('days') ?? 7)
  return c.json(await getUpcomingRenewals(c.env.DB, Number.isFinite(days) ? days : 7))
})

app.get('/api/subscriptions/unused', async (c) => {
  const days = Number(c.req.query('days') ?? 30)
  return c.json(await getUnusedSubscriptions(c.env.DB, Number.isFinite(days) ? days : 30))
})

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'internal error' }, 500)
})
