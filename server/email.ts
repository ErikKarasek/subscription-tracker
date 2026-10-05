import type { Env, Subscription } from './types'

// Fire-and-log: if RESEND_API_KEY isn't set yet (fresh clone, key not created),
// skip quietly so the cron still runs cleanly rather than throwing every day.
export async function sendEmail(env: Env, subject: string, html: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.REMINDER_TO_EMAIL) {
    console.log('[email] RESEND_API_KEY or REMINDER_TO_EMAIL not set, skipping:', subject)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Subscription Tracker <onboarding@resend.dev>',
      to: [env.REMINDER_TO_EMAIL],
      subject,
      html,
    }),
  })
  if (!res.ok) console.error('[email] Resend request failed', res.status, await res.text().catch(() => ''))
}

// "October 5, 2026", not "10/5/2026": a numeric date also reads as 10 May (the mail digest
// read it that way). Prague time: a YYYY-MM-DD parses as UTC midnight, still the same day there,
// and a lastUsedAt timestamp shows the day it was in Prague, not in UTC.
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Prague' })

/**
 * One mail with two parts: what is being charged today, and what is coming in the next few days.
 * Today leads the subject, because that is the line worth seeing on a phone's lock screen — the
 * mail used to only ever say "renewing soon", and never that money had just gone out.
 */
export function renewalReminderEmail(dueToday: Subscription[], soon: Subscription[]): { subject: string; html: string } {
  const list = (subs: Subscription[], withDate: boolean) =>
    `<ul>${subs
      .map((s) => `<li>${s.name} — ${s.amount} ${s.currency}${withDate ? ` · renews ${day(s.nextRenewalDate)}` : ''}</li>`)
      .join('')}</ul>`

  const parts: string[] = []
  if (dueToday.length > 0) parts.push(`<p>Charged today:</p>${list(dueToday, false)}`)
  if (soon.length > 0) parts.push(`<p>Renewing in the next few days:</p>${list(soon, true)}`)

  const names = (subs: Subscription[]) => subs.map((s) => s.name).join(', ')
  const subject =
    dueToday.length > 0
      ? `Charged today: ${names(dueToday)}${soon.length > 0 ? ` (and ${soon.length} renewing soon)` : ''}`
      : `Renewing soon: ${names(soon)}`

  return { subject, html: parts.join('') }
}

export function unusedDigestEmail(subs: Subscription[]): { subject: string; html: string } {
  const rows = subs
    .map((s) => `<li>${s.name} — ${s.amount} ${s.currency}/${s.billingCycle}, last used ${s.lastUsedAt ? day(s.lastUsedAt) : 'never'}</li>`)
    .join('')
  return {
    subject: `Weekly check: ${subs.length} subscription(s) going unused`,
    html: `<p>You haven't marked these as used in a while — worth cancelling?</p><ul>${rows}</ul>`,
  }
}
