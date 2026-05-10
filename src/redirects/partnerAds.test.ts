import { describe, expect, it } from 'bun:test'
import { extractPartnerAds } from './partnerAds.js'

describe('extractPartnerAds', () => {
  it('should extract target from htmlurl param', () => {
    const url = new URL(
      'https://www.partner-ads.com/?htmlurl=https%3A%2F%2Fexample.com%2Fdeal',
    )

    expect(extractPartnerAds(url)).toBe('https://example.com/deal')
  })

  it('should return null when htmlurl param is missing', () => {
    const url = new URL('https://www.partner-ads.com/?other=value')

    expect(extractPartnerAds(url)).toBeUndefined()
  })

  it('should return null for non-partner-ads hosts', () => {
    const url = new URL('https://example.com/?htmlurl=https%3A%2F%2Fother.com')

    expect(extractPartnerAds(url)).toBeUndefined()
  })
})
