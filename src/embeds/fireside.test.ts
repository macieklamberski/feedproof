import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractFiresideToken, firesideResolveEmbed } from './fireside.js'

describe('extractFiresideToken', () => {
  it('should read the show and episode token', () => {
    const value = 'https://fireside.fm/player/v2/DiNRb69N+Dagp3z15'
    const expected = { version: 'v2', token: 'DiNRb69N+Dagp3z15' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  it('should read a token whose plus arrived percent-encoded', () => {
    const value = 'https://fireside.fm/player/v2/o5sVQfzy%2BKzqauAdJ'
    const expected = { version: 'v2', token: 'o5sVQfzy+KzqauAdJ' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  // The player host omits the `player` segment, and it is what the platform's embed code writes.
  it('should read a token straight off the player host', () => {
    const value = 'https://player.fireside.fm/v3/N8LaNbQY+MI2PkJ2g'
    const expected = { version: 'v3', token: 'N8LaNbQY+MI2PkJ2g' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  it('should read the third player version on the feed-side host', () => {
    const value = 'https://fireside.fm/player/v3/N8LaNbQY+MI2PkJ2g'
    const expected = { version: 'v3', token: 'N8LaNbQY+MI2PkJ2g' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  // Both halves are base64url, so three of five tokens read off live shows carry `-` or `_`.
  it('should read a token carrying base64url punctuation', () => {
    const value = 'https://player.fireside.fm/v3/I-2by1pi+kf-gXAOz'
    const expected = { version: 'v3', token: 'I-2by1pi+kf-gXAOz' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  it('should read a token ending in an underscore', () => {
    const value = 'https://player.fireside.fm/v3/nj9oaFbU+BY9LAva_'
    const expected = { version: 'v3', token: 'nj9oaFbU+BY9LAva_' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  // The retired share route names the token and no version, so it takes the current player.
  it('should read a token off the share route', () => {
    const value = 'https://fireside.fm/s/aHx_iT3N+3W9-AW7P/iframe'
    const expected = { version: 'v3', token: 'aHx_iT3N+3W9-AW7P' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  it('should return undefined for a share route naming no token', () => {
    const value = 'https://fireside.fm/s'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a player version it does not know', () => {
    const value = 'https://player.fireside.fm/v9/DiNRb69N+Dagp3z15'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a fireside url that is not a player', () => {
    const value = 'https://fireside.fm/podcasts'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a token of the wrong shape', () => {
    const value = 'https://fireside.fm/player/v2/onlyoneside'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a player url naming a version and no token', () => {
    const value = 'https://fireside.fm/player/v3'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a token holding a malformed percent escape', () => {
    const value = 'https://fireside.fm/player/v3/%'

    expect(extractFiresideToken(value)).toBeUndefined()
  })
})

describe('firesideResolveEmbed', () => {
  // Sampled at 200 in 28 of 28 corpus iframes, which is the whole reason this resolver exists.
  it('should state the fixed player height', () => {
    const value = 'https://fireside.fm/player/v2/DiNRb69N+Dagp3z15'
    const expected: EmbedResolverResult = {
      provider: 'fireside',
      id: 'DiNRb69N+Dagp3z15',
      src: 'https://player.fireside.fm/v2/DiNRb69N+Dagp3z15',
      height: 200,
    }

    expect(firesideResolveEmbed(value)).toEqual(expected)
  })

  // v3 is what the platform writes today, so a publisher on it is not sent back to v2.
  it('should keep the player version the source states', () => {
    const value = 'https://player.fireside.fm/v3/I-2by1pi+kf-gXAOz'
    const expected: EmbedResolverResult = {
      provider: 'fireside',
      id: 'I-2by1pi+kf-gXAOz',
      src: 'https://player.fireside.fm/v3/I-2by1pi+kf-gXAOz',
      height: 200,
    }

    expect(firesideResolveEmbed(value)).toEqual(expected)
  })

  // The route 302s to a page that 404s, while the same token plays on the versioned player.
  it('should send a share route url to the current player', () => {
    const value = 'https://fireside.fm/s/aHx_iT3N+3W9-AW7P/iframe'
    const expected: EmbedResolverResult = {
      provider: 'fireside',
      id: 'aHx_iT3N+3W9-AW7P',
      src: 'https://player.fireside.fm/v3/aHx_iT3N+3W9-AW7P',
      height: 200,
    }

    expect(firesideResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a fireside url naming no episode', () => {
    const value = 'https://fireside.fm/pricing'

    expect(firesideResolveEmbed(value)).toBeUndefined()
  })
})
