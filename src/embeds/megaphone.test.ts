import { describe, expect, it } from 'bun:test'
import { extractMegaphoneEmbed, megaphoneResolveEmbed } from './megaphone.js'

describe('extractMegaphoneEmbed', () => {
  it('should read an episode embed', () => {
    expect(extractMegaphoneEmbed('https://playlist.megaphone.fm?e=AUDD4761726018')).toMatchObject({
      kind: 'episode',
      id: 'AUDD4761726018',
      height: 200,
    })
  })

  it('should read a playlist embed', () => {
    const value = 'https://playlist.megaphone.fm/?p=NSM7546490835&light=true'

    expect(extractMegaphoneEmbed(value)).toMatchObject({ kind: 'playlist', height: 480 })
  })

  it('should return undefined when nothing is named', () => {
    expect(extractMegaphoneEmbed('https://playlist.megaphone.fm/?light=true')).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(extractMegaphoneEmbed('https://[')).toBeUndefined()
  })
})

describe('megaphoneResolveEmbed', () => {
  it('should size an episode at the episode height', () => {
    expect(megaphoneResolveEmbed('https://playlist.megaphone.fm?e=AUDD4761726018')).toEqual({
      provider: 'megaphone',
      id: 'episode/AUDD4761726018',
      src: 'https://playlist.megaphone.fm/?e=AUDD4761726018',
      height: 200,
    })
  })

  // A playlist squeezed into the episode height is the visible failure this separation avoids.
  it('should size a playlist at the taller height', () => {
    expect(megaphoneResolveEmbed('https://playlist.megaphone.fm/?p=NSM7546490835')).toMatchObject({
      id: 'playlist/NSM7546490835',
      height: 480,
    })
  })

  it('should return undefined for a megaphone url naming no episode', () => {
    expect(megaphoneResolveEmbed('https://playlist.megaphone.fm/?x=ABC123')).toBeUndefined()
  })
})
