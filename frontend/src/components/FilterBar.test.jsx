import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_FILTERS } from '../lib/constants'
import FilterBar from './FilterBar'

function setup({ filters = {}, ...props } = {}) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <FilterBar
      filters={{ ...EMPTY_FILTERS, ...filters }}
      onChange={onChange}
      onClear={onClear}
      statusCounts={{ NEW: 4, HIRED: 1 }}
      totalCount={5}
      resultCount={5}
      loading={false}
      {...props}
    />,
  )
  return { onChange, onClear, user: userEvent.setup() }
}

const moreFilters = () => screen.getByRole('button', { name: /more filters/i })

describe('FilterBar: search inputs', () => {
  it('reports name typing as a name patch', async () => {
    const { onChange, user } = setup()
    await user.type(screen.getByLabelText('Search by name'), 'a')
    expect(onChange).toHaveBeenCalledWith({ name: 'a' })
  })

  it('reports email typing as an email patch', async () => {
    const { onChange, user } = setup()
    await user.type(screen.getByLabelText('Search by email'), 'x')
    expect(onChange).toHaveBeenCalledWith({ email: 'x' })
  })

  it('shows the current values', () => {
    setup({ filters: { name: 'asha', email: 'acme' } })
    expect(screen.getByLabelText('Search by name')).toHaveValue('asha')
    expect(screen.getByLabelText('Search by email')).toHaveValue('acme')
  })
})

describe('FilterBar: status chips', () => {
  it('shows the live count on each chip', () => {
    setup()
    expect(screen.getByRole('button', { name: /^All\s*5$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^New\s*4$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Hired\s*1$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Rejected\s*0$/ })).toBeInTheDocument()
  })

  it('selects a status when its chip is clicked', async () => {
    const { onChange, user } = setup()
    await user.click(screen.getByRole('button', { name: /^Hired/ }))
    expect(onChange).toHaveBeenCalledWith({ status: 'HIRED' })
  })

  it('clears the status when the active chip is clicked again', async () => {
    const { onChange, user } = setup({ filters: { status: 'HIRED' } })
    const chip = screen.getByRole('button', { name: /^Hired/ })
    expect(chip).toHaveAttribute('aria-pressed', 'true')

    await user.click(chip)

    expect(onChange).toHaveBeenCalledWith({ status: '' })
  })

  it('clears the status with the "All" chip', async () => {
    const { onChange, user } = setup({ filters: { status: 'NEW' } })
    expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: /^All/ }))

    expect(onChange).toHaveBeenCalledWith({ status: '' })
  })

  it('marks "All" as pressed when no status is selected', () => {
    setup()
    expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('FilterBar: more filters panel', () => {
  it('is collapsed until "More filters" is clicked', async () => {
    const { user } = setup()
    expect(screen.queryByLabelText('Location')).not.toBeInTheDocument()

    await user.click(moreFilters())

    expect(screen.getByLabelText('Location')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Skills/)).toBeInTheDocument()
    expect(screen.getByLabelText('Min yrs')).toBeInTheDocument()
    expect(screen.getByLabelText('Max yrs')).toBeInTheDocument()
    expect(moreFilters()).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapses again when clicked a second time', async () => {
    const { user } = setup()
    await user.click(moreFilters())
    await user.click(moreFilters())
    expect(screen.queryByLabelText('Location')).not.toBeInTheDocument()
  })

  it('shows no badge without advanced filters', () => {
    setup()
    expect(moreFilters()).toHaveAccessibleName('More filters')
  })

  it('badges the number of active advanced filters', () => {
    setup({ filters: { location: 'Beng', skills: ['java'], minExperience: '2' } })
    expect(within(moreFilters()).getByText('3')).toBeInTheDocument()
  })

  it('does not count name, email or status in the badge', () => {
    setup({ filters: { name: 'a', email: 'b', status: 'NEW' } })
    expect(moreFilters()).toHaveAccessibleName('More filters')
  })

  it('reports each advanced field as its own patch', async () => {
    const { onChange, user } = setup()
    await user.click(moreFilters())

    await user.type(screen.getByLabelText('Location'), 'b')
    await user.type(screen.getByLabelText('Min yrs'), '5')
    await user.type(screen.getByLabelText('Max yrs'), '9')
    await user.type(screen.getByLabelText(/^Skills/), 'java{Enter}')

    expect(onChange).toHaveBeenCalledWith({ location: 'b' })
    expect(onChange).toHaveBeenCalledWith({ minExperience: '5' })
    expect(onChange).toHaveBeenCalledWith({ maxExperience: '9' })
    expect(onChange).toHaveBeenCalledWith({ skills: ['java'] })
  })
})

describe('FilterBar: clear all and result text', () => {
  it('has no "Clear all" button when nothing is active', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
  })

  it.each([
    ['name', { name: 'asha' }],
    ['email', { email: 'acme' }],
    ['status', { status: 'HIRED' }],
    ['location', { location: 'beng' }],
    ['skills', { skills: ['java'] }],
    ['minimum experience', { minExperience: '2' }],
    ['maximum experience', { maxExperience: '9' }],
  ])('offers "Clear all" when %s is active and calls onClear', async (_label, filters) => {
    const { onClear, user } = setup({ filters })

    await user.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('pluralizes the result count', () => {
    const one = render(
      <FilterBar filters={EMPTY_FILTERS} onChange={vi.fn()} onClear={vi.fn()} statusCounts={{}} totalCount={1} resultCount={1} loading={false} />,
    )
    expect(screen.getByText('1 result')).toBeInTheDocument()
    one.unmount()

    setup({ resultCount: 5 })
    expect(screen.getByText('5 results')).toBeInTheDocument()
  })

  it('says "Searching…" while loading', () => {
    setup({ loading: true })
    expect(screen.getByText('Searching…')).toBeInTheDocument()
  })
})
