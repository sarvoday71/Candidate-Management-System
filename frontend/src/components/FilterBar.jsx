import { useState } from 'react'
import { Mail, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import { STATUSES } from '../lib/constants'
import { inputCls } from '../lib/ui'
import TagInput from './TagInput'

const iconInput = `${inputCls} pl-10`

function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </label>
  )
}

export default function FilterBar({ filters, onChange, onClear, statusCounts, totalCount, resultCount, loading }) {
  const [open, setOpen] = useState(false)

  const advancedActive = [
    filters.location.trim(),
    filters.skills.length > 0,
    filters.minExperience !== '',
    filters.maxExperience !== '',
  ].filter(Boolean).length
  const anyActive = advancedActive > 0 || filters.name.trim() || filters.email.trim() || filters.status

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5" aria-label="Search and filters">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className={iconInput}
            placeholder="Search by first or last name…"
            value={filters.name}
            onChange={(e) => onChange({ name: e.target.value })}
            aria-label="Search by name"
          />
        </div>
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className={iconInput}
            placeholder="Search by email…"
            value={filters.email}
            onChange={(e) => onChange({ email: e.target.value })}
            aria-label="Search by email"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 ${
            open || advancedActive
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="size-4" />
          More filters
          {advancedActive > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
              {advancedActive}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="mt-4 grid animate-slide-up gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="f-location">Location</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="f-location"
                className={iconInput}
                placeholder="e.g. Bengaluru"
                value={filters.location}
                onChange={(e) => onChange({ location: e.target.value })}
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="f-skills">Skills (must have all)</Label>
            <TagInput id="f-skills" value={filters.skills} onChange={(skills) => onChange({ skills })} placeholder="Type a skill and press Enter" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="f-min">Min yrs</Label>
              <input
                id="f-min"
                type="number"
                min="0"
                className={inputCls}
                placeholder="0"
                value={filters.minExperience}
                onChange={(e) => onChange({ minExperience: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="f-max">Max yrs</Label>
              <input
                id="f-max"
                type="number"
                min="0"
                className={inputCls}
                placeholder="Any"
                value={filters.maxExperience}
                onChange={(e) => onChange({ maxExperience: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:pb-0" role="group" aria-label="Filter by status">
          <StatusChip active={filters.status === ''} onClick={() => onChange({ status: '' })} label="All" count={totalCount} />
          {STATUSES.map((s) => (
            <StatusChip
              key={s.value}
              active={filters.status === s.value}
              onClick={() => onChange({ status: filters.status === s.value ? '' : s.value })}
              label={s.label}
              count={statusCounts[s.value] ?? 0}
              dot={s.dot}
            />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="text-slate-500">
            {loading ? 'Searching…' : `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`}
          </span>
          {anyActive && (
            <button onClick={onClear} className="inline-flex items-center gap-1 font-semibold text-indigo-600 transition hover:text-indigo-500">
              <X className="size-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function StatusChip({ active, onClick, label, count, dot }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 ${
        active ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
      }`}
    >
      {dot && <span className={`size-2 rounded-full ${dot}`} />}
      {label}
      <span className={`text-xs tabular-nums ${active ? 'text-slate-300' : 'text-slate-400'}`}>{count}</span>
    </button>
  )
}
