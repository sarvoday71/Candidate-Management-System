import { describe, expect, it } from 'vitest'
import { formatDate, fullName, gradientFor, initials, years } from './format'

describe('formatDate', () => {
  it('formats an ISO timestamp as day, short month, year', () => {
    expect(formatDate('2026-11-14T12:00:00')).toBe('14 Nov 2026')
  })

  it('treats a timestamp without a zone as UTC (the API sends UTC without a suffix)', () => {
    const withoutZone = formatDate('2026-11-14T23:30:00')
    const explicitUtc = formatDate('2026-11-14T23:30:00Z')
    expect(withoutZone).toBe(explicitUtc)
  })

  it('respects an explicit offset', () => {
    // 2026-11-14T23:30 at +14:00 is 09:30 UTC on the same day, so every timezone prints the 14th.
    expect(formatDate('2026-11-14T23:30:00+14:00')).toBe(formatDate('2026-11-14T09:30:00Z'))
  })

  it('shows a dash for missing values', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
})

describe('names', () => {
  it('builds the full name', () => {
    expect(fullName({ firstName: 'Asha', lastName: 'Rao' })).toBe('Asha Rao')
  })

  it('builds upper-case initials', () => {
    expect(initials({ firstName: 'asha', lastName: 'rao' })).toBe('AR')
  })

  it('does not crash on missing names', () => {
    expect(initials({ firstName: '', lastName: 'Rao' })).toBe('R')
    expect(initials({})).toBe('')
  })
})

describe('years', () => {
  it('uses the singular for exactly one year', () => {
    expect(years(1)).toBe('1 yr')
  })

  it('uses the plural otherwise, including zero', () => {
    expect(years(0)).toBe('0 yrs')
    expect(years(6)).toBe('6 yrs')
  })

  it('treats a missing value as zero', () => {
    expect(years(undefined)).toBe('0 yrs')
    expect(years(null)).toBe('0 yrs')
  })
})

describe('gradientFor', () => {
  it('returns the same gradient for the same id', () => {
    expect(gradientFor(42)).toBe(gradientFor(42))
  })

  it('always returns a gradient class, even for odd ids', () => {
    for (const id of [0, 1, 7, 100, 12345, -3, '8', undefined, null, 'abc']) {
      expect(gradientFor(id)).toMatch(/^from-\S+ to-\S+$/)
    }
  })

  it('rotates through several different gradients', () => {
    const distinct = new Set(Array.from({ length: 20 }, (_, id) => gradientFor(id)))
    expect(distinct.size).toBeGreaterThan(3)
  })
})
