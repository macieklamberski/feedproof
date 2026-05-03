import { describe, expect, it } from 'bun:test'
import { parseFragment } from '../common.js'
import { spotifyEmbedHandler } from './spotify.js'

const firstMatch = (html: string): Element | undefined => {
  return parseFragment(html).querySelector(spotifyEmbedHandler.selector) ?? undefined
}

describe('spotifyEmbedHandler', () => {
  it('should extract metadata from open.spotify.com iframe', () => {
    const element = firstMatch('<iframe src="https://open.spotify.com/embed/track/abc"></iframe>')
    const result = element ? spotifyEmbedHandler.extract(element) : undefined

    expect(result).toEqual({
      provider: 'spotify',
      src: 'https://open.spotify.com/embed/track/abc',
      autoload: true,
      type: 'iframe',
    })
  })

  it('should return undefined for non-spotify iframes', () => {
    const element = firstMatch('<iframe src="https://example.com/audio"></iframe>')
    const result = element ? spotifyEmbedHandler.extract(element) : undefined

    expect(result).toBeUndefined()
  })

  it('should return undefined for malformed src', () => {
    const element = firstMatch('<iframe src="not-a-url"></iframe>')
    const result = element ? spotifyEmbedHandler.extract(element) : undefined

    expect(result).toBeUndefined()
  })
})
