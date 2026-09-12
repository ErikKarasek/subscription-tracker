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

export function renewalReminderEmail(subs: Subscription[]): { subject: string; html: string } {
  const rows = subs
    .map((s) => `<li>${s.name} — ${s.amount} ${s.currency} · renews ${new Date(s.nextRenewalDate).toLocaleDateString('en-US')}</li>`)
    .join('')
  return {
    subject: `Renewing soon: ${subs.map((s) => s.name).join(', ')}`,
    html: `<p>These subscriptions renew in the next few days:</p><ul>${rows}</ul>`,
  }
}

export function unusedDigestEmail(subs: Subscription[]): { subject: string; html: string } {
  const rows = subs
    .map((s) => `<li>${s.name} — ${s.amount} ${s.currency}/${s.billingCycle}, last used ${s.lastUsedAt ? new Date(s.lastUsedAt).toLocaleDateString('en-US') : 'never'}</li>`)
    .join('')
  return {
    subject: `Weekly check: ${subs.length} subscription(s) going unused`,
    html: `<p>You haven't marked these as used in a while — worth cancelling?</p><ul>${rows}</ul>`,
  }
}
