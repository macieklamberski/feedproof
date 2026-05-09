import { describe, expect, it } from 'bun:test'
import { extractGateSc } from './gateSc.js'

describe('extractGateSc', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://gate.sc/?url=https%3A%2F%2Fexample.com%2Farticle')

    expect(extractGateSc(url)).toBe('https://example.com/article')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://gate.sc/?other=value')

    expect(extractGateSc(url)).toBeNull()
  })

  it('should return null for non-gate.sc hosts', () => {
    const url = new URL('https://example.com/?url=https%3A%2F%2Fother.com')

    expect(extractGateSc(url)).toBeNull()
  })
})
