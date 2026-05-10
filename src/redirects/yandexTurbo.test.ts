import { describe, expect, it } from 'bun:test'
import { extractYandexTurbo } from './yandexTurbo.js'

describe('extractYandexTurbo', () => {
  it('should reconstruct source URL from subdomain and path', () => {
    const url = new URL('https://example-com.turbopages.org/example.com/s/article/2024/01/hello')

    expect(extractYandexTurbo(url)).toBe('https://example.com/article/2024/01/hello')
  })

  it('should restore dotted source hosts from dashed subdomains', () => {
    const url = new URL('https://news-example-com.turbopages.org/news.example.com/s/path')

    expect(extractYandexTurbo(url)).toBe('https://news.example.com/path')
  })

  it('should return null when path lacks the /s/ marker', () => {
    const url = new URL('https://example-com.turbopages.org/example.com/no-marker/path')

    expect(extractYandexTurbo(url)).toBeUndefined()
  })

  it('should return null for non-turbopages hosts', () => {
    const url = new URL('https://example.com/host/s/path')

    expect(extractYandexTurbo(url)).toBeUndefined()
  })
})
