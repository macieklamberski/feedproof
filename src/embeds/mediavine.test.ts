import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { mediavineEmbedResolver, mediavineScriptEmbedResolver } from './mediavine.js'

describeForEachParser('mediavineEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, mediavineEmbedResolver)

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
        src: 'https://embed.mediavine.com/videos/t9z9zameefjmqvtghsvu',
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
        src: 'https://embed.mediavine.com/videos/t9z9zameefjmqvtghsvu',
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
        src: 'https://embed.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi',
        ratio: '16/9',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state no shape when the script stands alone', async () => {
      const value =
        '<script src="https://video.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi.js"></script>'
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 'dx6ydyrbrjbbu2tncqzi',
        src: 'https://embed.mediavine.com/videos/dx6ydyrbrjbbu2tncqzi',
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
        src: 'https://embed.mediavine.com/videos/decp0ejel1ozsqy4i63s',
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

    // The 94 distinct ids mined from the corpus are 19 or 20 alphanumeric characters, so anything
    // else is left to the generic handling rather than interpolated into a player url.
    it('should refuse an id outside the measured shape', async () => {
      const value = '<script src="https://video.mediavine.com/videos/short.js"></script>'

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
        data-embed-src="https://embed.mediavine.com/videos/g14l64f4ixtzzffxbm1o"
        data-embed-ratio="16/9"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
