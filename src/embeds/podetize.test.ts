import { describe, expect, it } from 'bun:test'
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
