import { describe, expect, it } from 'bun:test'
import { unwrapDuckduckgoUrl } from './duckduckgo.js'

describe('unwrapDuckduckgoUrl', () => {
  it('should extract target from uddg param', () => {
    const url = new URL('https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage')

    expect(unwrapDuckduckgoUrl(url)).toBe('https://example.com/page')
  })

  it('should return null when uddg param is missing', () => {
    const url = new URL('https://duckduckgo.com/l/?other=value')

    expect(unwrapDuckduckgoUrl(url)).toBeUndefined()
  })

  it('should return null for paths other than /l/', () => {
    const url = new URL('https://duckduckgo.com/?uddg=https%3A%2F%2Fexample.com')

    expect(unwrapDuckduckgoUrl(url)).toBeUndefined()
  })

  it('should return null for non-DuckDuckGo hosts', () => {
    const url = new URL('https://example.com/l/?uddg=https%3A%2F%2Fother.com')

    expect(unwrapDuckduckgoUrl(url)).toBeUndefined()
  })
})
