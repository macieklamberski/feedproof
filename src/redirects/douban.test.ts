import { describe, expect, it } from 'bun:test'
import { extractDouban } from './douban.js'

describe('extractDouban', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://www.douban.com/link2/?url=https%3A%2F%2Fexample.com%2Farticle')

    expect(extractDouban(url)).toBe('https://example.com/article')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://www.douban.com/link2/?other=value')

    expect(extractDouban(url)).toBeNull()
  })

  it('should return null for non-link2 Douban paths', () => {
    const url = new URL('https://www.douban.com/group?url=https%3A%2F%2Fexample.com')

    expect(extractDouban(url)).toBeNull()
  })

  it('should return null for non-Douban hosts', () => {
    const url = new URL('https://example.com/link2/?url=https%3A%2F%2Fother.com')

    expect(extractDouban(url)).toBeNull()
  })
})
