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

  it('should return undefined for a transistor url naming no episode', () => {
    const value = 'https://share.transistor.fm/about'

    expect(transistorResolveEmbed(value)).toBeUndefined()
  })
})
