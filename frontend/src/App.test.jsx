import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { makeCandidate } from './test/fixtures'
import { installApi } from './test/mockApi'

vi.setConfig({ testTimeout: 15000 })

const fetchMock = vi.fn()
const wait = { timeout: 3000 }

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const people = () => [
  makeCandidate({ id: 1, firstName: 'Asha', lastName: 'Rao', email: 'asha.rao@acme.com', status: 'NEW', experienceYears: 3 }),
  makeCandidate({ id: 2, firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@globex.io', status: 'INTERVIEWING', experienceYears: 4, skills: ['React'] }),
  makeCandidate({ id: 3, firstName: 'Meera', lastName: 'Iyer', email: 'meera@initech.com', status: 'HIRED', experienceYears: 9 }),
  makeCandidate({ id: 4, firstName: 'Asha', lastName: 'Menon', email: 'asha.menon@globex.io', status: 'NEW', experienceYears: 0 }),
]

const manyPeople = (n = 45) =>
  Array.from({ length: n }, (_, i) =>
    makeCandidate({ id: i + 1, firstName: 'Person', lastName: String(i + 1).padStart(2, '0'), email: `p${i + 1}@x.com` }),
  )

// Rows render twice (desktop table + mobile cards; CSS decides which one shows), so queries use "all".
const rowsNamed = (name) => screen.queryAllByText(name)
const nameFilter = () => screen.getByLabelText('Search by name')
const chip = (label, count) => screen.getByRole('button', { name: new RegExp(`^${label}${count === undefined ? '' : `\\s*${count}$`}`) })

async function renderLoaded(initial, firstRow) {
  const api = installApi(fetchMock, initial)
  const user = userEvent.setup()
  render(<App />)
  await screen.findAllByText(firstRow)
  return { api, user }
}

describe('App: loading and display', () => {
  it('loads candidates and dashboard stats on startup', async () => {
    const { api } = await renderLoaded(people(), 'Asha Rao')

    expect(rowsNamed('Meera Iyer').length).toBeGreaterThan(0)
    expect(rowsNamed('Ravi Kumar').length).toBeGreaterThan(0)
    expect(await screen.findByText('4.0 yrs')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^All\s*4$/ })).toBeInTheDocument()
    expect(chip('Hired', 1)).toBeInTheDocument()
    expect(screen.getByText('4 results')).toBeInTheDocument()
    expect(api.listUrls()[0].search).toBe('?page=0&size=20')
    expect(api.callsTo('GET', '/api/candidates/stats')).toHaveLength(1)
  })

  it('lists the newest candidate first', async () => {
    await renderLoaded(people(), 'Asha Rao')

    const names = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByText(/^[A-Z][a-z]+ [A-Z][a-z]+$/)[0].textContent)
    expect(names).toEqual(['Asha Menon', 'Meera Iyer', 'Ravi Kumar', 'Asha Rao'])
  })

  it('shows the empty state when there are no candidates at all', async () => {
    installApi(fetchMock, [])
    render(<App />)

    expect(await screen.findByText('No candidates yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your first candidate/i })).toBeInTheDocument()
  })

  it('shows an error with a Retry button when the list cannot be loaded, then recovers', async () => {
    const api = installApi(fetchMock, people())
    api.failList = true
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText("Couldn't load candidates")).toBeInTheDocument()
    expect(screen.getByText(/Cannot reach the server/)).toBeInTheDocument()

    api.failList = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect((await screen.findAllByText('Asha Rao')).length).toBeGreaterThan(0)
    expect(screen.queryByText("Couldn't load candidates")).not.toBeInTheDocument()
  })
})

describe('App: searching and filtering', () => {
  it('debounces typing into a single name search and narrows the table', async () => {
    const { api, user } = await renderLoaded(people(), 'Ravi Kumar')

    await user.type(nameFilter(), 'asha')

    await waitFor(() => expect(rowsNamed('Ravi Kumar')).toHaveLength(0), wait)
    expect(rowsNamed('Asha Menon').length).toBeGreaterThan(0)
    expect(rowsNamed('Asha Rao').length).toBeGreaterThan(0)
    expect(screen.getByText('2 results')).toBeInTheDocument()

    const nameSearches = api.listUrls().map((u) => u.searchParams.get('name')).filter(Boolean)
    expect(nameSearches).toEqual(['asha'])
  })

  it('filters by status when a status chip is clicked and shows all again via "All"', async () => {
    const { api, user } = await renderLoaded(people(), 'Ravi Kumar')

    await user.click(chip('Interviewing'))

    await waitFor(() => expect(rowsNamed('Asha Rao')).toHaveLength(0), wait)
    expect(rowsNamed('Ravi Kumar').length).toBeGreaterThan(0)
    expect(api.listUrls().some((u) => u.searchParams.get('status') === 'INTERVIEWING')).toBe(true)

    await user.click(chip('All'))
    await waitFor(() => expect(rowsNamed('Asha Rao').length).toBeGreaterThan(0), wait)
  })

  it('shows a "no match" state and lets the user clear the filters', async () => {
    const { user } = await renderLoaded(people(), 'Asha Rao')

    await user.type(nameFilter(), 'zzz')

    expect(await screen.findByText('No candidates match your filters', undefined, wait)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }))

    await waitFor(() => expect(rowsNamed('Asha Rao').length).toBeGreaterThan(0), wait)
    expect(nameFilter()).toHaveValue('')
    expect(screen.queryByText('No candidates match your filters')).not.toBeInTheDocument()
  })
})

