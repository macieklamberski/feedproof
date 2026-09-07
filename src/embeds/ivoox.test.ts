import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractIvooxSubject, type IvooxSubject, ivooxResolveEmbed } from './ivoox.js'

describe('extractIvooxSubject', () => {
  it('should read an episode from the current player', () => {
    const value = 'https://www.ivoox.com/player_ej_80807760_6_1.html'
    const expected: IvooxSubject = {
      kind: 'episode',
      id: '80807760',
      skin: '6',
      player: 'ej',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  it('should read an episode from the legacy player', () => {
    const value = 'http://www.ivoox.com/playerivoox_ee_8292430_1.html'
    const expected: IvooxSubject = {
      kind: 'episode',
      id: '8292430',
      skin: '1',
      player: 'ej',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  // The other two legacy generations, `_ep_` and `_em_`, name the episode with the same id.
  it('should read an episode from the second legacy generation', () => {
    const value = 'http://www.ivoox.com/playerivoox_ep_1617339_1.html'
    const expected: IvooxSubject = {
      kind: 'episode',
      id: '1617339',
      skin: '1',
      player: 'ej',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  it('should read an episode from the earliest legacy generation', () => {
    const value = 'http://www.ivoox.com/playerivoox_em_23415_1.html'
    const expected: IvooxSubject = {
      kind: 'episode',
      id: '23415',
      skin: '1',
      player: 'ej',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  // The letters are a list, not a range: nothing outside the three seen in the corpus is read
  // as a player, so an unknown generation keeps the generic placeholder.
  it('should ignore a legacy generation letter the corpus never carries', () => {
    const value = 'http://www.ivoox.com/playerivoox_ez_1617339_1.html'

    expect(extractIvooxSubject(value)).toBeUndefined()
  })

  it('should read the regional player host', () => {
    const value = 'https://ar.ivoox.com/es/player_ej_45987110_2_1.html?data=abc'
    const expected: IvooxSubject = {
      kind: 'episode',
      id: '45987110',
      skin: '2',
      player: 'ej',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  it('should read an episode from the newer player generation', () => {
    const value = 'https://www.ivoox.com/player_ek_178634916_4_1.html'
    const expected: IvooxSubject = {
      kind: 'episode',
      id: '178634916',
      skin: '4',
      player: 'ek',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  it('should read the newer generation written without a skin', () => {
    const value = 'https://www.ivoox.com/player_ek_178634916_1.html'
    const expected: IvooxSubject = {
      kind: 'episode',
      id: '178634916',
      skin: '1',
      player: 'ek',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  it('should read a show from the podcast player', () => {
    const value = 'https://www.ivoox.com/player_es_podcast_1267769_1.html'
    const expected: IvooxSubject = {
      kind: 'show',
      id: '1267769',
      skin: '1',
      player: 'es_podcast',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  it('should return undefined for an ivoox url that is not a player', () => {
    const value = 'https://www.ivoox.com/podcast-something_sq_f1_1.html'

    expect(extractIvooxSubject(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractIvooxSubject(value)).toBeUndefined()
  })
})

describe('ivooxResolveEmbed', () => {
  // The legacy player 404s while the same id in the current form serves, so this is a repair.
  it('should rewrite the dead legacy player to the current one', () => {
    const value = 'http://www.ivoox.com/playerivoox_ee_8292430_1.html'
    const expected: EmbedResolverResult = {
      provider: 'ivoox',
      id: '8292430',
      src: 'https://www.ivoox.com/player_ej_8292430_1_1.html',
      height: 200,
    }

    expect(ivooxResolveEmbed(value)).toEqual(expected)
  })

  it('should rewrite the second legacy generation onto the same player', () => {
    const value = 'http://www.ivoox.com/playerivoox_ep_1617339_1.html'
    const expected: EmbedResolverResult = {
      provider: 'ivoox',
      id: '1617339',
      src: 'https://www.ivoox.com/player_ej_1617339_1_1.html',
      height: 200,
    }

    expect(ivooxResolveEmbed(value)).toEqual(expected)
  })

  it('should carry the skin the source states', () => {
    const value = 'https://www.ivoox.com/player_ej_80807760_6_1.html'
    const expected: EmbedResolverResult = {
      provider: 'ivoox',
      id: '80807760',
      src: 'https://www.ivoox.com/player_ej_80807760_6_1.html',
      height: 200,
    }

    expect(ivooxResolveEmbed(value)).toEqual(expected)
  })

  // `ek` serves, so the publisher's generation is kept rather than rewritten to `ej`.
  it('should keep the newer player generation the source states', () => {
    const value = 'https://www.ivoox.com/player_ek_178634916_4_1.html'
    const expected: EmbedResolverResult = {
      provider: 'ivoox',
      id: '178634916',
      src: 'https://www.ivoox.com/player_ek_178634916_4_1.html',
      height: 200,
    }

    expect(ivooxResolveEmbed(value)).toEqual(expected)
  })

  // A show id is a different id space from an episode id, so the kind stays in the placeholder.
  it('should name a show placeholder by its podcast id', () => {
    const value = 'https://www.ivoox.com/player_es_podcast_1267769_1.html'
    const expected: EmbedResolverResult = {
      provider: 'ivoox',
      id: 'podcast/1267769',
      src: 'https://www.ivoox.com/player_es_podcast_1267769_1_1.html',
      height: 200,
    }

    expect(ivooxResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a ivoox url naming no episode', () => {
    const value = 'https://www.ivoox.com/index.html'

    expect(ivooxResolveEmbed(value)).toBeUndefined()
  })
})

// The legacy generations only ever arrive as a Flash `<object data>` or `<embed src>`, which is
// the carrier the url resolver has to be reached through, so the repair is asserted end to end.
describeForEachParser('ivoox flash carriers through the pipeline', (parseHtml) => {
  const convert = (value: string) => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  it('should move a dead object player onto the current one', async () => {
    const value = html`
      <object
        data="http://www.ivoox.com/playerivoox_ep_1617339_1.html"
        type="application/x-shockwave-flash"
        width="173"
        height="30"
      >
        <param name="movie" value="http://www.ivoox.com/playerivoox_ep_1617339_1.html">
      </object>
    `
    const expected = html`
      <div
        data-embed-src="https://www.ivoox.com/player_ej_1617339_1_1.html"
        data-embed-provider="ivoox"
        data-embed-id="1617339"
        data-embed-width="173"
        data-embed-height="30"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })
})
