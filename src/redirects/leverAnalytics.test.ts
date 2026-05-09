import { describe, expect, it } from 'bun:test'
import { extractLeverAnalytics } from './leverAnalytics.js'

describe('extractLeverAnalytics', () => {
  it('should extract target from dest param', () => {
    const url = new URL(
      'https://t.lever-analytics.com/email-link?dest=https%3A%2F%2Fexample.com%2Fjob',
    )

    expect(extractLeverAnalytics(url)).toBe('https://example.com/job')
  })

  it('should return null when dest param is missing', () => {
    const url = new URL('https://t.lever-analytics.com/email-link?other=value')

    expect(extractLeverAnalytics(url)).toBeUndefined()
  })

  it('should return null for non-Lever hosts', () => {
    const url = new URL('https://example.com/email-link?dest=https%3A%2F%2Fother.com')

    expect(extractLeverAnalytics(url)).toBeUndefined()
  })
})
