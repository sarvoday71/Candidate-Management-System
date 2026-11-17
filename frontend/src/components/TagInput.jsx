import { useState } from 'react'
import { X } from 'lucide-react'

export default function TagInput({ id, value, onChange, placeholder }) {
  const [draft, setDraft] = useState('')

  const commit = (raw) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length === 0) return
    const next = [...value]
    parts.forEach((p) => {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p)
    })
    onChange(next)
    setDraft('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-indigo-700">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="rounded p-0.5 text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-700"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder={value.length === 0 ? placeholder : ''}
        className="min-w-[8ch] flex-1 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  )
}
