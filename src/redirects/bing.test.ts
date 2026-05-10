import { describe, expect, it } from 'bun:test'
import { extractBingRedirect } from './bing.js'

describe('extractBingRedirect', () => {
  it('should extract target from u param with a1 prefix', () => {
    const url = new URL('https://www.bing.com/ck/a?!&&u=a1aHR0cHM6Ly9leGFtcGxlLmNvbS9wYWdl')

    expect(extractBingRedirect(url)).toBe('https://example.com/page')
  })

  it('should extract target from u param with a2 prefix', () => {
    const url = new URL('https://www.bing.com/ck/a?u=a2aHR0cHM6Ly9leGFtcGxlLmNvbS9wYWdl')

    expect(extractBingRedirect(url)).toBe('https://example.com/page')
  })

  it('should accept cn.bing.com host', () => {
    const url = new URL('https://cn.bing.com/ck/a?u=a1aHR0cHM6Ly9leGFtcGxlLmNvbS9wYWdl')

    expect(extractBingRedirect(url)).toBe('https://example.com/page')
  })

  it('should accept bing.com without www subdomain', () => {
    const url = new URL('https://bing.com/ck/a?u=a1aHR0cHM6Ly9leGFtcGxlLmNvbS9wYWdl')

    expect(extractBingRedirect(url)).toBe('https://example.com/page')
  })

  it('should return null when prefix is missing', () => {
    const url = new URL('https://www.bing.com/ck/a?u=aHR0cHM6Ly9leGFtcGxlLmNvbS9wYWdl')

    expect(extractBingRedirect(url)).toBeUndefined()
  })

  it('should return null when decoded value is not http(s)', () => {
    const url = new URL('https://www.bing.com/ck/a?u=a1bm90LWEtdXJs')

    expect(extractBingRedirect(url)).toBeUndefined()
  })

  it('should return null when u param is missing', () => {
    const url = new URL('https://www.bing.com/ck/a?other=value')

    expect(extractBingRedirect(url)).toBeUndefined()
  })

  it('should return null for non-/ck/a paths', () => {
    const url = new URL('https://www.bing.com/search?q=test')

    expect(extractBingRedirect(url)).toBeUndefined()
  })

  it('should return null for non-Bing hosts', () => {
    const url = new URL('https://example.com/ck/a?u=a1aHR0cHM6Ly9leGFtcGxlLmNvbS9wYWdl')

    expect(extractBingRedirect(url)).toBeUndefined()
  })
})
