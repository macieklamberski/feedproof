import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  podetizeIframeEmbedResolver,
  podetizeResolveEmbed,
  podetizeScriptEmbedResolver,
} from './podetize.js'

describe('podetizeResolveEmbed', () => {
  it('should build the placeholder from the player url', () => {
    const value = 'https://player.podetize.com/?id=P8RHvvMsf&epmode=true'
    const expected: EmbedResolverResult = {
      provider: 'podetize',
      id: 'P8RHvvMsf',
      src: 'https://player.podetize.com/?id=P8RHvvMsf&epmode=true',
      height: 200,
    }

    expect(podetizeResolveEmbed(value)).toEqual(expected)
  })

  it('should leave the mode off when the url does not ask for it', () => {
    const value = 'https://player.podetize.com/?id=P8RHvvMsf'
    const expected: EmbedResolverResult = {
      provider: 'podetize',
      id: 'P8RHvvMsf',
      src: 'https://player.podetize.com/?id=P8RHvvMsf',
      height: 200,
    }

    expect(podetizeResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a url naming no episode', () => {
    const value = 'https://player.podetize.com/?epmode=true'

    expect(podetizeResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for the loader script url', () => {
    const value = 'https://player.podetize.com/loadShowcasePlayer.js'

    expect(podetizeResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for an id that cannot sit in a path', () => {
    const value = 'https://player.podetize.com/?id=P8RH/../vvMsf'

    expect(podetizeResolveEmbed(value)).toBeUndefined()
  })

  it('should return undefined for a lookalike host', () => {
    const value = 'https://player.podetize.com.evil.test/?id=P8RHvvMsf'

    expect(podetizeResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('podetizeScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, podetizeScriptEmbedResolver)

  describe('happy paths', () => {
    it('should build the placeholder from the data and epmode attributes', async () => {
      const value = html`
        <script
          async
          src="https://player.podetize.com/loadShowcasePlayer.js"
          data="P8RHvvMsf"
          epmode="true"
          id="showcase-player"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'podetize',
        id: 'P8RHvvMsf',
        src: 'https://player.podetize.com/?id=P8RHvvMsf&epmode=true',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should leave the mode off when the script does not state it', async () => {
      const value = html`
        <script
          src="https://player.podetize.com/loadShowcasePlayer.js"
          data="P8RHvvMsf"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'podetize',
        id: 'P8RHvvMsf',
        src: 'https://player.podetize.com/?id=P8RHvvMsf',
        height: 200,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an id that cannot sit in a query', async () => {
      const value = html`
        <script
          src="https://player.podetize.com/loadShowcasePlayer.js"
          data="P8RH vvMsf"
        ></script>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('podetizeIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, podetizeIframeEmbedResolver)

  it('should resolve the pasted player iframe', async () => {
    const value = html`
      <iframe
        title="ShowCastR™ player"
        src="https://player.podetize.com/?id=P8RHvvMsf&epmode=true"
        width="100%"
        height="200"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'podetize',
      id: 'P8RHvvMsf',
      src: 'https://player.podetize.com/?id=P8RHvvMsf&epmode=true',
      height: 200,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a foreign host carrying the same query', async () => {
    const value = '<iframe src="https://evil.test/player.podetize.com/?id=P8RHvvMsf"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})

// The resolvers only reach a feed through the registered default list, and only an enclosure
// test reaches the path where claiming a media url would cost a reader the audio.
describeForEachParser('podetize through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures?: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should claim the loader script the default list reaches', async () => {
    const value = html`
      <script
        async
        src="https://player.podetize.com/loadShowcasePlayer.js"
        data="zvFEj7DPJ"
        epmode="true"
      ></script>
    `
    const expected = html`
      <div
        data-embed-id="zvFEj7DPJ"
        data-embed-provider="podetize"
        data-embed-src="https://player.podetize.com/?id=zvFEj7DPJ&amp;epmode=true"
        data-embed-height="200"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // Podetize serves its episode audio from `feeds.podetize.com`, which the player-only host list
  // does not claim, and the root-path check refuses anything else that lands on the player host.
  it('should leave a podetize audio enclosure playable', async () => {
    const enclosures = [
      { url: 'https://feeds.podetize.com/ep/zvFEj7DPJ/media.mp3', type: 'audio/mpeg' },
    ]

    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://feeds.podetize.com/ep/zvFEj7DPJ/media.mp3"
      ></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
