import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, UserRound } from 'lucide-react'
import { createCandidate, deleteCandidate, getStats, listCandidates, updateCandidate } from './lib/api'
import { EMPTY_FILTERS, PAGE_SIZE } from './lib/constants'
import { btnPrimary } from './lib/ui'
import { useDebounce } from './lib/useDebounce'
import CandidateFormModal from './components/CandidateFormModal'
import CandidateTable from './components/CandidateTable'
import ConfirmDialog from './components/ConfirmDialog'
import FilterBar from './components/FilterBar'
import { EmptyState, ErrorState, ListSkeleton } from './components/ListStates'
import Pagination from './components/Pagination'
import StatsCards from './components/StatsCards'
import Toasts from './components/Toasts'

export default function App() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const debouncedFilters = useDebounce(filters, 300)
  const [page, setPage] = useState(0)
  const [candidates, setCandidates] = useState([])
  const [pageInfo, setPageInfo] = useState({ page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [formTarget, setFormTarget] = useState(undefined) // undefined = closed, null = create, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toasts, setToasts] = useState([])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const lastFilters = useRef(debouncedFilters)

  useEffect(() => {
    // New filters always start from page 1; skip the fetch here, the page reset triggers it.
    if (lastFilters.current !== debouncedFilters) {
      lastFilters.current = debouncedFilters
      if (page !== 0) {
        setPage(0)
        return
      }
    }
    const ctrl = new AbortController()
    setLoading(true)
    listCandidates(debouncedFilters, page, PAGE_SIZE, ctrl.signal)
      .then((data) => {
        // The last row of the last page was deleted: step back instead of showing an empty page.
        if (data.content.length === 0 && page > 0 && data.totalPages > 0) {
          setPage(data.totalPages - 1)
          return
        }
        setCandidates(data.content)
        setPageInfo({ page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages })
        setError('')
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })
    return () => ctrl.abort()
  }, [debouncedFilters, page, reloadKey])

  useEffect(() => {
    const ctrl = new AbortController()
    getStats(ctrl.signal)
      .then((data) => {
        setStats(data)
        setStatsLoading(false)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setStatsLoading(false)
      })
    return () => ctrl.abort()
  }, [reloadKey])

  const pushToast = useCallback((type, message) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id))

  const patchFilters = (patch) => setFilters((f) => ({ ...f, ...patch }))

  const filtered = JSON.stringify(debouncedFilters) !== JSON.stringify(EMPTY_FILTERS)
  const firstLoad = loading && candidates.length === 0 && !error

  const handleSave = async (data) => {
    if (formTarget) {
      await updateCandidate(formTarget.id, data)
      pushToast('success', `${data.firstName} ${data.lastName} was updated`)
    } else {
      await createCandidate(data)
      pushToast('success', `${data.firstName} ${data.lastName} was added`)
      setPage(0) // newest candidates are listed first
    }
    setFormTarget(undefined)
    reload()
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteCandidate(deleteTarget.id)
      pushToast('success', `${deleteTarget.firstName} ${deleteTarget.lastName} was deleted`)
      setDeleteTarget(null)
      reload()
    } catch (err) {
      pushToast('error', err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-80 bg-gradient-to-b from-indigo-100/80 via-violet-50/50 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
              <UserRound className="size-5" />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">Candidate Management</span>
          </div>
          <button className={btnPrimary} onClick={() => setFormTarget(null)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add candidate</span>
            <span className="sm:hidden">Add</span>
          </button>
        </header>

        <div className="mb-8 mt-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Candidates</h1>
          <p className="mt-2 max-w-2xl text-base text-slate-500">
            Track every candidate from first contact to offer. Search, filter and keep your hiring pipeline organized.
          </p>
        </div>

        <div className="space-y-6">
          <StatsCards stats={stats} loading={statsLoading} />

          <FilterBar
            filters={filters}
            onChange={patchFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
            statusCounts={stats?.byStatus ?? {}}
            totalCount={stats?.total ?? 0}
            resultCount={pageInfo.totalElements}
            loading={loading}
          />

          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : firstLoad ? (
            <ListSkeleton />
          ) : candidates.length === 0 && !loading ? (
            <EmptyState filtered={filtered} onClear={() => setFilters(EMPTY_FILTERS)} onAdd={() => setFormTarget(null)} />
          ) : (
            <div className="space-y-4">
              <div className={`transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
                <CandidateTable candidates={candidates} onEdit={setFormTarget} onDelete={setDeleteTarget} />
              </div>
              <Pagination pageInfo={pageInfo} onPage={setPage} loading={loading} />
            </div>
          )}
        </div>
      </div>

      {formTarget !== undefined && (
        <CandidateFormModal
          key={formTarget?.id ?? 'new'}
          candidate={formTarget}
          onClose={() => setFormTarget(undefined)}
          onSubmit={handleSave}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog candidate={deleteTarget} busy={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
