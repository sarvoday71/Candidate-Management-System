export const fullName = (c) => `${c.firstName} ${c.lastName}`

export const initials = (c) => `${c.firstName?.[0] ?? ''}${c.lastName?.[0] ?? ''}`.toUpperCase()

const GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
  'from-cyan-500 to-sky-500',
]

export const gradientFor = (id) => GRADIENTS[Math.abs(Number(id) || 0) % GRADIENTS.length]

export const years = (n) => (n === 1 ? '1 yr' : `${n ?? 0} yrs`)

// The API sends UTC timestamps without a zone suffix.
export function formatDate(iso) {
  if (!iso) return '—'
  const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(iso)
  const date = new Date(hasZone ? iso : `${iso}Z`)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
