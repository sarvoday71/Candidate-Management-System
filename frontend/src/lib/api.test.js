import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createCandidate, deleteCandidate, getStats, listCandidates, updateCandidate } from './api'
import { jsonResponse, noContent } from '../test/fixtures'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const lastCall = () => fetchMock.mock.calls.at(-1)
const lastUrl = () => lastCall()[0]
const lastOptions = () => lastCall()[1]

describe('listCandidates: building the URL', () => {
  beforeEach(() => fetchMock.mockImplementation(async () => jsonResponse({ content: [] })))

  it('sends only paging when there are no filters, starting the query string with "?"', async () => {
    await listCandidates({}, 0, 20)
    expect(lastUrl()).toBe('/api/candidates?page=0&size=20')
  })

  it('appends paging after filters with "&"', async () => {
    await listCandidates({ name: 'asha' }, 3, 50)
    expect(lastUrl()).toBe('/api/candidates?name=asha&page=3&size=50')
  })

  it('sends every filter, trims text, repeats skills and keeps a stable order', async () => {
    await listCandidates(
      {
        name: '  asha  ',
        email: ' a@x.com ',
        location: ' Beng ',
        skills: ['java', 'spring'],
        minExperience: 2,
        maxExperience: 10,
        status: 'HIRED',
      },
      1,
      20,
    )
    expect(lastUrl()).toBe(
      '/api/candidates?name=asha&email=a%40x.com&location=Beng&skills=java&skills=spring' +
        '&minExperience=2&maxExperience=10&status=HIRED&page=1&size=20',
    )
  })

  it('omits blank, empty and missing filters', async () => {
    await listCandidates(
      { name: '   ', email: '', location: undefined, skills: [], minExperience: '', maxExperience: null, status: '' },
      0,
      20,
    )
    expect(lastUrl()).toBe('/api/candidates?page=0&size=20')
  })

  it('keeps a minimum experience of 0 (zero is a real value, not "empty")', async () => {
    await listCandidates({ minExperience: 0 }, 0, 20)
    expect(new URL(lastUrl(), 'http://x').searchParams.get('minExperience')).toBe('0')
  })

  it('URL-encodes special characters so they survive the round trip', async () => {
    await listCandidates({ name: "o'brien & co" }, 0, 20)
    expect(new URL(lastUrl(), 'http://x').searchParams.get('name')).toBe("o'brien & co")
  })

  it('passes the abort signal to fetch', async () => {
    const controller = new AbortController()
    await listCandidates({}, 0, 20, controller.signal)
    expect(lastOptions().signal).toBe(controller.signal)
  })

  it('resolves to the parsed page body', async () => {
    const page = { content: [{ id: 1 }], page: 0, size: 20, totalElements: 1, totalPages: 1 }
    fetchMock.mockImplementation(async () => jsonResponse(page))
    await expect(listCandidates({}, 0, 20)).resolves.toEqual(page)
  })
})

describe('write requests', () => {
  const data = { firstName: 'Asha', lastName: 'Rao', email: 'asha@x.com' }

  it('createCandidate POSTs JSON and returns the created candidate', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ id: 9, ...data }, 201))
    await expect(createCandidate(data)).resolves.toEqual({ id: 9, ...data })

    expect(lastUrl()).toBe('/api/candidates')
    expect(lastOptions().method).toBe('POST')
    expect(lastOptions().headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(lastOptions().body)).toEqual(data)
  })

  it('updateCandidate PUTs JSON to /{id}', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ id: 7, ...data }))
    await updateCandidate(7, data)

    expect(lastUrl()).toBe('/api/candidates/7')
    expect(lastOptions().method).toBe('PUT')
    expect(JSON.parse(lastOptions().body)).toEqual(data)
  })

  it('deleteCandidate sends DELETE and resolves to null for a 204 response', async () => {
    fetchMock.mockImplementation(async () => noContent())
    await expect(deleteCandidate(4)).resolves.toBeNull()

    expect(lastUrl()).toBe('/api/candidates/4')
    expect(lastOptions().method).toBe('DELETE')
    expect(lastOptions().body).toBeUndefined()
  })

  it('getStats GETs /stats', async () => {
    const stats = { total: 5, averageExperience: 1.6, byStatus: { NEW: 5 } }
    fetchMock.mockImplementation(async () => jsonResponse(stats))
    await expect(getStats()).resolves.toEqual(stats)
    expect(lastUrl()).toBe('/api/candidates/stats')
  })
})

describe('error handling', () => {
  it('turns a validation ProblemDetail into an ApiError with detail, status and field errors', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(
        { status: 400, detail: 'Validation failed', errors: { email: 'must be a well-formed email address' } },
        400,
      ),
    )
    const error = await createCandidate({}).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('Validation failed')
    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({ email: 'must be a well-formed email address' })
  })

  it('reports a duplicate email (409) with the server message and no field errors', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ status: 409, detail: 'A candidate with email a@x.com already exists' }, 409),
    )
    const error = await createCandidate({}).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(409)
    expect(error.message).toBe('A candidate with email a@x.com already exists')
    expect(error.fieldErrors).toEqual({})
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockImplementation(async () => new Response('boom', { status: 500 }))
    const error = await getStats().catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(500)
    expect(error.message).toBe('Request failed (500)')
  })

  it('maps a network failure to an ApiError with status 0 and a helpful message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await listCandidates({}, 0, 20).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/Cannot reach the server/)
  })

  it('rethrows an AbortError untouched so callers can ignore cancelled requests', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    fetchMock.mockRejectedValue(abort)
    const error = await listCandidates({}, 0, 20).catch((e) => e)

    expect(error).toBe(abort)
    expect(error).not.toBeInstanceOf(ApiError)
  })
})
