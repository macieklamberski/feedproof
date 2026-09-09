import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { mediavineScriptEmbedResolver, mediavineWidgetEmbedResolver } from './mediavine.js'

describeForEachParser('mediavineWidgetEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, mediavineWidgetEmbedResolver)

  describe('happy paths', () => {
    it('should mint the embed player url from the video id', async () => {
      const value = html`
        <div
          class="mv-video-target mv-video-id-t9z9zameefjmqvtghsvu"
          data-video-id="t9z9zameefjmqvtghsvu"
          data-ratio="16:9"
          data-volume="70"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 't9z9zameefjmqvtghsvu',
        src: 'https://embed.mediavine.com/videos/t9z9zameefjmqvtghsvu/iframe',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an empty video id', async () => {
      const value = html`
        <div
          class="mv-video-target mv-video-id-"
          data-video-id=""
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should not match a target div without the video id attribute', async () => {
      const value = html`
        <div
          class="mv-video-target"
          data-ratio="16:9"
        ></div>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // The attribute is whatever the feed wrote, and unescaped it picks the page: `../../evil`
    // climbs out of the `videos` route and a `?` moves the rest of it into the query.
    it('should keep a traversing video id inside its own path segment', async () => {
      const value = html`
        <div
          class="mv-video-target"
          data-video-id="../../evil"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: '../../evil',
        src: 'https://embed.mediavine.com/videos/..%2F..%2Fevil/iframe',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep a query a video id states out of the minted url', async () => {
      const value = html`
        <div
          class="mv-video-target"
          data-video-id="a?autoplay=1"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 'a?autoplay=1',
        src: 'https://embed.mediavine.com/videos/a%3Fautoplay%3D1/iframe',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state no shape for a malformed ratio', async () => {
      const value = html`
        <div
          class="mv-video-target mv-video-id-t9z9zameefjmqvtghsvu"
          data-video-id="t9z9zameefjmqvtghsvu"
          data-ratio="wide"
        ></div>
      `
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 't9z9zameefjmqvtghsvu',
        src: 'https://embed.mediavine.com/videos/t9z9zameefjmqvtghsvu/iframe',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})

describeForEachParser('mediavineScriptEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, mediavineScriptEmbedResolver)

  describe('happy paths', () => {
    it('should mint the player from the id in the loader url', async () => {
      const value = html`
        <div class="wprm-recipe-video">
          <div
            id="dx6ydyrbrjbbu2tncqzi"
            data-ratio="16:9"
            data-volume="70"
          ></div>
          <script src="https://video.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi.js"></script>
        </div>
      `
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 'dx6ydyrbrjbbu2tncqzi',
        src: 'https://embed.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi/iframe',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read an id outside the 19 and 20 characters mined from the corpus', async () => {
      const value =
        '<script src="https://video.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi9.js"></script>'
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 'dx6ydyrbrjbbu2tncqzi9',
        src: 'https://embed.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi9/iframe',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state no shape when the script stands alone', async () => {
      const value =
        '<script src="https://video.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi.js"></script>'
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 'dx6ydyrbrjbbu2tncqzi',
        src: 'https://embed.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi/iframe',
      }

      expect(await extract(value)).toEqual(expected)
    })

    // Two videos in one item each carry their own div, and the script's id is what says which
    // shape belongs to which player.
    it('should take the ratio from the div its own id points at', async () => {
      const value = html`
        <div
          id="lo5qwb0dazahwc5xwo6q"
          data-ratio="4:3"
        ></div>
        <div
          id="decp0ejel1ozsqy4i63s"
          data-ratio="16:9"
        ></div>
        <script src="https://video.mediavine.com/videos/decp0ejel1ozsqy4i63s.js"></script>
      `
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 'decp0ejel1ozsqy4i63s',
        src: 'https://embed.mediavine.com/videos/decp0ejel1ozsqy4i63s/iframe',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    // The selector matches a substring, so a lookalike host reaches `extract` and only the host
    // guard refuses it.
    it('should ignore a foreign host spelling the loader path', async () => {
      const value =
        '<script src="https://evil.test/video.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi.js"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the videos route naming no file', async () => {
      const value = '<script src="https://video.mediavine.com/videos/"></script>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore the platform loader that names no video', async () => {
      const value = '<script src="https://scripts.mediavine.com/tags/example.js"></script>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('mediavine through the pipeline', (parseHtml) => {
  // Both elements render nothing and the div is empty, so without the resolver the whole widget
  // is stripped and the video leaves the item.
  it('should recover a video that the pipeline would otherwise drop', async () => {
    const value = html`
      <div class="wprm-recipe-video">
        <div
          id="g14l64f4ixtzzffxbm1o"
          data-ratio="16:9"
        ></div>
        <script src="https://video.mediavine.com/videos/g14l64f4ixtzzffxbm1o.js"></script>
      </div>
    `
    const expected = html`
      <div
        data-embed-provider="mediavine"
        data-embed-id="g14l64f4ixtzzffxbm1o"
        data-embed-src="https://embed.mediavine.com/videos/g14l64f4ixtzzffxbm1o/iframe"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
