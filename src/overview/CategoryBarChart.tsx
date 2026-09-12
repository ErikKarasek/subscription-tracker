import type { Category, StatsSummary } from '../types'
import { CATEGORY_COLOR, CATEGORY_LABELS, formatMoney } from '../lib/format'

// A <table> underneath, not a div soup — screen readers get real tabular data.
// Each bar is already text-labeled by its row header, so color reinforces category
// identity rather than carrying it alone. Bar cap ≤24px thick, 4px rounded data-end.
export function CategoryBarChart({ byCategory }: { byCategory: StatsSummary['byCategory'] }) {
  const max = Math.max(1, ...byCategory.map((b) => b.monthly))
  const sorted = [...byCategory].sort((a, b) => b.monthly - a.monthly)

  return (
    <table className="w-full border-collapse">
      <caption className="mb-2 text-left text-sm text-mute">Monthly spend by category</caption>
      <tbody>
        {sorted.map(({ category, monthly }) => (
          <tr key={category}>
            <th scope="row" className="w-36 py-1.5 pr-3 text-left text-sm font-normal text-ink-2">
              {CATEGORY_LABELS[category as Category]}
            </th>
            <td className="py-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="h-5 rounded-r"
                  style={{ width: `${Math.max(4, (monthly / max) * 100)}%`, backgroundColor: CATEGORY_COLOR[category as Category] }}
                />
                <span className="font-mono text-xs text-ink">{formatMoney(monthly, 'CZK')}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
