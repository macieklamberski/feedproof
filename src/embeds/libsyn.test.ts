import { describe, expect, it } from 'bun:test'
import { extractLibsynEmbed, libsynResolveEmbed } from './libsyn.js'

describe('extractLibsynEmbed', () => {
  it('should read an episode id and its height from the path', () => {
    const value =
      'https://html5-player.libsyn.com/embed/episode/id/5508311/height/90/width/700/theme/custom/'

    expect(extractLibsynEmbed(value)).toEqual({ kind: 'episode', id: '5508311', height: 90 })
  })

  it('should read the modern player host', () => {
    const value =
      'https://play.libsyn.com/embed/episode/id/41612765/height/192/theme/modern/size/large/'

    expect(extractLibsynEmbed(value)).toEqual({ kind: 'episode', id: '41612765', height: 192 })
  })

  it('should read a show player', () => {
    expect(extractLibsynEmbed('https://play.libsyn.com/embed/show/id/12345/height/200/')).toEqual({
      kind: 'show',
      id: '12345',
      height: 200,
    })
  })

  it('should read an embed that states no height', () => {
    expect(extractLibsynEmbed('https://play.libsyn.com/embed/episode/id/5508311/')).toEqual({
      kind: 'episode',
      id: '5508311',
      height: undefined,
    })
  })

  it('should return undefined for a libsyn url that is not a player', () => {
    expect(extractLibsynEmbed('https://traffic.libsyn.com/show/episode.mp3')).toBeUndefined()
  })

  it('should return undefined for a non-numeric id', () => {
    expect(extractLibsynEmbed('https://play.libsyn.com/embed/episode/id/abc/')).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(extractLibsynEmbed('https://[')).toBeUndefined()
  })
})

describe('libsynResolveEmbed', () => {
  // The old host answers 500 for older episodes while play.libsyn.com serves them, so the
  // rebuilt src is a repair rather than a cosmetic rewrite.
  it('should mint the modern player host and carry the height', () => {
    const value = 'https://html5-player.libsyn.com/embed/episode/id/5508311/height/90/theme/custom/'
    const expected = {
      provider: 'libsyn',
      id: 'episode/5508311',
      src: 'https://play.libsyn.com/embed/episode/id/5508311/height/90/',
      height: 90,
    }

    expect(libsynResolveEmbed(value)).toEqual(expected)
  })

  it('should leave the height out when the player does not state one', () => {
    const result = libsynResolveEmbed('https://play.libsyn.com/embed/episode/id/5508311/')

    expect(result).toEqual({
      provider: 'libsyn',
      id: 'episode/5508311',
      src: 'https://play.libsyn.com/embed/episode/id/5508311/',
    })
  })

  it('should return undefined for a libsyn url naming no episode', () => {
    expect(libsynResolveEmbed('https://play.libsyn.com/about')).toBeUndefined()
  })
})
