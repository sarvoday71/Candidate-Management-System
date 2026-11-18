import { ChevronLeft, ChevronRight } from 'lucide-react'

// First, last and the current page's neighbours, with "…" where numbers are skipped.
function pageWindow(current, total) {
  const wanted = [...new Set([0, total - 1, current - 1, current, current + 1])]
    .filter((p) => p >= 0 && p < total)
    .sort((a, b) => a - b)
  const out = []
  wanted.forEach((p, i) => {
    if (i > 0 && p - wanted[i - 1] > 1) out.push('gap')
    out.push(p)
  })
  return out
}

const btn =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40'

export default function Pagination({ pageInfo, onPage, loading }) {
  const { page, size, totalElements, totalPages } = pageInfo
  if (totalElements === 0) return null
  const from = page * size + 1
  const to = Math.min((page + 1) * size, totalElements)

  return (
    <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
      <p className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-semibold text-slate-700">{totalElements}</span>
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            className={`${btn} text-slate-600 hover:bg-slate-100`}
            onClick={() => onPage(page - 1)}
            disabled={page === 0 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-2 text-sm text-slate-500 sm:hidden">
            Page {page + 1} of {totalPages}
          </span>
          <div className="hidden items-center gap-1 sm:flex">
            {pageWindow(page, totalPages).map((p, i) =>
              p === 'gap' ? (
                <span key={`gap-${i}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPage(p)}
                  disabled={loading}
                  aria-current={p === page ? 'page' : undefined}
                  className={`${btn} ${p === page ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {p + 1}
                </button>
              ),
            )}
          </div>
          <button
            className={`${btn} text-slate-600 hover:bg-slate-100`}
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </nav>
  )
}
