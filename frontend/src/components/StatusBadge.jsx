import { STATUS_BY_VALUE } from '../lib/constants'

export default function StatusBadge({ status }) {
  const s = STATUS_BY_VALUE[status] ?? STATUS_BY_VALUE.NEW
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.badge}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
