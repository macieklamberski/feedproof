import { describe, expect, it } from 'bun:test'
import { extractRecruitics } from './recruitics.js'

describe('extractRecruitics', () => {
  it('should extract target from rx_url param', () => {
    const url = new URL(
      'https://jsv3.recruitics.com/redirect?rx_url=https%3A%2F%2Fexample.com%2Fjob',
    )

    expect(extractRecruitics(url)).toBe('https://example.com/job')
  })

  it('should return null when rx_url param is missing', () => {
    const url = new URL('https://jsv3.recruitics.com/redirect?other=value')

    expect(extractRecruitics(url)).toBeUndefined()
  })

  it('should return null for non-recruitics hosts', () => {
    const url = new URL('https://example.com/redirect?rx_url=https%3A%2F%2Fother.com')

    expect(extractRecruitics(url)).toBeUndefined()
  })
})
