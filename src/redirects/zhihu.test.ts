import { describe, expect, it } from 'bun:test'
import { extractZhihu } from './zhihu.js'

describe('extractZhihu', () => {
  it('should extract target from target param', () => {
    const url = new URL('https://link.zhihu.com/?target=https%3A%2F%2Fexample.com%2Farticle')

    expect(extractZhihu(url)).toBe('https://example.com/article')
  })

  it('should return null when target param is missing', () => {
    const url = new URL('https://link.zhihu.com/?other=value')

    expect(extractZhihu(url)).toBeNull()
  })

  it('should return null for non-Zhihu hosts', () => {
    const url = new URL('https://example.com/?target=https%3A%2F%2Fother.com')

    expect(extractZhihu(url)).toBeNull()
  })
})
