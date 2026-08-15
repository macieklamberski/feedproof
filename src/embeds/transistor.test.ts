import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractTransistorEmbed, transistorResolveEmbed } from './transistor.js'

describe('extractTransistorEmbed', () => {
  it('should read an episode embed', () => {
    const value = 'https://share.transistor.fm/e/a1b2c3d4'
    const expected = {
      kind: 'e',
      id: 'a1b2c3d4',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  it('should read an episode embed carrying display options', () => {
    const value = 'https://share.transistor.fm/e/a1b2c3d4/dark'
    const expected = {
      kind: 'e',
      id: 'a1b2c3d4',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  it('should read a show playlist', () => {
    const value = 'https://share.transistor.fm/s/9f8e7d6c'
    const expected = {
      kind: 's',
      id: '9f8e7d6c',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  // Real Transistor examples. Dropping the mode segment would mint `/e/{slug}`, which asks for
  // an episode by a show's name and answers 404.
  it('should read a show latest player as its own subject', () => {
    const value = 'https://share.transistor.fm/e/megamaker/latest'
    const expected = {
      kind: 'latest',
      id: 'megamaker',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  it('should read a show playlist player as its own subject', () => {
    const value = 'https://share.transistor.fm/e/megamaker/playlist'
    const expected = {
      kind: 'playlist',
      id: 'megamaker',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  // A show slug is the publisher's own words, so it hyphenates where an episode id never does.
  it('should read a hyphenated show slug', () => {
    const value = 'https://share.transistor.fm/e/build-your-saas/latest'
    const expected = {
      kind: 'latest',
      id: 'build-your-saas',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a transistor url naming nothing', () => {
    const value = 'https://share.transistor.fm/pricing'

    expect(extractTransistorEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractTransistorEmbed(value)).toBeUndefined()
  })
})

describe('transistorResolveEmbed', () => {
  // 180 across 49 of 49 sampled corpus iframes, and their oEmbed agrees.
  it('should size an episode at the fixed height', () => {
    const value = 'https://share.transistor.fm/e/a1b2c3d4/dark'
    const expected: EmbedResolverResult = {
      provider: 'transistor',
      id: 'episode/a1b2c3d4',
      src: 'https://share.transistor.fm/e/a1b2c3d4',
      height: 180,
    }

    expect(transistorResolveEmbed(value)).toEqual(expected)
  })

  it('should size a show playlist taller', () => {
    const value = 'https://share.transistor.fm/s/9f8e7d6c'
    const expected: EmbedResolverResult = {
      provider: 'transistor',
      id: 'show/9f8e7d6c',
      src: 'https://share.transistor.fm/s/9f8e7d6c',
      height: 390,
    }

    expect(transistorResolveEmbed(value)).toEqual(expected)
  })

  it('should keep the mode segment a show player needs', () => {
    const value = 'https://share.transistor.fm/e/megamaker/latest'
    const expected: EmbedResolverResult = {
      provider: 'transistor',
      id: 'latest/megamaker',
      src: 'https://share.transistor.fm/e/megamaker/latest',
      height: 180,
    }

    expect(transistorResolveEmbed(value)).toEqual(expected)
  })

  // The whole show rather than one episode, so it takes the taller player.
  it('should size a show playlist player taller', () => {
    const value = 'https://share.transistor.fm/e/build-your-saas/playlist'
    const expected: EmbedResolverResult = {
      provider: 'transistor',
      id: 'playlist/build-your-saas',
      src: 'https://share.transistor.fm/e/build-your-saas/playlist',
      height: 390,
    }

    expect(transistorResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a transistor url naming no episode', () => {
    const value = 'https://share.transistor.fm/about'

    expect(transistorResolveEmbed(value)).toBeUndefined()
  })
})
