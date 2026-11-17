import { useEffect } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { btnDanger, btnSecondary } from '../lib/ui'

export default function ConfirmDialog({ candidate, busy, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={() => !busy && onCancel()} />
      <div className="relative w-full max-w-md animate-pop-in rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex size-12 items-center justify-center rounded-full bg-rose-50">
          <Trash2 className="size-6 text-rose-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Delete candidate?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          <span className="font-medium text-slate-700">
            {candidate.firstName} {candidate.lastName}
          </span>{' '}
          will be permanently removed. This can't be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button className={btnSecondary} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={btnDanger} onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
