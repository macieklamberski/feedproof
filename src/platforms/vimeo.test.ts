import { describe, expect, it } from 'bun:test'
import { parseFragment } from '../common.js'
import { vimeoEmbedHandler } from './vimeo.js'

const firstMatch = (html: string): Element | undefined => {
  return parseFragment(html).querySelector(vimeoEmbedHandler.selector) ?? undefined
}

describe('vimeoEmbedHandler', () => {
  it('should extract metadata from player.vimeo.com iframe', () => {
    const element = firstMatch('<iframe src="https://player.vimeo.com/video/12345"></iframe>')
    const result = element ? vimeoEmbedHandler.extract(element) : undefined

    expect(result).toEqual({
      provider: 'vimeo',
      src: 'https://player.vimeo.com/video/12345',
      autoload: true,
      type: 'iframe',
    })
  })

  it('should return undefined for non-vimeo iframes', () => {
    const element = firstMatch('<iframe src="https://example.com/video"></iframe>')
    const result = element ? vimeoEmbedHandler.extract(element) : undefined

    expect(result).toBeUndefined()
  })

  it('should return undefined for malformed src', () => {
    const element = firstMatch('<iframe src="not-a-url"></iframe>')
    const result = element ? vimeoEmbedHandler.extract(element) : undefined

    expect(result).toBeUndefined()
  })

  it('should return undefined for iframe without src', () => {
    const element = firstMatch('<iframe></iframe>')

    expect(element).toBeUndefined()
  })
})
