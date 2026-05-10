import { describe, expect, it } from 'bun:test'
import { extractMailtrack } from './mailtrack.js'

describe('extractMailtrack', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://mailtrack.io/?url=https%3A%2F%2Fexample.com%2Fpage')

    expect(extractMailtrack(url)).toBe('https://example.com/page')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://mailtrack.io/?other=value')

    expect(extractMailtrack(url)).toBeUndefined()
  })

  it('should return null for non-Mailtrack hosts', () => {
    const url = new URL('https://example.com/?url=https%3A%2F%2Fother.com')

    expect(extractMailtrack(url)).toBeUndefined()
  })
})
