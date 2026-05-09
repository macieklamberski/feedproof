import { describe, expect, it } from 'bun:test'
import { extractMailchimp } from './mailchimp.js'

describe('extractMailchimp', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://list.mailchimp.com/mctx/clicks?url=https%3A%2F%2Fexample.com%2Farticle&xid=abc&uid=12345',
    )

    expect(extractMailchimp(url)).toBe('https://example.com/article')
  })

  it('should match other Mailchimp subdomains', () => {
    const url = new URL(
      'https://eepurl.mailchimp.com/mctx/clicks?url=https%3A%2F%2Fexample.com%2Fother',
    )

    expect(extractMailchimp(url)).toBe('https://example.com/other')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://list.mailchimp.com/mctx/clicks?xid=abc')

    expect(extractMailchimp(url)).toBeNull()
  })

  it('should return null for non-clicks paths', () => {
    const url = new URL('https://list.mailchimp.com/clicks?url=https%3A%2F%2Fexample.com')

    expect(extractMailchimp(url)).toBeNull()
  })

  it('should return null for non-Mailchimp hosts', () => {
    const url = new URL('https://example.com/mctx/clicks?url=https%3A%2F%2Fother.com')

    expect(extractMailchimp(url)).toBeNull()
  })
})
