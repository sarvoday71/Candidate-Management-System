export const STATUSES = [
  { value: 'NEW', label: 'New', badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
  { value: 'SCREENING', label: 'Screening', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  { value: 'INTERVIEWING', label: 'Interviewing', badge: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500' },
  { value: 'OFFERED', label: 'Offered', badge: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20', dot: 'bg-cyan-500' },
  { value: 'HIRED', label: 'Hired', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  { value: 'REJECTED', label: 'Rejected', badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500' },
]

export const PAGE_SIZE = 20

export const STATUS_BY_VALUE = Object.fromEntries(STATUSES.map((s) => [s.value, s]))

export const EMPTY_FILTERS = {
  name: '',
  email: '',
  location: '',
  skills: [],
  minExperience: '',
  maxExperience: '',
  status: '',
}
