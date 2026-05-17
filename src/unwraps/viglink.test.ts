import { describe, expect, it } from 'bun:test'
import { unwrapViglink } from './viglink.js'

describe('unwrapViglink', () => {
  it('should extract target from u param', () => {
    const url = new URL(
      'https://redirect.viglink.com/?key=abc&u=https%3A%2F%2Fexample.com%2Fproduct',
    )

    expect(unwrapViglink(url)).toBe('https://example.com/product')
  })

  it('should return null when u param is missing', () => {
    const url = new URL('https://redirect.viglink.com/?key=abc')

    expect(unwrapViglink(url)).toBeUndefined()
  })

  it('should return null for non-VigLink hosts', () => {
    const url = new URL('https://example.com/?u=https%3A%2F%2Fother.com')

    expect(unwrapViglink(url)).toBeUndefined()
  })
})
