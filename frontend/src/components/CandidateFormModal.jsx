import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { STATUSES } from '../lib/constants'
import { btnPrimary, btnSecondary, inputCls, inputErrorCls } from '../lib/ui'
import TagInput from './TagInput'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toForm(c) {
  return {
    firstName: c?.firstName ?? '',
    lastName: c?.lastName ?? '',
    email: c?.email ?? '',
    phone: c?.phone ?? '',
    currentCompany: c?.currentCompany ?? '',
    currentLocation: c?.currentLocation ?? '',
    experienceYears: c?.experienceYears ?? 0,
    status: c?.status ?? 'NEW',
    skills: c?.skills ?? [],
  }
}

function validate(f) {
  const errors = {}
  if (!f.firstName.trim()) errors.firstName = 'First name is required'
  if (!f.lastName.trim()) errors.lastName = 'Last name is required'
  if (!f.email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(f.email.trim())) errors.email = 'Enter a valid email address'
  if (f.experienceYears === '' || Number(f.experienceYears) < 0) errors.experienceYears = 'Must be 0 or more'
  return errors
}

function Field({ label, error, required, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}

export default function CandidateFormModal({ candidate, onClose, onSubmit }) {
  const editing = Boolean(candidate)
  const [form, setForm] = useState(() => toForm(candidate))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [saving, onClose])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const cls = (key) => `${inputCls} ${errors[key] ? inputErrorCls : ''}`

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await onSubmit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        currentCompany: form.currentCompany.trim() || null,
        currentLocation: form.currentLocation.trim() || null,
        experienceYears: Number(form.experienceYears),
        status: form.status,
        skills: form.skills,
      })
    } catch (err) {
      if (err.status === 409) setErrors({ email: err.message })
      else if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) setErrors(err.fieldErrors)
      else setFormError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <form
        onSubmit={submit}
        noValidate
        className="relative flex max-h-[95vh] w-full max-w-2xl animate-pop-in flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit candidate' : 'Add candidate'}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {editing ? 'Update the details below.' : 'Fill in the details to add someone to your pipeline.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="-mr-2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-5 overflow-y-auto px-6 py-6 sm:grid-cols-2">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:col-span-2">
              <AlertCircle className="size-4 shrink-0" />
              {formError}
            </div>
          )}
          <Field label="First name" required error={errors.firstName} htmlFor="firstName">
            <input id="firstName" className={cls('firstName')} value={form.firstName} onChange={set('firstName')} placeholder="Asha" autoFocus />
          </Field>
          <Field label="Last name" required error={errors.lastName} htmlFor="lastName">
            <input id="lastName" className={cls('lastName')} value={form.lastName} onChange={set('lastName')} placeholder="Rao" />
          </Field>
          <Field label="Email" required error={errors.email} htmlFor="email">
            <input id="email" type="email" className={cls('email')} value={form.email} onChange={set('email')} placeholder="asha@example.com" />
          </Field>
          <Field label="Phone" error={errors.phone} htmlFor="phone">
            <input id="phone" className={cls('phone')} value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Current company" htmlFor="currentCompany">
            <input id="currentCompany" className={cls('currentCompany')} value={form.currentCompany} onChange={set('currentCompany')} placeholder="Acme Corp" />
          </Field>
          <Field label="Current location" htmlFor="currentLocation">
            <input id="currentLocation" className={cls('currentLocation')} value={form.currentLocation} onChange={set('currentLocation')} placeholder="Bengaluru" />
          </Field>
          <Field label="Years of experience" error={errors.experienceYears} htmlFor="experienceYears">
            <input id="experienceYears" type="number" min="0" className={cls('experienceYears')} value={form.experienceYears} onChange={set('experienceYears')} />
          </Field>
          <Field label="Status" htmlFor="status">
            <select id="status" className={cls('status')} value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Skills" htmlFor="skills" className="sm:col-span-2">
            <TagInput id="skills" value={form.skills} onChange={(skills) => setForm((f) => ({ ...f, skills }))} placeholder="Type a skill and press Enter" />
            <p className="mt-1.5 text-xs text-slate-400">Press Enter or comma to add. Backspace removes the last one.</p>
          </Field>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:rounded-b-2xl">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? 'Save changes' : 'Add candidate'}
          </button>
        </div>
      </form>
    </div>
  )
}
