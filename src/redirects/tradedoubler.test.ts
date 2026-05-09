import { describe, expect, it } from 'bun:test'
import { extractTradedoubler } from './tradedoubler.js'

describe('extractTradedoubler', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://clk.tradedoubler.com/click?p=12345&a=67890&url=https%3A%2F%2Fexample.com%2Fproduct',
    )

    expect(extractTradedoubler(url)).toBe('https://example.com/product')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://clk.tradedoubler.com/click?p=12345&a=67890')

    expect(extractTradedoubler(url)).toBeNull()
  })

  it('should return null for non-click paths', () => {
    const url = new URL('https://clk.tradedoubler.com/redirect?url=https%3A%2F%2Fexample.com')

    expect(extractTradedoubler(url)).toBeNull()
  })

  it('should return null for non-Tradedoubler hosts', () => {
    const url = new URL('https://example.com/click?url=https%3A%2F%2Fother.com')

    expect(extractTradedoubler(url)).toBeNull()
  })
})
