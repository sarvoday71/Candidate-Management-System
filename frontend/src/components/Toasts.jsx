import { CheckCircle2, XCircle, X } from 'lucide-react'

export default function Toasts({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/10"
        >
          {t.type === 'error' ? (
            <XCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
          )}
          <p className="flex-1 text-sm font-medium text-slate-800">{t.message}</p>
          <button
            onClick={() => onDismiss(t.id)}
            className="rounded p-0.5 text-slate-400 transition hover:text-slate-600"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
