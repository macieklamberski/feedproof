import { describe, expect, it } from 'bun:test'
import { extractFacebookShim } from './facebook.js'

describe('extractFacebookShim', () => {
  it('should extract target from l.facebook.com', () => {
    const url = new URL('https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fpage')

    expect(extractFacebookShim(url)).toBe('https://example.com/page')
  })

  it('should extract target from lm.facebook.com', () => {
    const url = new URL('https://lm.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fpage')

    expect(extractFacebookShim(url)).toBe('https://example.com/page')
  })

  it('should return null for non-shim Facebook URLs', () => {
    const url = new URL('https://www.facebook.com/profile')

    expect(extractFacebookShim(url)).toBeNull()
  })

  it('should return null when u param is missing', () => {
    const url = new URL('https://l.facebook.com/l.php')

    expect(extractFacebookShim(url)).toBeNull()
  })

  it('should return null for non-Facebook hosts', () => {
    const url = new URL('https://example.com/l.php?u=https%3A%2F%2Fother.com')

    expect(extractFacebookShim(url)).toBeNull()
  })
})
