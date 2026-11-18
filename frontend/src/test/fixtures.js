export function makeCandidate(overrides = {}) {
  return {
    id: 1,
    firstName: 'Asha',
    lastName: 'Rao',
    email: 'asha.rao@acme.com',
    phone: '+91 98765 43210',
    skills: ['Java', 'Spring'],
    experienceYears: 3,
    currentCompany: 'Acme Corp',
    currentLocation: 'Bengaluru',
    status: 'NEW',
    createdAt: '2026-11-14T11:39:45.376892',
    updatedAt: '2026-11-14T11:39:45.377',
    ...overrides,
  }
}

export function makePage(content, overrides = {}) {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    ...overrides,
  }
}

export const EMPTY_STATS = {
  total: 0,
  averageExperience: 0,
  byStatus: { NEW: 0, SCREENING: 0, INTERVIEWING: 0, OFFERED: 0, HIRED: 0, REJECTED: 0 },
}

export function makeStats(overrides = {}) {
  return {
    total: 3,
    averageExperience: 4.5,
    byStatus: { NEW: 1, SCREENING: 0, INTERVIEWING: 1, OFFERED: 0, HIRED: 1, REJECTED: 0 },
    ...overrides,
  }
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function noContent() {
  return new Response(null, { status: 204 })
}
