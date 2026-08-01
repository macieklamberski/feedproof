import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { jwplayerMediaResolver } from './jwplayer.js'

describeForEachParser('jwplayerMediaResolver', (parseHtml) => {
  const extract = (value: string): MediaResolverResult | undefined => {
    const element = parseHtml(value).querySelector(jwplayerMediaResolver.selector)

    return element ? (jwplayerMediaResolver.extract(element) as MediaResolverResult) : undefined
  }

  it('should build the mp4 url from the player script', () => {
    const value = '<script src="https://cdn.jwplayer.com/players/yx0qKI9z-TVAGoXhx.js"></script>'
    const expected: MediaResolverResult = {
      tag: 'video',
      src: 'https://cdn.jwplayer.com/videos/yx0qKI9z.mp4',
    }

    expect(extract(value)).toEqual(expected)
  })

  describe('edge cases', () => {
    // The iframe form is a working player page and belongs to the embed resolver.
    it('should not match the iframe form', () => {
      const value =
        '<iframe src="https://cdn.jwplayer.com/players/8AVn298Z-rRIqH6G6.html"></iframe>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value =
        '<script src="https://cdn.jwplayer.com.evil.test/players/yx0qKI9z-TVAGoXhx.js"></script>'

      expect(extract(value)).toBeUndefined()
    })

    // Contains the selector substring in its path, so extract runs and the host check
    // has to be the thing that rejects it.
    it('should return undefined when the substring sits in a foreign path', () => {
      const value =
        '<script src="https://evil.test/jwplayer.com/players/yx0qKI9z-TVAGoXhx.js"></script>'

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined for an id that is not the shape JW emits', () => {
      const value = '<script src="https://cdn.jwplayer.com/players/libraries-x.js"></script>'

      expect(extract(value)).toBeUndefined()
    })
  })
})
