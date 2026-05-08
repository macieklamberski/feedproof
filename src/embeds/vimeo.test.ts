import { describe, expect, it } from 'bun:test'
import { parseFragment } from '../common.js'
import type { EmbedResolverResult } from '../types.js'
import { vimeoEmbedHandler } from './vimeo.js'

const firstMatch = (html: string): Element | undefined => {
  return parseFragment(html).querySelector(vimeoEmbedHandler.selector) ?? undefined
}

describe('vimeoEmbedHandler', () => {
  it('should extract metadata from player.vimeo.com iframe', () => {
    const element = firstMatch('<iframe src="https://player.vimeo.com/video/12345"></iframe>')
    const result = element ? vimeoEmbedHandler.extract(element) : undefined
    const expected: EmbedResolverResult = {
      provider: 'vimeo',
      src: 'https://player.vimeo.com/video/12345',
      type: 'iframe',
    }

    expect(result).toEqual(expected)
  })

  it('should return undefined for non-vimeo iframes', () => {
    const element = firstMatch('<iframe src="https://example.com/video"></iframe>')
    const result = element ? vimeoEmbedHandler.extract(element) : undefined

    expect(result).toBeUndefined()
  })
})
