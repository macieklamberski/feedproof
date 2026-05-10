import { describe, expect, it } from 'bun:test'
import { extractSkimlinks } from './skimlinks.js'

describe('extractSkimlinks', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://go.skimresources.com/?id=12345&xs=1&url=https%3A%2F%2Fexample.com%2Fproduct',
    )

    expect(extractSkimlinks(url)).toBe('https://example.com/product')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://go.skimresources.com/?id=12345&xs=1')

    expect(extractSkimlinks(url)).toBeUndefined()
  })

  it('should return null for non-Skimlinks hosts', () => {
    const url = new URL('https://example.com/?url=https%3A%2F%2Fother.com')

    expect(extractSkimlinks(url)).toBeUndefined()
  })
})
