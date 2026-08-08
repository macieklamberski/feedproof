import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser } from '../tests.js'
import { convertWidgets } from '../transforms/dom/convertWidgets.js'
import type { EmbedResolverResult } from '../types.js'
import { applyDomTransforms } from '../utils/transforms.js'
import { mediavineEmbedResolver } from './mediavine.js'

describeForEachParser('mediavineEmbedResolver', (parseHtml) => {
  const extract = (value: string): EmbedResolverResult | undefined => {
    const element = parseHtml(value).querySelector(mediavineEmbedResolver.selector)

    return element ? (mediavineEmbedResolver.extract(element) as EmbedResolverResult) : undefined
  }

  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [
      convertWidgets({ ...baseContext, widgetResolvers: [mediavineEmbedResolver] }),
    ])
  }

  describe('happy paths', () => {
    it('should mint the embed player url from the video id', () => {
      const value =
        '<div class="mv-video-target mv-video-id-t9z9zameefjmqvtghsvu" data-video-id="t9z9zameefjmqvtghsvu" data-ratio="16:9" data-volume="70"></div>'
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 't9z9zameefjmqvtghsvu',
        src: 'https://embed.mediavine.com/videos/t9z9zameefjmqvtghsvu',
        width: 100,
        height: 56,
      }

      expect(extract(value)).toEqual(expected)
    })

    it('should replace the empty div with an embed placeholder', async () => {
      const value =
        '<div class="mv-video-target mv-video-id-t9z9zameefjmqvtghsvu" data-video-id="t9z9zameefjmqvtghsvu" data-ratio="16:9" data-volume="70"></div>'
      const result = await transform(value)

      expect(result).toContain('data-embed-provider="mediavine"')
      expect(result).not.toContain('mv-video-target')
    })
  })

  describe('edge cases', () => {
    it('should omit the dimensions for a malformed ratio', () => {
      const value =
        '<div class="mv-video-target mv-video-id-t9z9zameefjmqvtghsvu" data-video-id="t9z9zameefjmqvtghsvu" data-ratio="wide"></div>'
      const expected: EmbedResolverResult = {
        provider: 'mediavine',
        id: 't9z9zameefjmqvtghsvu',
        src: 'https://embed.mediavine.com/videos/t9z9zameefjmqvtghsvu',
      }

      expect(extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for an empty video id', () => {
      const value = '<div class="mv-video-target mv-video-id-" data-video-id=""></div>'

      expect(extract(value)).toBeUndefined()
    })

    it('should not match a target div without the video id attribute', () => {
      const value = '<div class="mv-video-target" data-ratio="16:9"></div>'

      expect(extract(value)).toBeUndefined()
    })
  })
})
