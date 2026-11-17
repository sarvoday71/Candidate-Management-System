import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, UserRound } from 'lucide-react'
import { createCandidate, deleteCandidate, listCandidates, updateCandidate } from './lib/api'
import { EMPTY_FILTERS } from './lib/constants'
import { btnPrimary } from './lib/ui'
import { useDebounce } from './lib/useDebounce'
import CandidateFormModal from './components/CandidateFormModal'
import CandidateTable from './components/CandidateTable'
import ConfirmDialog from './components/ConfirmDialog'
import FilterBar from './components/FilterBar'
import { EmptyState, ErrorState, ListSkeleton } from './components/ListStates'
import StatsCards from './components/StatsCards'
import Toasts from './components/Toasts'

export default function App() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const debouncedFilters = useDebounce(filters, 300)
  const [candidates, setCandidates] = useState([])
  const [everyone, setEveryone] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [formTarget, setFormTarget] = useState(undefined) // undefined = closed, null = create, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toasts, setToasts] = useState([])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    listCandidates(debouncedFilters, ctrl.signal)
      .then((data) => {
        setCandidates(data)
        setError('')
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })
    return () => ctrl.abort()
  }, [debouncedFilters, reloadKey])

  useEffect(() => {
    const ctrl = new AbortController()
    listCandidates({}, ctrl.signal)
      .then((data) => {
        setEveryone(data)
        setStatsLoading(false)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setStatsLoading(false)
      })
    return () => ctrl.abort()
  }, [reloadKey])

  const statusCounts = useMemo(() => {
    const counts = {}
    everyone.forEach((c) => {
      counts[c.status] = (counts[c.status] ?? 0) + 1
    })
    return counts
  }, [everyone])

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
          <StatsCards candidates={everyone} loading={statsLoading} />

          <FilterBar
            filters={filters}
            onChange={patchFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
            statusCounts={statusCounts}
            totalCount={everyone.length}
            resultCount={candidates.length}
            loading={loading}
          />

          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : firstLoad ? (
            <ListSkeleton />
          ) : candidates.length === 0 && !loading ? (
            <EmptyState filtered={filtered} onClear={() => setFilters(EMPTY_FILTERS)} onAdd={() => setFormTarget(null)} />
          ) : (
            <div className={`transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
              <CandidateTable candidates={candidates} onEdit={setFormTarget} onDelete={setDeleteTarget} />
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
