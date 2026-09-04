import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { donorboxEmbedResolver, donorboxResolveEmbed } from './donorbox.js'

describe('donorboxResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from a form url', () => {
      const value = 'https://donorbox.org/embed/donation-form-248'
      const expected: EmbedResolverResult = {
        provider: 'donorbox',
        id: 'donation-form-248',
        src: 'https://donorbox.org/embed/donation-form-248',
        url: 'https://donorbox.org/donation-form-248',
        height: 900,
      }

      expect(donorboxResolveEmbed(value)).toEqual(expected)
    })

    it('should keep the query the publisher wrote', () => {
      const value = 'https://donorbox.org/embed/donation-form-248?default_interval=m&amount=25'
      const expected: EmbedResolverResult = {
        provider: 'donorbox',
        id: 'donation-form-248',
        src: 'https://donorbox.org/embed/donation-form-248?default_interval=m&amount=25',
        url: 'https://donorbox.org/donation-form-248',
        height: 900,
      }

      expect(donorboxResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore the campaign page, which is a link and not a form', () => {
      expect(donorboxResolveEmbed('https://donorbox.org/donation-form-248')).toBeUndefined()
    })

    it('should ignore a blog post on the same host', () => {
      const value = 'https://donorbox.org/nonprofit-blog/end-of-year-giving-statistics'

      expect(donorboxResolveEmbed(value)).toBeUndefined()
    })

    it('should ignore a form path with a trailing segment', () => {
      expect(donorboxResolveEmbed('https://donorbox.org/embed/donation-form-248/x')).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', () => {
      expect(donorboxResolveEmbed('https://evil.test/donorbox.org/embed/x')).toBeUndefined()
    })
  })
})

describeForEachParser('donorboxEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, donorboxEmbedResolver)

  describe('happy paths', () => {
    it('should size a frame that states no height', async () => {
      const value = html`
        <iframe
          src="https://donorbox.org/embed/global-voices-challenge"
          width="100%"
          style="max-width:500px; min-width:310px;"
          seamless="seamless"
          id="dbox-form-embed"
          name="donorbox"
          frameborder="0"
          scrolling="no"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'donorbox',
        id: 'global-voices-challenge',
        src: 'https://donorbox.org/embed/global-voices-challenge',
        url: 'https://donorbox.org/global-voices-challenge',
        height: 900,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the height the snippet states with its px unit', async () => {
      const value = html`
        <iframe
          style="max-width: 500px; min-width: 250px; max-height: none!important;"
          src="https://donorbox.org/embed/donation-form-248"
          name="donorbox"
          width="100%"
          height="900px"
          frameborder="0"
          scrolling="no"
          seamless="seamless"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'donorbox',
        id: 'donation-form-248',
        src: 'https://donorbox.org/embed/donation-form-248',
        url: 'https://donorbox.org/donation-form-248',
        height: 900,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/donorbox.org/embed/donation-form-248"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})
