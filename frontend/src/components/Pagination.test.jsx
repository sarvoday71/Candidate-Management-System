import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

const info = (page, totalPages, totalElements, size = 20) => ({ page, size, totalElements, totalPages })

function setup(pageInfo, props = {}) {
  const onPage = vi.fn()
  const view = render(<Pagination pageInfo={pageInfo} onPage={onPage} loading={false} {...props} />)
  return { onPage, ...view }
}

describe('Pagination', () => {
  it('renders nothing when there are no results', () => {
    const { container } = setup(info(0, 0, 0))
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the visible range and the total', () => {
    setup(info(1, 12, 233))
    expect(screen.getByText('21–40')).toBeInTheDocument()
    expect(screen.getByText('233')).toBeInTheDocument()
  })

  it('caps the range at the total on the last page', () => {
    setup(info(11, 12, 233))
    expect(screen.getByText('221–233')).toBeInTheDocument()
  })

  it('hides the page buttons but still shows the range when everything fits on one page', () => {
    setup(info(0, 1, 7))
    expect(screen.getByText('1–7')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('disables Previous on the first page and Next on the last page', () => {
    const first = setup(info(0, 3, 50))
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
    first.unmount()

    setup(info(2, 3, 50))
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('goes to the previous and next page (zero-based)', async () => {
    const user = userEvent.setup()
    const { onPage } = setup(info(4, 12, 233))

    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(onPage).toHaveBeenNthCalledWith(1, 3)
    expect(onPage).toHaveBeenNthCalledWith(2, 5)
  })

  it('calls onPage with the zero-based index when a page number is clicked', async () => {
    const user = userEvent.setup()
    const { onPage } = setup(info(0, 3, 50))

    await user.click(screen.getByRole('button', { name: '3' }))

    expect(onPage).toHaveBeenCalledWith(2)
  })

  it('marks the current page', () => {
    setup(info(1, 3, 50))
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('aria-current')
  })

  it('shows every page number when there are only a few pages', () => {
    setup(info(0, 3, 50))
    expect(screen.queryByText('…')).not.toBeInTheDocument()
    for (const label of ['1', '2', '3']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('collapses the middle of a long list with ellipses on both sides', () => {
    setup(info(5, 12, 233))
    // first, current's neighbours, last
    for (const label of ['1', '5', '6', '7', '12']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '3' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '10' })).not.toBeInTheDocument()
    expect(screen.getAllByText('…')).toHaveLength(2)
  })

  it('shows a single ellipsis near the start of a long list', () => {
    setup(info(0, 12, 233))
    for (const label of ['1', '2', '12']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.getAllByText('…')).toHaveLength(1)
  })

  it('disables every button while loading', () => {
    setup(info(1, 3, 50), { loading: true })
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })
})
