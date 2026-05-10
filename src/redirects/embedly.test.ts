import { describe, expect, it } from 'bun:test'
import { extractEmbedly } from './embedly.js'

describe('extractEmbedly', () => {
  it('should extract target from cdn.embedly.com src param', () => {
    const url = new URL(
      'https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fexample.com%2Fembed',
    )

    expect(extractEmbedly(url)).toBe('https://example.com/embed')
  })

  it('should extract target from embed.ly src param', () => {
    const url = new URL('https://embed.ly/iframe?src=https%3A%2F%2Fexample.com%2Fvideo')

    expect(extractEmbedly(url)).toBe('https://example.com/video')
  })

  it('should return null when src param is missing', () => {
    const url = new URL('https://cdn.embedly.com/widgets/media.html?other=value')

    expect(extractEmbedly(url)).toBeUndefined()
  })

  it('should return null for non-Embedly hosts', () => {
    const url = new URL('https://example.com/widgets/media.html?src=https%3A%2F%2Fother.com')

    expect(extractEmbedly(url)).toBeUndefined()
  })
})
