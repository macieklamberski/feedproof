import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractLibsynEmbed, libsynResolveEmbed } from './libsyn.js'

describe('extractLibsynEmbed', () => {
  it('should read an episode id and its height from the path', () => {
    const value =
      'https://html5-player.libsyn.com/embed/episode/id/5508311/height/90/width/700/theme/custom/'
    const expected = {
      kind: 'episode',
      id: '5508311',
      height: 90,
    }

    expect(extractLibsynEmbed(value)).toEqual(expected)
  })

  it('should read the modern player host', () => {
    const value =
      'https://play.libsyn.com/embed/episode/id/41612765/height/192/theme/modern/size/large/'
    const expected = {
      kind: 'episode',
      id: '41612765',
      height: 192,
    }

    expect(extractLibsynEmbed(value)).toEqual(expected)
  })

  it('should read a show player', () => {
    const value = 'https://play.libsyn.com/embed/show/id/12345/height/200/'
    const expected = {
      kind: 'show',
      id: '12345',
      height: 200,
    }

    expect(extractLibsynEmbed(value)).toEqual(expected)
  })

  it('should read an embed that states no height', () => {
    const value = 'https://play.libsyn.com/embed/episode/id/5508311/'
    const expected = {
      kind: 'episode',
      id: '5508311',
      height: undefined,
    }

    expect(extractLibsynEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a libsyn url that is not a player', () => {
    const value = 'https://traffic.libsyn.com/show/episode.mp3'

    expect(extractLibsynEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a non-numeric id', () => {
    const value = 'https://play.libsyn.com/embed/episode/id/abc/'

    expect(extractLibsynEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractLibsynEmbed(value)).toBeUndefined()
  })
})

describe('libsynResolveEmbed', () => {
  // The old host answers 500 for older episodes while play.libsyn.com serves them, so the
  // rebuilt src is a repair rather than a cosmetic rewrite.
  it('should mint the modern player host and carry the height', () => {
    const value = 'https://html5-player.libsyn.com/embed/episode/id/5508311/height/90/theme/custom/'
    const expected: EmbedResolverResult = {
      provider: 'libsyn',
      id: 'episode/5508311',
      src: 'https://play.libsyn.com/embed/episode/id/5508311/height/90/',
      height: 90,
    }

    expect(libsynResolveEmbed(value)).toEqual(expected)
  })

  it('should leave the height out when the player does not state one', () => {
    const value = 'https://play.libsyn.com/embed/episode/id/5508311/'
    const expected: EmbedResolverResult = {
      provider: 'libsyn',
      id: 'episode/5508311',
      src: 'https://play.libsyn.com/embed/episode/id/5508311/',
    }

    expect(libsynResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a libsyn url naming no episode', () => {
    const value = 'https://play.libsyn.com/about'

    expect(libsynResolveEmbed(value)).toBeUndefined()
  })
})
