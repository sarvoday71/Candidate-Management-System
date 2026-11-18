import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import TagInput from './TagInput'

function Harness({ initial = [] }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <TagInput id="skills" value={value} onChange={setValue} placeholder="Add a skill" />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  )
}

const tags = () => JSON.parse(screen.getByTestId('value').textContent)

describe('TagInput', () => {
  it('adds a tag when Enter is pressed and clears the field', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('textbox')

    await user.type(input, 'Java{Enter}')

    expect(tags()).toEqual(['Java'])
    expect(input).toHaveValue('')
    expect(screen.getByText('Java')).toBeInTheDocument()
  })

  it('adds a tag when a comma is typed, without inserting the comma', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('textbox')

    await user.type(input, 'Go,Rust,')

    expect(tags()).toEqual(['Go', 'Rust'])
    expect(input).toHaveValue('')
  })

  it('splits pasted comma-separated text into several tags', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('textbox'))
    await user.paste('a, b ,c')
    await user.keyboard('{Enter}')

    expect(tags()).toEqual(['a', 'b', 'c'])
  })

  it('ignores case when de-duplicating and keeps the first spelling', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('textbox'), 'Java{Enter}java{Enter}JAVA{Enter}')

    expect(tags()).toEqual(['Java'])
  })

  it('does not add empty or whitespace-only tags', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('textbox'), '   {Enter}{Enter}')

    expect(tags()).toEqual([])
  })

  it('removes the last tag on Backspace when the draft is empty', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['Java', 'Spring']} />)

    await user.click(screen.getByRole('textbox'))
    await user.keyboard('{Backspace}')

    expect(tags()).toEqual(['Java'])
  })

  it('edits the draft, not the tags, when Backspace is pressed with text in the field', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['Java']} />)
    const input = screen.getByRole('textbox')

    await user.type(input, 'ab{Backspace}')

    expect(input).toHaveValue('a')
    expect(tags()).toEqual(['Java'])
  })

  it('removes a tag with its remove button', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['Java', 'Spring', 'Docker']} />)

    await user.click(screen.getByRole('button', { name: 'Remove Spring' }))

    expect(tags()).toEqual(['Java', 'Docker'])
    expect(screen.queryByText('Spring')).not.toBeInTheDocument()
  })

  it('commits whatever is typed when the field loses focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('textbox'), 'Rust')
    await user.tab()

    expect(tags()).toEqual(['Rust'])
  })

  it('shows the placeholder only while there are no tags', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByPlaceholderText('Add a skill')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox'), 'Java{Enter}')

    expect(screen.queryByPlaceholderText('Add a skill')).not.toBeInTheDocument()
  })
})
