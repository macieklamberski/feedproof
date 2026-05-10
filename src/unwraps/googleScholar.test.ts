import { describe, expect, it } from 'bun:test'
import { unwrapGoogleScholarUrl } from './googleScholar.js'

describe('unwrapGoogleScholarUrl', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://scholar.google.com/scholar_url?url=https%3A%2F%2Fcite.com%2Fpaper.pdf&hl=en',
    )

    expect(unwrapGoogleScholarUrl(url)).toBe('https://cite.com/paper.pdf')
  })

  it('should extract target from scholar.google.de host', () => {
    const url = new URL(
      'https://scholar.google.de/scholar_url?url=https%3A%2F%2Fcite.com%2Fpaper.pdf',
    )

    expect(unwrapGoogleScholarUrl(url)).toBe('https://cite.com/paper.pdf')
  })

  it('should extract target from scholar.google.co.uk host', () => {
    const url = new URL(
      'https://scholar.google.co.uk/scholar_url?url=https%3A%2F%2Fcite.com%2Fpaper.pdf',
    )

    expect(unwrapGoogleScholarUrl(url)).toBe('https://cite.com/paper.pdf')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://scholar.google.com/scholar_url?hl=en')

    expect(unwrapGoogleScholarUrl(url)).toBeUndefined()
  })

  it('should return null for non-/scholar_url paths', () => {
    const url = new URL('https://scholar.google.com/scholar?q=test')

    expect(unwrapGoogleScholarUrl(url)).toBeUndefined()
  })

  it('should return null for non-Scholar hosts', () => {
    const url = new URL('https://www.google.com/scholar_url?url=https%3A%2F%2Fcite.com%2Fpaper.pdf')

    expect(unwrapGoogleScholarUrl(url)).toBeUndefined()
  })
})
