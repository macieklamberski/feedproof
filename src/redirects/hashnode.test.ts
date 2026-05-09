import { describe, expect, it } from 'bun:test'
import { extractHashnode } from './hashnode.js'

describe('extractHashnode', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://hashnode.com/util/redirect?url=https%3A%2F%2Fexample.com%2Farticle',
    )

    expect(extractHashnode(url)).toBe('https://example.com/article')
  })

  it('should return null for non-redirect Hashnode URLs', () => {
    const url = new URL('https://hashnode.com/community')

    expect(extractHashnode(url)).toBeUndefined()
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://hashnode.com/util/redirect')

    expect(extractHashnode(url)).toBeUndefined()
  })

  it('should return null for non-Hashnode hosts', () => {
    const url = new URL('https://example.com/util/redirect?url=https%3A%2F%2Fother.com')

    expect(extractHashnode(url)).toBeUndefined()
  })
})
