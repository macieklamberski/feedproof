import { describe, expect, it } from 'bun:test'
import { extractJianshuGo } from './jianshuGo.js'

describe('extractJianshuGo', () => {
  it('should extract target from to param', () => {
    const url = new URL('https://links.jianshu.com/go?to=https%3A%2F%2Fexample.com%2Farticle')

    expect(extractJianshuGo(url)).toBe('https://example.com/article')
  })

  it('should return null when to param is missing', () => {
    const url = new URL('https://links.jianshu.com/go?other=value')

    expect(extractJianshuGo(url)).toBeNull()
  })

  it('should return null for non-go Jianshu paths', () => {
    const url = new URL('https://links.jianshu.com/redirect?to=https%3A%2F%2Fexample.com')

    expect(extractJianshuGo(url)).toBeNull()
  })

  it('should return null for non-Jianshu hosts', () => {
    const url = new URL('https://example.com/go?to=https%3A%2F%2Fother.com')

    expect(extractJianshuGo(url)).toBeNull()
  })
})
