import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractPodbeanId, podbeanResolveEmbed } from './podbean.js'

describe('extractPodbeanId', () => {
  it('should read the id from the legacy player path', () => {
    const value = 'https://www.podbean.com/media/player/yx4hr-f3d1e1?from=pb6admin&download=1'
    const expected = 'yx4hr-f3d1e1'

    expect(extractPodbeanId(value)).toBe(expected)
  })

  it('should read the id from the v2 player query', () => {
    const value = 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&share=1&fonts=Arial'
    const expected = 'wyvke-1aefb6c-pb'

    expect(extractPodbeanId(value)).toBe(expected)
  })

  it('should return undefined for a podbean url naming no episode', () => {
    const value = 'https://www.podbean.com/pricing'

    expect(extractPodbeanId(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractPodbeanId(value)).toBeUndefined()
  })
})

describe('podbeanResolveEmbed', () => {
  // The legacy url 301s to the v2 player, so minting it repairs the embed and saves a redirect.
  it('should rewrite the legacy player to the v2 form', () => {
    const value = 'https://www.podbean.com/media/player/yx4hr-f3d1e1?from=pb6admin'
    const expected: EmbedResolverResult = {
      provider: 'podbean',
      id: 'yx4hr-f3d1e1',
      src: 'https://www.podbean.com/player-v2/?i=yx4hr-f3d1e1',
      height: 150,
    }

    expect(podbeanResolveEmbed(value)).toEqual(expected)
  })

  it('should keep a v2 id as written', () => {
    const value = 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&skin=3'
    const expected: EmbedResolverResult = {
      provider: 'podbean',
      id: 'wyvke-1aefb6c-pb',
      src: 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb',
      height: 150,
    }

    expect(podbeanResolveEmbed(value)).toEqual(expected)
  })

  it('should prefer a height the url states', () => {
    const value = 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&size=315'
    const expected: EmbedResolverResult = {
      provider: 'podbean',
      id: 'wyvke-1aefb6c-pb',
      src: 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb',
      height: 315,
    }

    expect(podbeanResolveEmbed(value)).toEqual(expected)
  })

  it('should ignore a podbean url naming no episode', () => {
    const value = 'https://www.podbean.com/pricing'

    expect(podbeanResolveEmbed(value)).toBeUndefined()
  })
})
