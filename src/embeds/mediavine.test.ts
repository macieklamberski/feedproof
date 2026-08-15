import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { mediavineEmbedResolver } from './mediavine.js'

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
        width: 100,
        height: 56,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should omit the dimensions for a malformed ratio', async () => {
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
})
