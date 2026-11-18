const BASE = '/api/candidates'

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function request(url, options = {}) {
  let res
  try {
    res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }
  if (res.status === 204) return null
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(body?.detail || `Request failed (${res.status})`, res.status, body?.errors || {})
  }
  return body
}

function buildQuery(filters) {
  const params = new URLSearchParams()
  const add = (key, value) => {
    if (value !== '' && value !== null && value !== undefined) params.append(key, value)
  }
  add('name', filters.name?.trim())
  add('email', filters.email?.trim())
  add('location', filters.location?.trim())
  ;(filters.skills || []).forEach((skill) => add('skills', skill))
  add('minExperience', filters.minExperience)
  add('maxExperience', filters.maxExperience)
  add('status', filters.status)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// Resolves to { content, page, size, totalElements, totalPages }.
export function listCandidates(filters, page, size, signal) {
  const query = buildQuery(filters)
  const paging = `page=${page}&size=${size}`
  return request(`${BASE}${query ? `${query}&${paging}` : `?${paging}`}`, { signal })
}

// Resolves to { total, averageExperience, byStatus: { NEW: n, ... } }.
export const getStats = (signal) => request(`${BASE}/stats`, { signal })

export const createCandidate = (data) => request(BASE, { method: 'POST', body: JSON.stringify(data) })

export const updateCandidate = (id, data) => request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteCandidate = (id) => request(`${BASE}/${id}`, { method: 'DELETE' })
