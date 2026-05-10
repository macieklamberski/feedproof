import { describe, expect, it } from 'bun:test'
import { extractDuckduckgoRedirect } from './duckduckgo.js'

describe('extractDuckduckgoRedirect', () => {
  it('should extract target from uddg param', () => {
    const url = new URL('https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage')

    expect(extractDuckduckgoRedirect(url)).toBe('https://example.com/page')
  })

  it('should return null when uddg param is missing', () => {
    const url = new URL('https://duckduckgo.com/l/?other=value')

    expect(extractDuckduckgoRedirect(url)).toBeUndefined()
  })

  it('should return null for paths other than /l/', () => {
    const url = new URL('https://duckduckgo.com/?uddg=https%3A%2F%2Fexample.com')

    expect(extractDuckduckgoRedirect(url)).toBeUndefined()
  })

  it('should return null for non-DuckDuckGo hosts', () => {
    const url = new URL('https://example.com/l/?uddg=https%3A%2F%2Fother.com')

    expect(extractDuckduckgoRedirect(url)).toBeUndefined()
  })
})
