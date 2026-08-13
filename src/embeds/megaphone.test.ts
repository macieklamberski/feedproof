import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractMegaphoneEmbed, megaphoneResolveEmbed } from './megaphone.js'

describe('extractMegaphoneEmbed', () => {
  it('should read an episode embed', () => {
    const value = 'https://playlist.megaphone.fm?e=AUDD4761726018'
    const expected = {
      param: 'e',
      kind: 'episode',
      id: 'AUDD4761726018',
      height: 200,
    }

    expect(extractMegaphoneEmbed(value)).toEqual(expected)
  })

  it('should read a playlist embed', () => {
    const value = 'https://playlist.megaphone.fm/?p=NSM7546490835&light=true'
    const expected = {
      param: 'p',
      kind: 'playlist',
      id: 'NSM7546490835',
      height: 480,
    }

    expect(extractMegaphoneEmbed(value)).toEqual(expected)
  })

  it('should return undefined when nothing is named', () => {
    const value = 'https://playlist.megaphone.fm/?light=true'

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })
})

describe('megaphoneResolveEmbed', () => {
  it('should size an episode at the episode height', () => {
    const value = 'https://playlist.megaphone.fm?e=AUDD4761726018'
    const expected: EmbedResolverResult = {
      provider: 'megaphone',
      id: 'episode/AUDD4761726018',
      src: 'https://playlist.megaphone.fm/?e=AUDD4761726018',
      height: 200,
    }

    expect(megaphoneResolveEmbed(value)).toEqual(expected)
  })

  // A playlist squeezed into the episode height is the visible failure this separation avoids.
  it('should size a playlist at the taller height', () => {
    const value = 'https://playlist.megaphone.fm/?p=NSM7546490835'
    const expected: EmbedResolverResult = {
      provider: 'megaphone',
      id: 'playlist/NSM7546490835',
      src: 'https://playlist.megaphone.fm/?p=NSM7546490835',
      height: 480,
    }

    expect(megaphoneResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a megaphone url naming no episode', () => {
    const value = 'https://playlist.megaphone.fm/?x=ABC123'

    expect(megaphoneResolveEmbed(value)).toBeUndefined()
  })
})
