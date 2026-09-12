import type { Env } from './types'
import { advanceDueRenewals, getUnusedSubscriptions, getUpcomingRenewals, markReminderSent } from './db'
import { renewalReminderEmail, sendEmail, unusedDigestEmail } from './email'

const REMINDER_WINDOW_DAYS = 3
const UNUSED_THRESHOLD_DAYS = 30

export async function runScheduledTasks(env: Env, now = new Date()): Promise<void> {
  await advanceDueRenewals(env.DB)

  const upcoming = await getUpcomingRenewals(env.DB, REMINDER_WINDOW_DAYS)
  const notReminded = upcoming.filter((s) => s.lastReminderSentFor !== s.nextRenewalDate)
  if (notReminded.length > 0) {
    const { subject, html } = renewalReminderEmail(notReminded)
    await sendEmail(env, subject, html)
    for (const s of notReminded) await markReminderSent(env.DB, s.id, s.nextRenewalDate)
  }

  const isMonday = now.getUTCDay() === 1
  if (isMonday) {
    const unused = await getUnusedSubscriptions(env.DB, UNUSED_THRESHOLD_DAYS)
    if (unused.length > 0) {
      const { subject, html } = unusedDigestEmail(unused)
      await sendEmail(env, subject, html)
    }
  }
}
