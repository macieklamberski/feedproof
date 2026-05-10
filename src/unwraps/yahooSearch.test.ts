import { describe, expect, it } from 'bun:test'
import { unwrapYahooSearchUrl } from './yahooSearch.js'

describe('unwrapYahooSearchUrl', () => {
  it('should extract target from RU path segment', () => {
    const url = new URL(
      'https://r.search.yahoo.com/_ylt=AAA/SIG=BBB/EXP=CCC/RU=https%3A%2F%2Fexample.com%2Farticle/RK=2/RS=DDD-',
    )

    expect(unwrapYahooSearchUrl(url)).toBe('https://example.com/article')
  })

  it('should return null for paths without RU= segment', () => {
    const url = new URL('https://r.search.yahoo.com/search?p=test')

    expect(unwrapYahooSearchUrl(url)).toBeUndefined()
  })

  it('should return null when RK= terminator is missing', () => {
    const url = new URL('https://r.search.yahoo.com/_ylt=AAA/RU=https%3A%2F%2Fexample.com')

    expect(unwrapYahooSearchUrl(url)).toBeUndefined()
  })

  it('should return null for non-Yahoo hosts', () => {
    const url = new URL(
      'https://example.com/_ylt=AAA/RU=https%3A%2F%2Fexample.com%2Fpage/RK=0/RS=BBB-',
    )

    expect(unwrapYahooSearchUrl(url)).toBeUndefined()
  })
})
