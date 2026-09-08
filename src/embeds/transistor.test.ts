import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  extractTransistorEmbed,
  transistorEmbedResolver,
  transistorResolveEmbed,
} from './transistor.js'

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

  // Transistor has minted eight-character episode ids so far, so only the alphabet is checked.
  it('should read an episode id longer than the ones minted so far', () => {
    const value = 'https://share.transistor.fm/e/a1b2c3d4e5f6g7h8'
    const expected = {
      kind: 'e',
      id: 'a1b2c3d4e5f6g7h8',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  it('should read an episode id shorter than the ones minted so far', () => {
    const value = 'https://share.transistor.fm/e/a1b2c'
    const expected = {
      kind: 'e',
      id: 'a1b2c',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  // The share page and the player take the same id, so the share url reads as the episode.
  it('should read an episode from its share page url', () => {
    const value = 'https://share.transistor.fm/s/9f8e7d6c'
    const expected = {
      kind: 'e',
      id: '9f8e7d6c',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  // Transistor writes an episode's transcript beside it as `/s/{id}/{token}.{ext}`. The share
  // url above uses the same id, so it is the control: the sidecar is refused and the episode
  // it sits beside still reads.
  it.each([
    'https://share.transistor.fm/s/9f8e7d6c/8a7b6c5d.vtt',
    'https://share.transistor.fm/s/9f8e7d6c/8a7b6c5d.srt',
    'https://share.transistor.fm/s/9f8e7d6c/8a7b6c5d.txt',
    'https://share.transistor.fm/s/9f8e7d6c/8a7b6c5d.json',
  ])('should return undefined for the transcript sidecar %s', (value) => {
    expect(extractTransistorEmbed(value)).toBeUndefined()
  })

  // Real Transistor examples. Dropping the mode segment would mint `/e/{slug}`, which asks for
  // an episode by a show's name and answers 404.
  it('should read a show latest player as its own subject', () => {
    const value = 'https://share.transistor.fm/e/megamaker/latest'
    const expected = {
      kind: 'latest',
      id: 'megamaker',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  it('should read a show playlist player as its own subject', () => {
    const value = 'https://share.transistor.fm/e/megamaker/playlist'
    const expected = {
      kind: 'playlist',
      id: 'megamaker',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  // A show slug is the publisher's own words, so it hyphenates where an episode id never does.
  it('should read a hyphenated show slug', () => {
    const value = 'https://share.transistor.fm/e/build-your-saas/latest'
    const expected = {
      kind: 'latest',
      id: 'build-your-saas',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  it('should read a single-character show slug', () => {
    const value = 'https://share.transistor.fm/e/z/playlist'
    const expected = {
      kind: 'playlist',
      id: 'z',
    } as const

    expect(extractTransistorEmbed(value)).toEqual(expected)
  })

  // With no length left on either id, the alphabet is the whole guard, and excluding the dot is
  // what keeps a file on the host from reading as an episode.
  it.each([
    'https://share.transistor.fm/e/9f8e7d6c.mp3',
    'https://share.transistor.fm/s/9f8e7d6c.mp3',
    'https://share.transistor.fm/e/build-your-saas.mp3/latest',
  ])('should return undefined for a file on the host at %s', (value) => {
    expect(extractTransistorEmbed(value)).toBeUndefined()
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
  // The player cannot be opened as a page, so the share page the same id addresses is what the
  // placeholder clicks through to.
  it('should mint the share page from a player url that names no page', () => {
    const value = 'https://share.transistor.fm/e/a1b2c3d4'
    const expected: EmbedResolverResult = {
      provider: 'transistor',
      id: 'episode/a1b2c3d4',
      src: 'https://share.transistor.fm/e/a1b2c3d4',
      url: 'https://share.transistor.fm/s/a1b2c3d4',
      height: 180,
    }

    expect(transistorResolveEmbed(value)).toEqual(expected)
  })

  // 180 across 49 of 49 sampled corpus iframes, and their oEmbed agrees.
  it('should size an episode at the fixed height', () => {
    const value = 'https://share.transistor.fm/e/a1b2c3d4/dark'
    const expected: EmbedResolverResult = {
      provider: 'transistor',
      id: 'episode/a1b2c3d4',
      src: 'https://share.transistor.fm/e/a1b2c3d4',
      url: 'https://share.transistor.fm/s/a1b2c3d4',
      height: 180,
    }

    expect(transistorResolveEmbed(value)).toEqual(expected)
  })

  // The share page refuses framing, so the mint has to be the `/e/` player it fronts, which
  // takes the same id, and the share page stays as the url.
  it('should mint the episode player from a share page url', () => {
    const value = 'https://share.transistor.fm/s/9f8e7d6c'
    const expected: EmbedResolverResult = {
      provider: 'transistor',
      id: 'episode/9f8e7d6c',
      src: 'https://share.transistor.fm/e/9f8e7d6c',
      url: 'https://share.transistor.fm/s/9f8e7d6c',
      height: 180,
    }

    expect(transistorResolveEmbed(value)).toEqual(expected)
  })

  // A show mode states no url, because the embed slug names no page on the platform.
  it('should keep the mode segment a show player needs', () => {
    const value = 'https://share.transistor.fm/e/megamaker/latest'
    const expected: EmbedResolverResult = {
      provider: 'transistor',
      id: 'latest/megamaker',
      src: 'https://share.transistor.fm/e/megamaker/latest',
      height: 180,
    }

    expect(transistorResolveEmbed(value)).toEqual(expected)
  })

  // The whole show rather than one episode, so it takes the taller player.
  it('should size a show playlist player taller', () => {
    const value = 'https://share.transistor.fm/e/build-your-saas/playlist'
    const expected: EmbedResolverResult = {
      provider: 'transistor',
      id: 'playlist/build-your-saas',
      src: 'https://share.transistor.fm/e/build-your-saas/playlist',
      height: 390,
    }

    expect(transistorResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a transistor url naming no episode', () => {
    const value = 'https://share.transistor.fm/about'

    expect(transistorResolveEmbed(value)).toBeUndefined()
  })

  // `injectEnclosures` offers every enclosure to every url resolver, so a transcript listed as
  // one reached this and came back as the show player.
  it('should return undefined for a transcript listed as an enclosure', () => {
    const value = 'https://share.transistor.fm/s/9f8e7d6c/8a7b6c5d.vtt'

    expect(transistorResolveEmbed(value)).toBeUndefined()
  })
})

describeForEachParser('transistorEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, transistorEmbedResolver)

  describe('happy paths', () => {
    it('should state the episode height for a carrier declaring none', async () => {
      const value = html`
        <iframe
          src="https://share.transistor.fm/e/a1b2c3d4"
          frameborder="no"
          scrolling="no"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'transistor',
        id: 'episode/a1b2c3d4',
        src: 'https://share.transistor.fm/e/a1b2c3d4',
        url: 'https://share.transistor.fm/s/a1b2c3d4',
        height: 180,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The publisher stretched the playlist player past the 390 the resolver measured, and the
    // number they chose is the one their embed was laid out against.
    it('should keep the size the carrier declares', async () => {
      const value = html`
        <iframe
          src="https://share.transistor.fm/e/build-your-saas/playlist"
          width="600"
          height="440"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'transistor',
        id: 'playlist/build-your-saas',
        src: 'https://share.transistor.fm/e/build-your-saas/playlist',
        width: 600,
        height: 440,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the player path', async () => {
      const value = '<iframe src="https://evil.test/e/a1b2c3d4"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    // The route word is what the kind check reads, so a marketing path with a slug behind it
    // is the shape that would resolve if it stopped reading one.
    it('should ignore a transistor url naming no episode', async () => {
      const value = '<iframe src="https://transistor.fm/blog/analytics"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
