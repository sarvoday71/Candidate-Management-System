import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/api'
import { makeCandidate } from '../test/fixtures'
import CandidateFormModal from './CandidateFormModal'

function setup({ candidate = null, onSubmit = vi.fn().mockResolvedValue(undefined) } = {}) {
  const onClose = vi.fn()
  render(<CandidateFormModal candidate={candidate} onClose={onClose} onSubmit={onSubmit} />)
  return { onClose, onSubmit, user: userEvent.setup() }
}

const field = {
  firstName: () => screen.getByLabelText(/^first name/i),
  lastName: () => screen.getByLabelText(/^last name/i),
  email: () => screen.getByLabelText(/^email/i),
  phone: () => screen.getByLabelText(/^phone/i),
  company: () => screen.getByLabelText(/current company/i),
  location: () => screen.getByLabelText(/current location/i),
  experience: () => screen.getByLabelText(/years of experience/i),
  status: () => screen.getByLabelText(/^status/i),
  skills: () => screen.getByLabelText(/^skills/i),
}

const submitButton = (name = 'Add candidate') => screen.getByRole('button', { name })

async function fillRequired(user, { firstName = 'Asha', lastName = 'Rao', email = 'asha@x.com' } = {}) {
  await user.type(field.firstName(), firstName)
  await user.type(field.lastName(), lastName)
  await user.type(field.email(), email)
}

describe('CandidateFormModal: create mode', () => {
  it('starts empty with the defaults New status and 0 years', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Add candidate' })).toBeInTheDocument()
    expect(field.firstName()).toHaveValue('')
    expect(field.experience()).toHaveValue(0)
    expect(field.status()).toHaveValue('NEW')
  })

  it('does not submit and shows messages when required fields are empty', async () => {
    const { onSubmit, user } = setup()

    await user.click(submitButton())

    expect(screen.getByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not treat whitespace as a value', async () => {
    const { onSubmit, user } = setup()
    await user.type(field.firstName(), '   ')

    await user.click(submitButton())

    expect(screen.getByText('First name is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a malformed email', async () => {
    const { onSubmit, user } = setup()
    await fillRequired(user, { email: 'not-an-email' })

    await user.click(submitButton())

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a negative or empty experience', async () => {
    const { onSubmit, user } = setup()
    await fillRequired(user)
    await user.clear(field.experience())
    await user.type(field.experience(), '-1')

    await user.click(submitButton())
    expect(screen.getByText('Must be 0 or more')).toBeInTheDocument()

    await user.clear(field.experience())
    await user.click(submitButton())
    expect(screen.getByText('Must be 0 or more')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears a field error as soon as the user edits that field', async () => {
    const { user } = setup()
    await user.click(submitButton())
    expect(screen.getByText('First name is required')).toBeInTheDocument()

    await user.type(field.firstName(), 'A')

    expect(screen.queryByText('First name is required')).not.toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
  })

  it('submits exactly the payload the API expects', async () => {
    const { onSubmit, user } = setup()
    await user.type(field.firstName(), '  Asha ')
    await user.type(field.lastName(), 'Rao  ')
    await user.type(field.email(), ' asha@x.com ')
    await user.type(field.company(), 'Acme')
    await user.clear(field.experience())
    await user.type(field.experience(), '4')
    await user.selectOptions(field.status(), 'HIRED')
    await user.type(field.skills(), 'Java{Enter}Spring{Enter}')

    await user.click(submitButton())

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Asha',
      lastName: 'Rao',
      email: 'asha@x.com',
      phone: null,
      currentCompany: 'Acme',
      currentLocation: null,
      experienceYears: 4,
      status: 'HIRED',
      skills: ['Java', 'Spring'],
    })
  })

  it('sends null for blank optional fields and an empty skills list by default', async () => {
    const { onSubmit, user } = setup()
    await fillRequired(user)

    await user.click(submitButton())

    expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Asha',
      lastName: 'Rao',
      email: 'asha@x.com',
      phone: null,
      currentCompany: null,
      currentLocation: null,
      experienceYears: 0,
      status: 'NEW',
      skills: [],
    })
  })

  it('disables the buttons while saving and ignores Escape until it finishes', async () => {
    const onSubmit = vi.fn(() => new Promise(() => {}))
    const { onClose, user } = setup({ onSubmit })
    await fillRequired(user)

    await user.click(submitButton())

    expect(submitButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('CandidateFormModal: server errors', () => {
  it('shows a duplicate-email conflict (409) under the Email field', async () => {
    const message = 'A candidate with email asha@x.com already exists'
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(message, 409))
    const { user } = setup({ onSubmit })
    await fillRequired(user)

    await user.click(submitButton())

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('shows the server field errors next to the matching fields', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError('Validation failed', 400, { firstName: 'must not be blank', email: 'must be a well-formed email address' }))
    const { user } = setup({ onSubmit })
    await fillRequired(user)

    await user.click(submitButton())

    expect(await screen.findByText('must not be blank')).toBeInTheDocument()
    expect(screen.getByText('must be a well-formed email address')).toBeInTheDocument()
  })

  it('shows a general banner for errors that are not tied to a field', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('Cannot reach the server. Is the backend running?', 0))
    const { user } = setup({ onSubmit })
    await fillRequired(user)

    await user.click(submitButton())

    expect(await screen.findByText('Cannot reach the server. Is the backend running?')).toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })
})

describe('CandidateFormModal: closing', () => {
  it('closes on Escape', async () => {
    const { onClose, user } = setup()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes with the Cancel button', async () => {
    const { onClose, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes with the X button', async () => {
    const { onClose, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('CandidateFormModal: edit mode', () => {
  it('is prefilled from the candidate', () => {
    setup({ candidate: makeCandidate({ phone: null, status: 'INTERVIEWING', experienceYears: 7 }) })

    expect(screen.getByRole('heading', { name: 'Edit candidate' })).toBeInTheDocument()
    expect(field.firstName()).toHaveValue('Asha')
    expect(field.lastName()).toHaveValue('Rao')
    expect(field.email()).toHaveValue('asha.rao@acme.com')
    expect(field.phone()).toHaveValue('')
    expect(field.company()).toHaveValue('Acme Corp')
    expect(field.location()).toHaveValue('Bengaluru')
    expect(field.experience()).toHaveValue(7)
    expect(field.status()).toHaveValue('INTERVIEWING')
    expect(screen.getByText('Java')).toBeInTheDocument()
    expect(screen.getByText('Spring')).toBeInTheDocument()
    expect(submitButton('Save changes')).toBeInTheDocument()
  })

  it('submits the edited values', async () => {
    const { onSubmit, user } = setup({ candidate: makeCandidate() })
    await user.clear(field.lastName())
    await user.type(field.lastName(), 'Menon')
    await user.click(screen.getByRole('button', { name: 'Remove Spring' }))

    await user.click(submitButton('Save changes'))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Asha', lastName: 'Menon', skills: ['Java'], status: 'NEW', experienceYears: 3 }),
    )
  })
})
