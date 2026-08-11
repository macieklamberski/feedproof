import { describe, expect, it } from 'bun:test'
import { extractPodbeanId, podbeanResolveEmbed } from './podbean.js'

describe('extractPodbeanId', () => {
  it('should read the id from the legacy player path', () => {
    const value = 'https://www.podbean.com/media/player/yx4hr-f3d1e1?from=pb6admin&download=1'

    expect(extractPodbeanId(value)).toBe('yx4hr-f3d1e1')
  })

  it('should read the id from the v2 player query', () => {
    const value = 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&share=1&fonts=Arial'

    expect(extractPodbeanId(value)).toBe('wyvke-1aefb6c-pb')
  })

  it('should return undefined for a podbean url naming no episode', () => {
    expect(extractPodbeanId('https://www.podbean.com/pricing')).toBeUndefined()
  })
})

describe('podbeanResolveEmbed', () => {
  // The legacy url 301s to the v2 player, so minting it repairs the embed and saves a redirect.
  it('should rewrite the legacy player to the v2 form', () => {
    const value = 'https://www.podbean.com/media/player/yx4hr-f3d1e1?from=pb6admin'

    expect(podbeanResolveEmbed(value)).toEqual({
      provider: 'podbean',
      id: 'yx4hr-f3d1e1',
      src: 'https://www.podbean.com/player-v2/?i=yx4hr-f3d1e1',
      height: 150,
    })
  })

  it('should keep a v2 id as written', () => {
    const value = 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&skin=3'

    expect(podbeanResolveEmbed(value)).toMatchObject({
      src: 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb',
      height: 150,
    })
  })

  it('should prefer a height the url states', () => {
    const value = 'https://www.podbean.com/player-v2/?i=wyvke-1aefb6c-pb&size=315'

    expect(podbeanResolveEmbed(value)).toMatchObject({ height: 315 })
  })

  it('should ignore a podbean url naming no episode', () => {
    expect(podbeanResolveEmbed('https://www.podbean.com/pricing')).toBeUndefined()
  })
})
