import { useState } from 'react'
import { SubscriptionsView } from './subscriptions/SubscriptionsView'
import { OverviewDashboard } from './overview/OverviewDashboard'

type View = 'subscriptions' | 'overview'

export default function App() {
  const [view, setView] = useState<View>('subscriptions')

  return (
    <main className="min-h-screen bg-bg">
      <nav className="flex gap-1 border-b border-line-soft px-4 pt-3 sm:px-6">
        <TabButton active={view === 'subscriptions'} onClick={() => setView('subscriptions')}>
          Subscriptions
        </TabButton>
        <TabButton active={view === 'overview'} onClick={() => setView('overview')}>
          Overview
        </TabButton>
      </nav>
      {view === 'subscriptions' ? <SubscriptionsView /> : <OverviewDashboard />}
    </main>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`rounded-t-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal ${
        active ? 'border-b-2 border-signal text-ink' : 'text-mute hover:text-ink-2'
      }`}
    >
      {children}
    </button>
  )
}
