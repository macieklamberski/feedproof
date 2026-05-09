import { describe, expect, it } from 'bun:test'
import { extractRedditOut } from './redditOut.js'

describe('extractRedditOut', () => {
  it('should extract target from url param', () => {
    const url = new URL('https://out.reddit.com/?url=https%3A%2F%2Fexample.com%2Farticle&token=abc')

    expect(extractRedditOut(url)).toBe('https://example.com/article')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://out.reddit.com/?token=abc')

    expect(extractRedditOut(url)).toBeNull()
  })

  it('should return null for non-Reddit hosts', () => {
    const url = new URL('https://example.com/?url=https%3A%2F%2Fother.com')

    expect(extractRedditOut(url)).toBeNull()
  })
})
