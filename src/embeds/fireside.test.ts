import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { extractFiresideToken, firesideEmbedResolver, firesideResolveEmbed } from './fireside.js'

describe('extractFiresideToken', () => {
  it('should read the show and episode token', () => {
    const value = 'https://fireside.fm/player/v2/DiNRb69N+Dagp3z15'
    const expected = { version: 'v2', token: 'DiNRb69N+Dagp3z15' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  it('should read a token whose plus arrived percent-encoded', () => {
    const value = 'https://fireside.fm/player/v2/o5sVQfzy%2BKzqauAdJ'
    const expected = { version: 'v2', token: 'o5sVQfzy+KzqauAdJ' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  // The player host omits the `player` segment, and it is what the platform's embed code writes.
  it('should read a token straight off the player host', () => {
    const value = 'https://player.fireside.fm/v3/N8LaNbQY+MI2PkJ2g'
    const expected = { version: 'v3', token: 'N8LaNbQY+MI2PkJ2g' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  it('should read the third player version on the feed-side host', () => {
    const value = 'https://fireside.fm/player/v3/N8LaNbQY+MI2PkJ2g'
    const expected = { version: 'v3', token: 'N8LaNbQY+MI2PkJ2g' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  // Both halves are base64url, so three of five tokens read off live shows carry `-` or `_`.
  it('should read a token carrying base64url punctuation', () => {
    const value = 'https://player.fireside.fm/v3/I-2by1pi+kf-gXAOz'
    const expected = { version: 'v3', token: 'I-2by1pi+kf-gXAOz' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  it('should read a token ending in an underscore', () => {
    const value = 'https://player.fireside.fm/v3/nj9oaFbU+BY9LAva_'
    const expected = { version: 'v3', token: 'nj9oaFbU+BY9LAva_' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  it('should read a player version past the ones Fireside has shipped', () => {
    const value = 'https://player.fireside.fm/v4/N8LaNbQY+MI2PkJ2g'
    const expected = { version: 'v4', token: 'N8LaNbQY+MI2PkJ2g' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  // The retired share route names the token and no version, so it takes the current player.
  it('should read a token off the share route', () => {
    const value = 'https://fireside.fm/s/aHx_iT3N+3W9-AW7P/iframe'
    const expected = { version: 'v3', token: 'aHx_iT3N+3W9-AW7P' }

    expect(extractFiresideToken(value)).toEqual(expected)
  })

  it('should return undefined for a share route naming no token', () => {
    const value = 'https://fireside.fm/s'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a first segment that is not a version', () => {
    const value = 'https://player.fireside.fm/embed/DiNRb69N+Dagp3z15'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a fireside url that is not a player', () => {
    const value = 'https://fireside.fm/podcasts'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a token of the wrong shape', () => {
    const value = 'https://fireside.fm/player/v2/onlyoneside'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a player url naming a version and no token', () => {
    const value = 'https://fireside.fm/player/v3'

    expect(extractFiresideToken(value)).toBeUndefined()
  })

  it('should return undefined for a token holding a malformed percent escape', () => {
    const value = 'https://fireside.fm/player/v3/%'

    expect(extractFiresideToken(value)).toBeUndefined()
  })
})

describe('firesideResolveEmbed', () => {
  // Sampled at 200 in 28 of 28 corpus iframes, which is the whole reason this resolver exists.
  it('should state the fixed player height', () => {
    const value = 'https://fireside.fm/player/v2/DiNRb69N+Dagp3z15'
    const expected: EmbedResolverResult = {
      provider: 'fireside',
      id: 'DiNRb69N+Dagp3z15',
      src: 'https://player.fireside.fm/v2/DiNRb69N+Dagp3z15',
      height: 200,
    }

    expect(firesideResolveEmbed(value)).toEqual(expected)
  })

  // v3 is what the platform writes today, so a publisher on it is not sent back to v2.
  it('should keep the player version the source states', () => {
    const value = 'https://player.fireside.fm/v3/I-2by1pi+kf-gXAOz'
    const expected: EmbedResolverResult = {
      provider: 'fireside',
      id: 'I-2by1pi+kf-gXAOz',
      src: 'https://player.fireside.fm/v3/I-2by1pi+kf-gXAOz',
      height: 200,
    }

    expect(firesideResolveEmbed(value)).toEqual(expected)
  })

  // The route 302s to a page that 404s, while the same token plays on the versioned player.
  it('should send a share route url to the current player', () => {
    const value = 'https://fireside.fm/s/aHx_iT3N+3W9-AW7P/iframe'
    const expected: EmbedResolverResult = {
      provider: 'fireside',
      id: 'aHx_iT3N+3W9-AW7P',
      src: 'https://player.fireside.fm/v3/aHx_iT3N+3W9-AW7P',
      height: 200,
    }

    expect(firesideResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a fireside url naming no episode', () => {
    const value = 'https://fireside.fm/pricing'

    expect(firesideResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('firesideEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, firesideEmbedResolver)

  describe('happy paths', () => {
    it('should claim a player iframe and state the fixed height', async () => {
      const value = html`
        <iframe
          src="https://player.fireside.fm/v3/N8LaNbQY+MI2PkJ2g"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'fireside',
        id: 'N8LaNbQY+MI2PkJ2g',
        src: 'https://player.fireside.fm/v3/N8LaNbQY+MI2PkJ2g',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The feed-side host writes the `player` segment and 301s to the same path on the player
    // host, so both forms have to reach the resolver through the one host entry.
    it('should claim a player iframe on the feed-side host', async () => {
      const value = html`
        <iframe
          src="https://fireside.fm/player/v2/DiNRb69N+Dagp3z15"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'fireside',
        id: 'DiNRb69N+Dagp3z15',
        src: 'https://player.fireside.fm/v2/DiNRb69N+Dagp3z15',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The host list admits every subdomain of `fireside.fm`, so the specimen that exercises the
    // gate is one suffixing the whole domain. Its path is a real player path.
    it('should ignore a lookalike host suffixing the player domain', async () => {
      const value =
        '<iframe src="https://player.fireside.fm.evil.test/v3/N8LaNbQY+MI2PkJ2g"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('the size a publisher states', () => {
    // Every corpus iframe states 200, which is where the resolver's height came from, but the
    // box a publisher chose for the player they embedded still outranks it.
    it('should let the carrier height win over the stated one', async () => {
      const value = html`
        <iframe
          src="https://player.fireside.fm/v3/I-2by1pi+kf-gXAOz"
          width="100%"
          height="180"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'fireside',
        id: 'I-2by1pi+kf-gXAOz',
        src: 'https://player.fireside.fm/v3/I-2by1pi+kf-gXAOz',
        height: 180,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

// The resolver only reaches a feed through the registered default list, and only an enclosure
// test reaches the path where claiming a media url would cost a reader the audio.
describeForEachParser('fireside through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should claim a player url framed as an embed', async () => {
    const value = '<iframe src="https://fireside.fm/player/v3/N8LaNbQY+MI2PkJ2g"></iframe>'

    const expected = html`
      <div
        data-embed-id="N8LaNbQY+MI2PkJ2g"
        data-embed-provider="fireside"
        data-embed-src="https://player.fireside.fm/v3/N8LaNbQY+MI2PkJ2g"
        data-embed-height="200"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // Every Fireside show serves its episode audio from `aphid.fireside.fm`, a subdomain the host
  // list admits, so only the version segment keeps a playable file out of a dead placeholder.
  it('should leave a fireside audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://aphid.fireside.fm/d/1437767933/02d1ff17-2b18-4b8f-9dc5-b4c78b9e6b21/episode.mp3',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://aphid.fireside.fm/d/1437767933/02d1ff17-2b18-4b8f-9dc5-b4c78b9e6b21/episode.mp3"
      ></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
