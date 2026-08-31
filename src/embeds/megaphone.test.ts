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

  // The parameters on a media url belong to the publisher, not to Megaphone. NPR names its own
  // story in `e` and its programme in `p`, and reading either turns playable audio into a player
  // box for something else.
  it('should not read a publisher parameter off the episode audio', () => {
    const value = 'https://dcs.megaphone.fm/NPR9963319425.mp3?e=nx-s1-5501163&p=510310'

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  it('should not read a media url that names no parameter at all', () => {
    const value = 'https://dcs.megaphone.fm/NPR9963319425.mp3'

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  // An episode id is letters followed by exactly ten digits, so a bare number is not one.
  it('should not read a bare number as an episode id', () => {
    const value = 'https://playlist.megaphone.fm/?e=510310'

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  // The prefix is the publisher's own name, so it has no length anyone controls. Both of these
  // are real episodes, confirmed against Megaphone's oEmbed, and a cap at eleven refused them.
  it.each(['NEXOJORNALLTDA1003659364', 'ADSMOVILESPAASL1044003821'])(
    'should read an episode id with a long publisher prefix (%s)',
    (id) => {
      const value = `https://playlist.megaphone.fm/?e=${id}`
      const expected = { param: 'e', kind: 'episode', id, height: 200 }

      expect(extractMegaphoneEmbed(value)).toEqual(expected)
    },
  )

  // The digit run is the part the sample supports, so it stays exact.
  it('should not read an id whose digit run is not exactly ten', () => {
    const value = 'https://playlist.megaphone.fm/?e=GLT46534611423'

    expect(extractMegaphoneEmbed(value)).toBeUndefined()
  })

  // A playlist is named by a slug, which has no digit grammar to check.
  it('should read a playlist named by a slug', () => {
    const value = 'https://playlist.megaphone.fm/?p=sciencevs'
    const expected = {
      param: 'p',
      kind: 'playlist',
      id: 'sciencevs',
      height: 480,
    }

    expect(extractMegaphoneEmbed(value)).toEqual(expected)
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
