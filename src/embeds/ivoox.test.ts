import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractIvooxSubject,
  type IvooxSubject,
  ivooxEmbedResolver,
  ivooxResolveEmbed,
} from './ivoox.js'

describe('extractIvooxSubject', () => {
  it('should read an episode from the current player', () => {
    const value = 'https://www.ivoox.com/player_ej_80807760_6_1.html'
    const expected: IvooxSubject = {
      kind: 'episode',
      id: '80807760',
      skin: '6',
      page: '1',
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
      page: '1',
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
      page: '1',
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
      page: '1',
      player: 'ej',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  // The letters are enumerated because they are not a sequence: the ones outside the list answer
  // 404 while the listed ones serve (probed 2026-08-15 with real ids), so matching a shape would
  // mint dead urls. An unlisted generation keeps the generic placeholder.
  it('should ignore an unlisted legacy generation letter', () => {
    const value = 'http://www.ivoox.com/playerivoox_ez_1617339_1.html'

    expect(extractIvooxSubject(value)).toBeUndefined()
  })

  it('should read the regional player host', () => {
    const value = 'https://ar.ivoox.com/es/player_ej_45987110_2_1.html?data=abc'
    const expected: IvooxSubject = {
      kind: 'episode',
      id: '45987110',
      skin: '2',
      page: '1',
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
      page: '1',
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
      page: '1',
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
      page: '1',
      player: 'es_podcast',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  it('should read the playlist page a show states', () => {
    const value = 'https://www.ivoox.com/player_es_podcast_1267769_9_3.html'
    const expected: IvooxSubject = {
      kind: 'show',
      id: '1267769',
      skin: '9',
      page: '3',
      player: 'es_podcast',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  it('should read a show written with the page alone', () => {
    const value = 'https://www.ivoox.com/player_es_podcast_1267769_3.html'
    const expected: IvooxSubject = {
      kind: 'show',
      id: '1267769',
      skin: '1',
      page: '3',
      player: 'es_podcast',
    }

    expect(extractIvooxSubject(value)).toEqual(expected)
  })

  it('should ignore a slugged page whose file name ends in a player', () => {
    const value = 'https://www.ivoox.com/mi-podcast-player_ej_123456_1_1.html'

    expect(extractIvooxSubject(value)).toBeUndefined()
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

  // The trailing segment opens the show's playlist on a different episode, so resetting it to 1
  // would serve a player the publisher did not pick.
  it('should carry the playlist page a show states', () => {
    const value = 'https://www.ivoox.com/player_es_podcast_1267769_3.html'
    const expected: EmbedResolverResult = {
      provider: 'ivoox',
      id: 'podcast/1267769',
      src: 'https://www.ivoox.com/player_es_podcast_1267769_1_3.html',
      height: 200,
    }

    expect(ivooxResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a ivoox url naming no episode', () => {
    const value = 'https://www.ivoox.com/index.html'

    expect(ivooxResolveEmbed(value)).toBeUndefined()
  })
})

// `ivooxResolveEmbed` reads the path and nothing else, so the host gate, the carrier selector and
// the size precedence only exist in the resolver the default list registers.
describeForEachParser('ivooxEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, ivooxEmbedResolver)

  describe('happy paths', () => {
    it('should read the player url off an iframe carrier', async () => {
      const value = '<iframe src="https://www.ivoox.com/player_ej_80807760_6_1.html"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'ivoox',
        id: '80807760',
        src: 'https://www.ivoox.com/player_ej_80807760_6_1.html',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The carrier selector matches any `iframe[src]` rather than a `src*=` substring, so a host
    // that merely ends in the domain still reaches `extract` and only the host gate turns it
    // away. `ivooxResolveEmbed` handed the same url claims it.
    it('should ignore a lookalike host ending in the ivoox domain', async () => {
      const value =
        '<iframe src="https://ivoox.com.evil.test/player_ej_80807760_6_1.html"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // The box the publisher stated wins over the player's own height, and wins whole: both
    // dimensions replace it rather than a width landing beside a height nobody measured.
    it('should take the size the carrier states over the player height', async () => {
      const value = html`
        <iframe
          src="https://www.ivoox.com/player_ek_178634916_4_1.html"
          width="600"
          height="300"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'ivoox',
        id: '178634916',
        src: 'https://www.ivoox.com/player_ek_178634916_4_1.html',
        width: 600,
        height: 300,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// iVoox serves the episode audio from the player's own domain as `…_mf_{id}_feed_1.mp3`, and
// `injectEnclosures` offers every attachment to every url-keyed resolver, so the file reaches this
// resolver. Only the player path decides it is not an embed, and a placeholder here would cost the
// reader the audio.
describeForEachParser('ivoox enclosures through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should leave an ivoox audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://www.ivoox.com/territorio-trail-audios-mp3_mf_80807760_feed_1.mp3',
        type: 'audio/mpeg',
      },
    ]
    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://www.ivoox.com/territorio-trail-audios-mp3_mf_80807760_feed_1.mp3"
      ></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
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
