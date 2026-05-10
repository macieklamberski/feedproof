import { describe, expect, it } from 'bun:test'
import { extractJuejin } from './juejin.js'

describe('extractJuejin', () => {
  it('should extract target from target param', () => {
    const url = new URL('https://link.juejin.cn/?target=https%3A%2F%2Fexample.com%2Fpost')

    expect(extractJuejin(url)).toBe('https://example.com/post')
  })

  it('should return null when target param is missing', () => {
    const url = new URL('https://link.juejin.cn/?other=value')

    expect(extractJuejin(url)).toBeUndefined()
  })

  it('should return null for non-Juejin hosts', () => {
    const url = new URL('https://example.com/?target=https%3A%2F%2Fother.com')

    expect(extractJuejin(url)).toBeUndefined()
  })
})
