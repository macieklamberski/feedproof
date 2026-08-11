import { describe, expect, it } from 'bun:test'
import { captivateResolveEmbed, extractCaptivateEmbed } from './captivate.js'

const uuid = '7f2c9a10-3b4d-4e5f-8a9b-0c1d2e3f4a5b'

describe('extractCaptivateEmbed', () => {
  it('should read an episode player', () => {
    expect(extractCaptivateEmbed(`https://player.captivate.fm/episode/${uuid}/`)).toEqual({
      kind: 'episode',
      id: uuid,
    })
  })

  it('should read a show player', () => {
    expect(extractCaptivateEmbed(`https://player.captivate.fm/show/${uuid}`)).toMatchObject({
      kind: 'show',
    })
  })

  it('should return undefined for an id that is not a uuid', () => {
    expect(extractCaptivateEmbed('https://player.captivate.fm/episode/12345')).toBeUndefined()
  })

  it('should return undefined for a captivate url that is not a player', () => {
    expect(extractCaptivateEmbed('https://captivate.fm/pricing')).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(extractCaptivateEmbed('https://[')).toBeUndefined()
  })
})

describe('captivateResolveEmbed', () => {
  it('should state the fixed player height', () => {
    expect(captivateResolveEmbed(`https://player.captivate.fm/episode/${uuid}/`)).toEqual({
      provider: 'captivate',
      id: `episode/${uuid}`,
      src: `https://player.captivate.fm/episode/${uuid}`,
      height: 200,
    })
  })

  it('should return undefined for a captivate url naming no episode', () => {
    expect(captivateResolveEmbed('https://player.captivate.fm/about')).toBeUndefined()
  })
})
