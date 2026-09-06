import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { guardianEmbedResolver, guardianResolveEmbed } from './guardian.js'

describe('guardianResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from the player url', () => {
      const value =
        'https://embed.theguardian.com/embed/video/society/video/2015/jun/18/superbugs-la-mrsa-pigs-antibiotics-video'
      const expected: EmbedResolverResult = {
        provider: 'guardian',
        id: 'society/video/2015/jun/18/superbugs-la-mrsa-pigs-antibiotics-video',
        src: 'https://embed.theguardian.com/embed/video/society/video/2015/jun/18/superbugs-la-mrsa-pigs-antibiotics-video',
        url: 'https://www.theguardian.com/society/video/2015/jun/18/superbugs-la-mrsa-pigs-antibiotics-video',
        ratio: '16/9',
      }

      expect(guardianResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for the video page itself', () => {
      const value =
        'https://www.theguardian.com/society/video/2015/jun/18/superbugs-la-mrsa-pigs-antibiotics-video'

      expect(guardianResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for an embed path that is not a video', () => {
      const value = 'https://embed.theguardian.com/embed/video/society/2015/jun/18/superbugs'

      expect(guardianResolveEmbed(value)).toBeUndefined()
    })

    it('should return undefined for a lookalike host', () => {
      const value =
        'https://embed.theguardian.com.evil.test/embed/video/society/video/2015/jun/18/superbugs-video'

      expect(guardianResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('guardianEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, guardianEmbedResolver)

  // The snippet states 560 by 315, and the measured ratio is preferred over it.
  it('should resolve the pasted player iframe', async () => {
    const value = html`
      <iframe
        src="https://embed.theguardian.com/embed/video/world/video/2015/oct/08/ashton-carter-nato-russian-forces-behaving-unprofessionally-syria-video"
        width="560"
        height="315"
        allowfullscreen="yes"
      ></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'guardian',
      id: 'world/video/2015/oct/08/ashton-carter-nato-russian-forces-behaving-unprofessionally-syria-video',
      src: 'https://embed.theguardian.com/embed/video/world/video/2015/oct/08/ashton-carter-nato-russian-forces-behaving-unprofessionally-syria-video',
      url: 'https://www.theguardian.com/world/video/2015/oct/08/ashton-carter-nato-russian-forces-behaving-unprofessionally-syria-video',
      ratio: '16/9',
    }

    expect(await extract(value)).toEqual(expected)
  })

  it('should ignore a foreign host carrying the same path', async () => {
    const value =
      '<iframe src="https://evil.test/embed.theguardian.com/embed/video/world/video/2015/oct/08/syria-video"></iframe>'

    expect(await extract(value)).toBeUndefined()
  })
})
