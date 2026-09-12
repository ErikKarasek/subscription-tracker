import type { Env, ExtractedSubscription } from './types'
import { BILLING_CYCLES, CATEGORIES } from './types'

const MODEL = 'claude-haiku-4-5-20251001'

// Forces structured output via tool-use instead of parsing free text, so a screenshot
// always comes back as the exact shape the "new subscription" form expects.
export async function extractSubscriptionFromImage(env: Env, imageBase64: string, mediaType: string): Promise<ExtractedSubscription> {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            {
              type: 'text',
              text: 'This is a screenshot of a payment, receipt, or subscription charge. Extract the subscription details and call record_subscription. Name and amount must reflect what is actually visible; for billingCycle and category, make your best guess (monthly / other) when not visible rather than leaving them out.',
            },
          ],
        },
      ],
      tools: [
        {
          name: 'record_subscription',
          description: 'Record the subscription details extracted from the screenshot',
          input_schema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Service or merchant name, e.g. Netflix' },
              amount: { type: 'number', description: 'Charge amount as a plain number, no currency symbol' },
              currency: { type: 'string', description: 'ISO 4217 currency code, e.g. CZK, USD, EUR' },
              billingCycle: { type: 'string', enum: BILLING_CYCLES },
              category: { type: 'string', enum: CATEGORIES },
              chargeDate: { type: ['string', 'null'], description: 'ISO date (YYYY-MM-DD) of the charge shown, if visible, else null' },
            },
            required: ['name', 'amount', 'currency', 'billingCycle', 'category', 'chargeDate'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'record_subscription' },
    }),
  })

  if (!res.ok) throw new Error(`Anthropic API request failed: ${res.status} ${await res.text().catch(() => '')}`)

  const data = (await res.json()) as { content: Array<{ type: string; input?: ExtractedSubscription }> }
  const toolUse = data.content.find((block) => block.type === 'tool_use')
  if (!toolUse?.input) throw new Error('Model did not return structured subscription data')
  return toolUse.input
}
