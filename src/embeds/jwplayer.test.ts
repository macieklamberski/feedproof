import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractJwplayerId,
  jwplayerAmpEmbedResolver,
  jwplayerIframeEmbedResolver,
  jwplayerResolveEmbed,
  jwplayerScriptEmbedResolver,
  jwplayerSetupEmbedResolver,
} from './jwplayer.js'

describe('extractJwplayerId', () => {
  it('should extract the media id from a player url', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873-abc12345.html'
    const expected = 'H4GXr873'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  it('should extract the media id when no player id is present', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873.html'
    const expected = 'H4GXr873'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  // Business Insider's feed ships JW Player embeds with an empty player id, leaving a
  // `{mediaId}-.html` tail whose URL 404s ("File not Found"). This is a quirk of that feed,
  // not something other providers hit. Most embeds carry a well-formed url, and extracting the
  // media id from the segment recovers it regardless of the missing player id.
  it('should extract the media id from a Business Insider empty-player-id url', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873-.html'
    const expected = 'H4GXr873'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  it('should extract the media id from a jwplatform.com host', () => {
    const value = 'https://content.jwplatform.com/players/H4GXr873-abc12345.html'
    const expected = 'H4GXr873'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  it('should return undefined for an invalid url', () => {
    const value = 'not a url'

    expect(extractJwplayerId(value)).toBeUndefined()
  })

  it('should read an id off the previews route', () => {
    const value = 'https://cdn.jwplayer.com/previews/H4GXr873'
    const expected = 'H4GXr873'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  // `products` is eight characters, so the bound this replaces read it as a media id.
  it('should return undefined for a marketing page whose slug fits the id shape', () => {
    const value = 'https://www.jwplayer.com/products'

    expect(extractJwplayerId(value)).toBeUndefined()
  })

  it('should read an id longer than the eight characters JW mints today', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873xyz-abc12345.html'
    const expected = 'H4GXr873xyz'

    expect(extractJwplayerId(value)).toBe(expected)
  })

  // An underscore is outside the alphabet a media id is written in, and it is what tells a
  // malformed id from a short one, since a short id fails the same whether minted or passed through.
  it('should return undefined when the media id is malformed', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GX_r873-abc12345.html'

    expect(extractJwplayerId(value)).toBeUndefined()
  })
})

describe('jwplayerResolveEmbed', () => {
  it('should build the embed with a thumbnail', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873-abc12345.html'
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
    }

    expect(jwplayerResolveEmbed(value)).toEqual(expected)
  })

  // The rebuilt src drops the empty player-id segment that 404s in the Business Insider feed.
  it('should rebuild a working src from an empty-player-id url', () => {
    const value = 'https://cdn.jwplayer.com/players/H4GXr873-.html'
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
    }

    expect(jwplayerResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined when no media id can be extracted', () => {
    const value = 'not a url'

    expect(jwplayerResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('jwplayerIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, jwplayerIframeEmbedResolver)

  it('should resolve a jwplayer iframe', async () => {
    const value = '<iframe src="https://cdn.jwplayer.com/players/H4GXr873-.html"></iframe>'
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a non-jwplayer iframe', async () => {
    const value = '<iframe src="https://example.com/video"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})

describeForEachParser('jwplayerScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, jwplayerScriptEmbedResolver)

  it('should resolve the script embed to the default-player placeholder', async () => {
    const value = html`
      <script
        type="application/javascript"
        src="https://cdn.jwplayer.com/players/H4GXr873-abc12345.js"
      ></script>
    `
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should return undefined for a foreign host carrying the player path', async () => {
    const value = html`
      <script src="https://evil.test/jwplayer.com/players/H4GXr873-abc12345.js"></script>
    `

    expect(await extract(value)).toBeUndefined()
  })
})

describeForEachParser('jwplayerAmpEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, jwplayerAmpEmbedResolver)

  it('should resolve the AMP element to the default-player placeholder', async () => {
    const value = html`
      <amp-jwplayer
        data-media-id="H4GXr873"
        data-player-id="abc12345"
        width="16"
        height="9"
      ></amp-jwplayer>
    `
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'H4GXr873',
      src: 'https://cdn.jwplayer.com/players/H4GXr873.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/H4GXr873/poster.jpg',
      width: 16,
      height: 9,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should return undefined for a malformed media id', async () => {
    const value = html`
      <amp-jwplayer data-media-id="../../evil" data-player-id="abc12345"></amp-jwplayer>
    `

    expect(await extract(value)).toBeUndefined()
  })

  // A playlist names no single media, so it gets no poster: the poster endpoint answers about a
  // media and 404s for anything else. It does have a player page, which discriminates, so the
  // src is real even though the thumbnail would not be.
  it('should claim the playlist variant without inventing a poster', async () => {
    const value = html`
      <amp-jwplayer data-playlist-id="482jsTAr" data-player-id="abc12345"></amp-jwplayer>
    `
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'playlist/482jsTAr',
      src: 'https://cdn.jwplayer.com/players/482jsTAr.html',
    }

    expect(await extract(value)).toEqual(expected)
  })

  // AMP's own builder gives the playlist id precedence when both are present.
  it('should prefer the playlist id over the media id', async () => {
    const value = html`
      <amp-jwplayer
        data-playlist-id="482jsTAr"
        data-media-id="nPripu9l"
        data-player-id="abc12345"
      ></amp-jwplayer>
    `
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'playlist/482jsTAr',
      src: 'https://cdn.jwplayer.com/players/482jsTAr.html',
    }

    expect(await extract(value)).toEqual(expected)
  })
})

describeForEachParser('jwplayerSetupEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, jwplayerSetupEmbedResolver)

  it('should read the media id out of an inline setup call', async () => {
    const value = html`
      <div class="jwplayer" id="botr_hwhuyhFf_h5bP9bKQ_div"></div>
      <script>
        jwplayer("botr_hwhuyhFf_h5bP9bKQ_div").setup({"playlist":"https://cdn.jwplayer.com/v2/media/hwhuyhFf"});
      </script>
    `
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'hwhuyhFf',
      src: 'https://cdn.jwplayer.com/players/hwhuyhFf.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/hwhuyhFf/poster.jpg',
    }

    expect(await extract(value)).toEqual(expected)
  })

  // Several players in one item each name their own container, so the id pairs them up.
  it('should read a script that names the div rather than following it', async () => {
    const value = html`
      <div class="jwplayer" id="botr_hwhuyhFf_h5bP9bKQ_div"></div>
      <p>Between the two.</p>
      <script>
        jwplayer("botr_hwhuyhFf_h5bP9bKQ_div").setup({"playlist":"https://cdn.jwplayer.com/v2/media/hwhuyhFf"});
      </script>
    `
    const expected: EmbedResolverResult = {
      provider: 'jwplayer',
      id: 'hwhuyhFf',
      src: 'https://cdn.jwplayer.com/players/hwhuyhFf.html',
      thumbnail: 'https://cdn.jwplayer.com/v2/media/hwhuyhFf/poster.jpg',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should return undefined when the setup call names no media', async () => {
    const value = html`
      <div class="jwplayer" id="botr_hwhuyhFf_h5bP9bKQ_div"></div>
      <script>
        jwplayer("botr_hwhuyhFf_h5bP9bKQ_div").setup({"file":"https://example.com/video.mp4"});
      </script>
    `

    expect(await extract(value)).toBeUndefined()
  })

  it('should return undefined for a player div carrying no script', async () => {
    const value = '<div class="jwplayer"></div>'

    expect(await extract(value)).toBeUndefined()
  })
})

// The resolver alone cannot see this: `wrapBareInlineInParagraphs` runs before the widget pass
// and puts the bare script in a `<p>`, so the div's sibling is that paragraph.
describeForEachParser('jwplayerSetupEmbedResolver through the pipeline', (parseHtml) => {
  it('should recover a player whose script the paragraph pass has wrapped', async () => {
    const value = html`
      <div class="jwplayer"></div>
      <script>
        jwplayer("x").setup({"playlist":"https://cdn.jwplayer.com/v2/media/hwhuyhFf"});
      </script>
    `
    const result = await transformContent(value, { parseHtmlFn: parseHtml })

    expect(result).toContainHtml('data-embed-id="hwhuyhFf"')
  })
})

// The url resolver reaches every enclosure a feed carries, and JW's media CDN sits on the same
// domain as its player: only the route check keeps a rendition file a video.
describeForEachParser('jwplayerIframeEmbedResolver through the pipeline', (parseHtml) => {
  it('should leave a JW rendition enclosure playable', async () => {
    const enclosures = [
      { url: 'https://cdn.jwplayer.com/videos/H4GXr873-1280.mp4', type: 'video/mp4' },
    ]

    const expected = html`
      <video data-enclosure="" controls src="https://cdn.jwplayer.com/videos/H4GXr873-1280.mp4"></video>
      <p>Body</p>
    `

    expect(
      await transformContent('<p>Body</p>', {
        parseHtmlFn: parseHtml,
        baseUrl: 'https://example.com/post',
        enclosures,
      }),
    ).toEqualHtml(expected)
  })
})
