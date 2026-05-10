import { describe, expect, it } from 'bun:test'
import { extractMailpgn } from './mailpgn.js'

describe('extractMailpgn', () => {
  it('should extract target from fl param', () => {
    const url = new URL('https://t.mailpgn.com/l/?fl=https%3A%2F%2Fexample.com%2Fcampaign')

    expect(extractMailpgn(url)).toBe('https://example.com/campaign')
  })

  it('should return null when fl param is missing', () => {
    const url = new URL('https://t.mailpgn.com/l/?other=value')

    expect(extractMailpgn(url)).toBeUndefined()
  })

  it('should return null for non-mailpgn hosts', () => {
    const url = new URL('https://example.com/l/?fl=https%3A%2F%2Fother.com')

    expect(extractMailpgn(url)).toBeUndefined()
  })
})