describe('App: pagination', () => {
  it('requests the next page when a page number is clicked', async () => {
    const { api, user } = await renderLoaded(manyPeople(), 'Person 45')
    expect(screen.getByText('1–20')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '2' }))

    expect(await screen.findByText('21–40', undefined, wait)).toBeInTheDocument()
    expect(api.listUrls().some((u) => u.searchParams.get('page') === '1')).toBe(true)
    expect(rowsNamed('Person 25').length).toBeGreaterThan(0)
    expect(rowsNamed('Person 45')).toHaveLength(0)
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
  })

  it('goes back to page 1 when a filter changes while on page 2', async () => {
    const { api, user } = await renderLoaded(manyPeople(), 'Person 45')
    await user.click(screen.getByRole('button', { name: '2' }))
    await screen.findByText('21–40', undefined, wait)

    await user.type(nameFilter(), 'person')

    await waitFor(() => expect(api.listUrls().some((u) => u.searchParams.get('name') === 'person')).toBe(true), wait)
    expect(await screen.findByText('1–20', undefined, wait)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')

    const filtered = api.listUrls().filter((u) => u.searchParams.get('name') === 'person')
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach((u) => expect(u.searchParams.get('page')).toBe('0'))
  })
})

describe('App: delete', () => {
  it('asks for confirmation, deletes, refreshes the list and stats, and shows a toast', async () => {
    const { api, user } = await renderLoaded(people(), 'Asha Rao')

    await user.click(screen.getAllByRole('button', { name: 'Delete Asha Rao' })[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Delete candidate?')).toBeInTheDocument()
    expect(api.callsTo('DELETE', '/api/candidates/1')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Asha Rao was deleted', undefined, wait)).toBeInTheDocument()
    expect(api.callsTo('DELETE', '/api/candidates/1')).toHaveLength(1)
    await waitFor(() => expect(rowsNamed('Asha Rao')).toHaveLength(0), wait)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^All\s*3$/ }, wait)).toBeInTheDocument()
  })

  it('does nothing when the confirmation is cancelled', async () => {
    const { api, user } = await renderLoaded(people(), 'Asha Rao')

    await user.click(screen.getAllByRole('button', { name: 'Delete Asha Rao' })[0])
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.callsTo('DELETE', '/api/candidates/1')).toHaveLength(0)
    expect(rowsNamed('Asha Rao').length).toBeGreaterThan(0)
  })

  it('keeps the dialog open and shows an error toast when the server rejects the delete', async () => {
    const { api, user } = await renderLoaded(people(), 'Asha Rao')
    api.failDelete = true

    await user.click(screen.getAllByRole('button', { name: 'Delete Asha Rao' })[0])
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Boom', undefined, wait)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(rowsNamed('Asha Rao').length).toBeGreaterThan(0)
  })
})

describe('App: create and edit', () => {
  it('creates a candidate from the form and shows it', async () => {
    const { api, user } = await renderLoaded(people(), 'Asha Rao')

    await user.click(screen.getByRole('button', { name: /add candidate/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^first name/i), 'Priya')
    await user.type(within(dialog).getByLabelText(/^last name/i), 'Nair')
    await user.type(within(dialog).getByLabelText(/^email/i), 'priya@x.com')
    await user.click(within(dialog).getByRole('button', { name: 'Add candidate' }))

    expect(await screen.findByText('Priya Nair was added', undefined, wait)).toBeInTheDocument()
    expect(api.callsTo('POST', '/api/candidates')[0].body).toMatchObject({
      firstName: 'Priya',
      lastName: 'Nair',
      email: 'priya@x.com',
      status: 'NEW',
      skills: [],
    })
    await waitFor(() => expect(rowsNamed('Priya Nair').length).toBeGreaterThan(0), wait)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('edits a candidate by clicking its row and refreshes the status counts', async () => {
    const { api, user } = await renderLoaded(people(), 'Ravi Kumar')
    expect(chip('Hired', 1)).toBeInTheDocument()

    await user.click(screen.getAllByText('Ravi Kumar')[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Edit candidate' })).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText(/^status/i), 'HIRED')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Ravi Kumar was updated', undefined, wait)).toBeInTheDocument()
    expect(api.callsTo('PUT', '/api/candidates/2')[0].body).toMatchObject({ firstName: 'Ravi', status: 'HIRED' })
    await waitFor(() => expect(chip('Hired', 2)).toBeInTheDocument(), wait)
  })

  it('shows a duplicate-email error in the form and keeps it open', async () => {
    const { api, user } = await renderLoaded(people(), 'Asha Rao')
    const original = fetchMock.getMockImplementation()
    fetchMock.mockImplementation(async (url, options = {}) => {
      if ((options.method ?? 'GET') === 'POST') {
        return new Response(JSON.stringify({ status: 409, detail: 'A candidate with email asha.rao@acme.com already exists' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return original(url, options)
    })

    await user.click(screen.getByRole('button', { name: /add candidate/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^first name/i), 'Dup')
    await user.type(within(dialog).getByLabelText(/^last name/i), 'Licate')
    await user.type(within(dialog).getByLabelText(/^email/i), 'asha.rao@acme.com')
    await user.click(within(dialog).getByRole('button', { name: 'Add candidate' }))

    expect(await within(dialog).findByText(/already exists/, undefined, wait)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(api.candidates).toHaveLength(4)
  })
})
