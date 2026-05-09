import { describe, expect, it } from 'bun:test'
import { extractAwin } from './awin.js'

describe('extractAwin', () => {
  it('should extract target from ued param', () => {
    const url = new URL(
      'https://www.awin1.com/cread.php?awinmid=1234&awinaffid=5678&ued=https%3A%2F%2Fexample.com%2Fproduct',
    )

    expect(extractAwin(url)).toBe('https://example.com/product')
  })

  it('should fall back to p param when ued is missing', () => {
    const url = new URL(
      'https://www.awin1.com/cread.php?awinmid=1234&p=https%3A%2F%2Fexample.com%2Fother',
    )

    expect(extractAwin(url)).toBe('https://example.com/other')
  })

  it('should return null when both ued and p are missing', () => {
    const url = new URL('https://www.awin1.com/cread.php?awinmid=1234&awinaffid=5678')

    expect(extractAwin(url)).toBeNull()
  })

  it('should return null for non-Awin hosts', () => {
    const url = new URL('https://example.com/cread.php?ued=https%3A%2F%2Fother.com')

    expect(extractAwin(url)).toBeNull()
  })
})
