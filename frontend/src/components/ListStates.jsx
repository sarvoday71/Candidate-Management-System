import { CloudOff, Plus, SearchX, UserPlus } from 'lucide-react'
import { btnPrimary, btnSecondary } from '../lib/ui'

export function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm" aria-busy="true" aria-label="Loading candidates">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
          <div className="size-10 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="hidden h-3.5 w-24 animate-pulse rounded bg-slate-100 md:block" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

function Panel({ icon: Icon, tone, title, children, actions }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className={`flex size-14 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="size-7" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{children}</p>
      <div className="mt-6 flex gap-3">{actions}</div>
    </div>
  )
}

export function EmptyState({ filtered, onClear, onAdd }) {
  if (filtered) {
    return (
      <Panel
        icon={SearchX}
        tone="bg-slate-100 text-slate-500"
        title="No candidates match your filters"
        actions={
          <button className={btnSecondary} onClick={onClear}>
            Clear all filters
          </button>
        }
      >
        Try a different name, loosen the experience range, or remove a skill.
      </Panel>
    )
  }
  return (
    <Panel
      icon={UserPlus}
      tone="bg-indigo-50 text-indigo-600"
      title="No candidates yet"
      actions={
        <button className={btnPrimary} onClick={onAdd}>
          <Plus className="size-4" />
          Add your first candidate
        </button>
      }
    >
      Your pipeline is empty. Add a candidate to start tracking them from first contact to offer.
    </Panel>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <Panel
      icon={CloudOff}
      tone="bg-rose-50 text-rose-600"
      title="Couldn't load candidates"
      actions={
        <button className={btnPrimary} onClick={onRetry}>
          Try again
        </button>
      }
    >
      {message}
    </Panel>
  )
}
