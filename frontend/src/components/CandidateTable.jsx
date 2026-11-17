import { Building2, Mail, MapPin, Pencil, Phone, Trash2 } from 'lucide-react'
import { formatDate, fullName, years } from '../lib/format'
import Avatar from './Avatar'
import StatusBadge from './StatusBadge'

function Skills({ skills }) {
  if (!skills?.length) return <span className="text-slate-300">—</span>
  const shown = skills.slice(0, 3)
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {s}
        </span>
      ))}
      {skills.length > shown.length && (
        <span className="rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400" title={skills.slice(3).join(', ')}>
          +{skills.length - shown.length}
        </span>
      )}
    </div>
  )
}

function RowActions({ candidate, onEdit, onDelete }) {
  const stop = (fn) => (e) => {
    e.stopPropagation()
    fn(candidate)
  }
  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={stop(onEdit)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        aria-label={`Edit ${fullName(candidate)}`}
      >
        <Pencil className="size-4" />
      </button>
      <button
        onClick={stop(onDelete)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
        aria-label={`Delete ${fullName(candidate)}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

export default function CandidateTable({ candidates, onEdit, onDelete }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3.5">Candidate</th>
              <th className="px-5 py-3.5">Current role</th>
              <th className="px-5 py-3.5">Skills</th>
              <th className="px-5 py-3.5">Experience</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Added</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.map((c) => (
              <tr key={c.id} onClick={() => onEdit(c)} className="group cursor-pointer transition hover:bg-indigo-50/40">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar candidate={c} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{fullName(c)}</p>
                      <p className="truncate text-sm text-slate-500">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm">
                  <p className="text-slate-800">{c.currentCompany || <span className="text-slate-300">—</span>}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-slate-500">
                    {c.currentLocation ? (
                      <>
                        <MapPin className="size-3.5" />
                        {c.currentLocation}
                      </>
                    ) : null}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <Skills skills={c.skills} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">{years(c.experienceYears)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={c.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{formatDate(c.createdAt)}</td>
                <td className="px-3 py-4">
                  <div className="opacity-60 transition group-hover:opacity-100">
                    <RowActions candidate={c} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {candidates.map((c) => (
          <li
            key={c.id}
            onClick={() => onEdit(c)}
            className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition active:bg-slate-50"
          >
            <div className="flex items-start gap-3">
              <Avatar candidate={c} className="size-11 text-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-slate-900">{fullName(c)}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-500">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-slate-600">
              {c.currentCompany && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0 text-slate-400" />
                  <dd className="truncate">{c.currentCompany}</dd>
                </div>
              )}
              {c.currentLocation && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0 text-slate-400" />
                  <dd className="truncate">{c.currentLocation}</dd>
                </div>
              )}
              {c.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-slate-400" />
                  <dd className="truncate">{c.phone}</dd>
                </div>
              )}
              <div className="font-medium text-slate-700">{years(c.experienceYears)} experience</div>
            </dl>
            <div className="mt-3 flex items-end justify-between gap-2">
              <Skills skills={c.skills} />
              <RowActions candidate={c} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
