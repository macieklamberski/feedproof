import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  redcircleIframeEmbedResolver,
  redcircleResolveEmbed,
  redcircleScriptEmbedResolver,
} from './redcircle.js'

describe('redcircleResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the episode placeholder from the player url', () => {
      const value =
        'https://redcircle.com/embedded-player/sh/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/ep/cb6cd735-0017-48dd-b387-ecc8a20818e5'
      const expected: EmbedResolverResult = {
        provider: 'redcircle',
        id: 'episode/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/cb6cd735-0017-48dd-b387-ecc8a20818e5',
        src: 'https://redcircle.com/embedded-player/sh/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/ep/cb6cd735-0017-48dd-b387-ecc8a20818e5',
        url: 'https://redcircle.com/shows/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/episodes/cb6cd735-0017-48dd-b387-ecc8a20818e5',
        height: 170,
      }

      expect(redcircleResolveEmbed(value)).toEqual(expected)
    })

    // The loader is fetched from one path and builds its iframe on another, so the show id has
    // to land on the page that renders.
    it('should mint the show webplayer from the show loader url', () => {
      const value =
        'https://api.podcache.net/embedded-show-player/sh/7bc4f231-9280-445a-a62b-b5727083ddca?theme=light'
      const expected: EmbedResolverResult = {
        provider: 'redcircle',
        id: 'show/7bc4f231-9280-445a-a62b-b5727083ddca',
        src: 'https://redcircle.com/embedded-show-webplayer/7bc4f231-9280-445a-a62b-b5727083ddca?theme=light',
        url: 'https://redcircle.com/shows/7bc4f231-9280-445a-a62b-b5727083ddca',
        height: 320,
      }

      expect(redcircleResolveEmbed(value)).toEqual(expected)
    })

    it('should keep the show webplayer url as written', () => {
      const value =
        'https://redcircle.com/embedded-show-webplayer/7bc4f231-9280-445a-a62b-b5727083ddca?theme=dark'
      const expected: EmbedResolverResult = {
        provider: 'redcircle',
        id: 'show/7bc4f231-9280-445a-a62b-b5727083ddca',
        src: value,
        url: 'https://redcircle.com/shows/7bc4f231-9280-445a-a62b-b5727083ddca',
        height: 320,
      }

      expect(redcircleResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an episode path missing the episode', () => {
      const value = 'https://redcircle.com/embedded-player/sh/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a'

      expect(redcircleResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an id that is not a uuid', () => {
      const value = 'https://redcircle.com/embedded-player/sh/my-show/ep/latest'

      expect(redcircleResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a show id that is not a uuid', () => {
      const value = 'https://redcircle.com/embedded-show-webplayer/my-show'

      expect(redcircleResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for the show page itself', () => {
      const value = 'https://redcircle.com/shows/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a'

      expect(redcircleResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value =
        'https://redcircle.com.evil.test/embedded-player/sh/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/ep/cb6cd735-0017-48dd-b387-ecc8a20818e5'

      expect(redcircleResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('redcircleScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, redcircleScriptEmbedResolver)

  describe('happy paths', () => {
    it('should build the episode placeholder from the loader script', async () => {
      const value = html`
        <script
          async
          defer
          onload="redcircleIframe();"
          src="https://api.podcache.net/embedded-player/sh/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/ep/cb6cd735-0017-48dd-b387-ecc8a20818e5"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'redcircle',
        id: 'episode/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/cb6cd735-0017-48dd-b387-ecc8a20818e5',
        src: 'https://redcircle.com/embedded-player/sh/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/ep/cb6cd735-0017-48dd-b387-ecc8a20818e5',
        url: 'https://redcircle.com/shows/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/episodes/cb6cd735-0017-48dd-b387-ecc8a20818e5',
        height: 170,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should build the show placeholder from the show loader script', async () => {
      const value = html`
        <script
          async=""
          defer=""
          onload="redcircleShowIframe();"
          src="https://api.podcache.net/embedded-show-player/sh/7bc4f231-9280-445a-a62b-b5727083ddca?theme=light"
        ></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'redcircle',
        id: 'show/7bc4f231-9280-445a-a62b-b5727083ddca',
        src: 'https://redcircle.com/embedded-show-webplayer/7bc4f231-9280-445a-a62b-b5727083ddca?theme=light',
        url: 'https://redcircle.com/shows/7bc4f231-9280-445a-a62b-b5727083ddca',
        height: 320,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value =
        '<script src="https://evil.test/api.podcache.net/embedded-player/sh/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/ep/cb6cd735-0017-48dd-b387-ecc8a20818e5"></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('redcircleIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, redcircleIframeEmbedResolver)

  it('should resolve the player iframe the loader builds', async () => {
    const value = html`
      <iframe
        src="https://redcircle.com/embedded-player/sh/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/ep/cb6cd735-0017-48dd-b387-ecc8a20818e5?"
        height="170"
        scrolling="no"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'redcircle',
      id: 'episode/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/cb6cd735-0017-48dd-b387-ecc8a20818e5',
      src: 'https://redcircle.com/embedded-player/sh/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/ep/cb6cd735-0017-48dd-b387-ecc8a20818e5',
      url: 'https://redcircle.com/shows/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a/episodes/cb6cd735-0017-48dd-b387-ecc8a20818e5',
      height: 170,
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore an iframe framing the show page', async () => {
    const value =
      '<iframe src="https://redcircle.com/shows/638d4a39-ade6-47d8-9dd2-aa1cc5bef21a"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})

// The resolvers only reach a feed through the registered default list, and only an enclosure
// test reaches the path where claiming a media url would cost a reader the audio.
describeForEachParser('redcircle through the pipeline', (parseHtml) => {
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
        src="https://api.podcache.net/embedded-show-player/sh/7bc4f231-9280-445a-a62b-b5727083ddca?theme=light"
      ></script>
    `
    const expected = html`
      <div
        data-embed-id="show/7bc4f231-9280-445a-a62b-b5727083ddca"
        data-embed-provider="redcircle"
        data-embed-src="https://redcircle.com/embedded-show-webplayer/7bc4f231-9280-445a-a62b-b5727083ddca?theme=light"
        data-embed-url="https://redcircle.com/shows/7bc4f231-9280-445a-a62b-b5727083ddca"
        data-embed-height="320"
      ></div>
    `

    expect(await convert(value)).toEqualHtml(expected)
  })

  // Every RedCircle feed's audio sits on a numbered `audio{n}.redcircle.com`, which listing
  // `redcircle.com` claims. Only the route table keeps the audio playable.
  it('should leave a redcircle audio enclosure playable', async () => {
    const enclosures = [
      {
        url: 'https://audio4.redcircle.com/episodes/fe18a710-ceb4-42d7-a290-7b5a43075e16/stream.mp3',
        type: 'audio/mpeg',
      },
    ]

    const expected = html`
      <audio
        data-enclosure=""
        controls
        src="https://audio4.redcircle.com/episodes/fe18a710-ceb4-42d7-a290-7b5a43075e16/stream.mp3"
      ></audio>
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })
})
