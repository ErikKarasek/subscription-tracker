import type { Env } from './types'
import { advanceDueRenewals, getUnusedSubscriptions, getUpcomingRenewals, markChargeNoticeSent, markReminderSent } from './db'
import { dayOf, pragueDay } from './dates'
import { renewalReminderEmail, sendEmail, unusedDigestEmail } from './email'

const REMINDER_WINDOW_DAYS = 3
const UNUSED_THRESHOLD_DAYS = 30

export async function runScheduledTasks(env: Env, now = new Date()): Promise<void> {
  const today = pragueDay(now)

  // Read before advancing. The other way round, a subscription renewing today was rolled on to
  // next month first and then was no longer in the window, so the day the money left was the one
  // day nothing was said about it — while something renewing in three days got a mail every day.
  const window = await getUpcomingRenewals(env.DB, REMINDER_WINDOW_DAYS, today)
  const dueToday = window.filter((s) => dayOf(s.nextRenewalDate) === today && s.chargeNoticeSentFor !== s.nextRenewalDate)
  const soon = window.filter((s) => dayOf(s.nextRenewalDate) !== today && s.lastReminderSentFor !== s.nextRenewalDate)

  if (dueToday.length > 0 || soon.length > 0) {
    const { subject, html } = renewalReminderEmail(dueToday, soon)
    await sendEmail(env, subject, html)
    // Each list has its own mark, so running twice in a day says nothing twice. The advance below
    // clears both marks when the date moves on, so the next cycle starts clean.
    for (const s of dueToday) await markChargeNoticeSent(env.DB, s.id, s.nextRenewalDate)
    for (const s of soon) await markReminderSent(env.DB, s.id, s.nextRenewalDate)
  }

  await advanceDueRenewals(env.DB, today)

  const isMonday = now.getUTCDay() === 1
  if (isMonday) {
    const unused = await getUnusedSubscriptions(env.DB, UNUSED_THRESHOLD_DAYS)
    if (unused.length > 0) {
      const { subject, html } = unusedDigestEmail(unused)
      await sendEmail(env, subject, html)
    }
  }
}
