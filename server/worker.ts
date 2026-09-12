import { app } from './hono-app'
import { runScheduledTasks } from './scheduled'
import type { Env } from './types'

export default {
  fetch: app.fetch,
  scheduled: async (_controller, env, ctx) => {
    ctx.waitUntil(runScheduledTasks(env))
  },
} satisfies ExportedHandler<Env>
