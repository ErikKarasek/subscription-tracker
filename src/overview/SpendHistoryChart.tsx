import type { SpendHistoryPoint } from '../types'

const BAR_AREA_HEIGHT = 96

// Vertical bars, one hue (single series = actual spend, not a category breakdown),
// baseline hairline. Only the tallest bar gets a visible value label; every value is
// still in the table markup for screen readers via the visually-hidden span.
export function SpendHistoryChart({ points }: { points: SpendHistoryPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.total))

  return (
    <table className="w-full border-collapse">
      <caption className="mb-2 text-left text-sm text-mute">Actual monthly spend (from renewals so far)</caption>
      <tbody>
        <tr>
          {points.map((p) => (
            <td key={p.month} className="align-bottom px-1">
              <div className="flex flex-col items-center justify-end" style={{ height: BAR_AREA_HEIGHT }}>
                {p.total === max && (
                  <span aria-hidden="true" className="mb-1 font-mono text-xs text-ink">
                    {p.total}
                  </span>
                )}
                <span className="sr-only">{`${p.total} in ${p.month}`}</span>
                <div
                  title={`${p.total} in ${p.month}`}
                  className="w-full max-w-6 rounded-t bg-signal"
                  style={{ height: `${Math.max(4, (p.total / max) * (BAR_AREA_HEIGHT - 20))}px` }}
                />
              </div>
            </td>
          ))}
        </tr>
        <tr aria-hidden="true" className="border-t border-line-soft text-mute">
          {points.map((p) => (
            <td key={p.month} className="px-1 pt-1 text-center font-mono text-[10px]">
              {p.month.slice(5)}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}
