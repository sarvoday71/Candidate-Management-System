import { jsonResponse, makePage, noContent } from './fixtures'

const STATUSES = ['NEW', 'SCREENING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED']

/**
 * Installs an in-memory fake of the backend on a mocked `fetch`.
 * It mirrors the real API's behaviour closely enough for UI tests: newest-first ordering,
 * word-based name search, status filter, paging, stats, and POST/PUT/DELETE.
 */
export function installApi(fetchMock, initial = []) {
  const api = {
    candidates: initial.map((c) => ({ ...c })),
    failList: false,
    failDelete: false,
    calls: [],
    nextId: Math.max(0, ...initial.map((c) => c.id)) + 1,
  }

  api.listUrls = () =>
    api.calls.filter((c) => c.method === 'GET' && c.url.pathname === '/api/candidates').map((c) => c.url)
  api.callsTo = (method, pathname) => api.calls.filter((c) => c.method === method && c.url.pathname === pathname)

  const stats = () => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]))
    api.candidates.forEach((c) => {
      byStatus[c.status] += 1
    })
    const total = api.candidates.length
    const sum = api.candidates.reduce((acc, c) => acc + c.experienceYears, 0)
    return { total, averageExperience: total === 0 ? 0 : Math.round((sum * 10) / total) / 10, byStatus }
  }

  const search = (params) => {
    const words = (params.get('name') ?? '').toLowerCase().split(/\s+/).filter(Boolean)
    const status = params.get('status')
    const size = Number(params.get('size') ?? 20)
    const page = Number(params.get('page') ?? 0)

    const matches = api.candidates
      .filter((c) => words.every((w) => c.firstName.toLowerCase().includes(w) || c.lastName.toLowerCase().includes(w)))
      .filter((c) => !status || c.status === status)
      .sort((a, b) => b.id - a.id)

    return makePage(matches.slice(page * size, page * size + size), {
      page,
      size,
      totalElements: matches.length,
      totalPages: Math.ceil(matches.length / size),
    })
  }

  fetchMock.mockImplementation(async (rawUrl, options = {}) => {
    const method = options.method ?? 'GET'
    const url = new URL(rawUrl, 'http://localhost')
    api.calls.push({ url, method, body: options.body ? JSON.parse(options.body) : undefined })

    await Promise.resolve()
    if (options.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')

    if (url.pathname === '/api/candidates/stats') return jsonResponse(stats())

    if (url.pathname === '/api/candidates' && method === 'GET') {
      if (api.failList) throw new TypeError('Failed to fetch')
      return jsonResponse(search(url.searchParams))
    }

    if (url.pathname === '/api/candidates' && method === 'POST') {
      const created = {
        id: api.nextId++,
        createdAt: '2026-11-18T10:00:00',
        updatedAt: '2026-11-18T10:00:00',
        ...JSON.parse(options.body),
      }
      api.candidates.push(created)
      return jsonResponse(created, 201)
    }

    const byId = url.pathname.match(/^\/api\/candidates\/(\d+)$/)
    if (byId && method === 'PUT') {
      const id = Number(byId[1])
      const updated = { ...api.candidates.find((c) => c.id === id), ...JSON.parse(options.body) }
      api.candidates = api.candidates.map((c) => (c.id === id ? updated : c))
      return jsonResponse(updated)
    }
    if (byId && method === 'DELETE') {
      if (api.failDelete) return jsonResponse({ status: 500, detail: 'Boom' }, 500)
      api.candidates = api.candidates.filter((c) => c.id !== Number(byId[1]))
      return noContent()
    }

    return jsonResponse({ status: 404, detail: `No route for ${method} ${url.pathname}` }, 404)
  })

  return api
}
