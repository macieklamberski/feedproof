import { describe, expect, it } from 'bun:test'
import { parseFragment } from '../common.js'
import type { EmbedResolverResult } from '../types.js'
import { soundcloudEmbedHandler } from './soundcloud.js'

const firstMatch = (html: string): Element | undefined => {
  return parseFragment(html).querySelector(soundcloudEmbedHandler.selector) ?? undefined
}

describe('soundcloudEmbedHandler', () => {
  it('should extract metadata from w.soundcloud.com iframe', () => {
    const element = firstMatch(
      '<iframe src="https://w.soundcloud.com/player/?url=tracks/123"></iframe>',
    )
    const result = element ? soundcloudEmbedHandler.extract(element) : undefined
    const expected: EmbedResolverResult = {
      provider: 'soundcloud',
      src: 'https://w.soundcloud.com/player/?url=tracks/123',
      autoload: true,
      type: 'iframe',
    }

    expect(result).toEqual(expected)
  })

  it('should return undefined for non-soundcloud iframes', () => {
    const element = firstMatch('<iframe src="https://example.com/audio"></iframe>')
    const result = element ? soundcloudEmbedHandler.extract(element) : undefined

    expect(result).toBeUndefined()
  })
})
