import { gradientFor, initials } from '../lib/format'

export default function Avatar({ candidate, className = 'size-10 text-sm' }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ${gradientFor(candidate.id)} ${className}`}
      aria-hidden="true"
    >
      {initials(candidate)}
    </div>
  )
}
