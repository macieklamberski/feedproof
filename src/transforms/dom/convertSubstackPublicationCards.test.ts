import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { parseHtml } from '../../parsers/linkedom.js'
import { baseContext } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { convertSubstackPublicationCards } from './convertSubstackPublicationCards.js'

const makeCard = (
  options: {
    name?: string
    baseUrl?: string
    logoUrl?: string
    heroText?: string
    authorName?: string
    rawDataAttrs?: string
    omitDataAttrs?: boolean
  } = {},
): string => {
  if (options.omitDataAttrs) {
    return '<div class="embedded-publication-wrap"></div>'
  }

  // JSON.stringify drops keys whose value is undefined, mirroring Substack's
  // behaviour of only serialising the fields it has.
  const raw =
    options.rawDataAttrs ??
    JSON.stringify({
      name: options.name,
      base_url: options.baseUrl,
      logo_url: options.logoUrl,
      hero_text: options.heroText,
      author_name: options.authorName,
    })

  // Substack stores the JSON in a double-quoted attribute with the inner
  // quotes HTML-encoded, which is what survives a parse/serialise roundtrip.
  const encoded = raw.replace(/"/g, '&quot;')

  return `<div class="embedded-publication-wrap" data-attrs="${encoded}"></div>`
}

describe('convertSubstackPublicationCards', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [convertSubstackPublicationCards(context)])
  }

  describe('happy paths', () => {
    it('should emit a placeholder with all fields when the source card is complete', async () => {
      const value = makeCard({
        name: 'The Reader',
        baseUrl: 'https://thereader.substack.com',
        logoUrl: 'https://substackcdn.com/image/logo.png',
        heroText: 'A newsletter about things.',
        authorName: 'Author name',
      })
      const result = await transform(value)

      expect(result).toContain('data-widget-kind="bookmark"')
      expect(result).toContain('data-widget-provider="substack"')
      expect(result).toContain('data-widget-url="https://thereader.substack.com"')
      expect(result).toContain('data-widget-title="The Reader"')
      expect(result).toContain('data-widget-description="A newsletter about things."')
      expect(result).toContain('data-widget-author="Author name"')
      expect(result).toContain('data-widget-icon="https://substackcdn.com/image/logo.png"')
      expect(result).toContain('<a href="https://thereader.substack.com">The Reader</a>')
      expect(result).not.toContain('embedded-publication-wrap')
    })

    it('should omit optional attributes when only name and base_url are present', async () => {
      const value = makeCard({
        name: 'The Reader',
        baseUrl: 'https://thereader.substack.com',
      })
      const result = await transform(value)

      expect(result).toContain('data-widget-title="The Reader"')
      expect(result).toContain('data-widget-url="https://thereader.substack.com"')
      expect(result).not.toContain('data-widget-description')
      expect(result).not.toContain('data-widget-author')
      expect(result).not.toContain('data-widget-icon')
    })

    it('should include description and author when the logo is missing', async () => {
      const value = makeCard({
        name: 'The Reader',
        baseUrl: 'https://thereader.substack.com',
        heroText: 'Preview text',
        authorName: 'Author name',
      })
      const result = await transform(value)

      expect(result).toContain('data-widget-description="Preview text"')
      expect(result).toContain('data-widget-author="Author name"')
      expect(result).not.toContain('data-widget-icon')
    })
  })

  describe('edge cases', () => {
    it('should leave content unchanged when no publication cards are present', async () => {
      const value = '<p>Regular content without publication cards</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave the card untouched when base_url is missing', async () => {
      const value = makeCard({ name: 'The Reader' })

      expect(await transform(value)).toBe(value)
    })

    it('should leave the card untouched when name is missing', async () => {
      const value = makeCard({ baseUrl: 'https://thereader.substack.com' })

      expect(await transform(value)).toBe(value)
    })

    it('should leave the card untouched when data-attrs is malformed json', async () => {
      const value = makeCard({ rawDataAttrs: 'not-json' })

      expect(await transform(value)).toBe(value)
    })

    it('should leave the card untouched when data-attrs is absent', async () => {
      const value = makeCard({ omitDataAttrs: true })

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = makeCard({
        name: 'The Reader',
        baseUrl: 'https://thereader.substack.com',
        heroText: 'Preview text',
      })
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })

    it('should emit sibling placeholders for consecutive cards without wrapping them in a list', async () => {
      const value = [
        makeCard({ name: 'Pub 1', baseUrl: 'https://pub1.substack.com' }),
        makeCard({ name: 'Pub 2', baseUrl: 'https://pub2.substack.com' }),
      ].join('')
      const result = await transform(value)

      expect(result).not.toContain('<ul')
      expect(result).not.toContain('<li')

      const placeholderCount = (result.match(/data-widget-kind="bookmark"/g) ?? []).length
      expect(placeholderCount).toBe(2)
    })

    it('should drop an unsafe logo url but keep the rest of the placeholder', async () => {
      const value = makeCard({
        name: 'The Reader',
        baseUrl: 'https://thereader.substack.com',
        logoUrl: 'javascript:alert(1)',
      })
      const result = await transform(value)

      expect(result).not.toContain('data-widget-icon')
      expect(result).toContain('data-widget-title="The Reader"')
    })

    it('should upgrade http urls to https for url and icon', async () => {
      const value = makeCard({
        name: 'The Reader',
        baseUrl: 'http://thereader.substack.com',
        logoUrl: 'http://substackcdn.com/image/logo.png',
      })
      const result = await transform(value)

      expect(result).toContain('data-widget-url="https://thereader.substack.com"')
      expect(result).toContain('data-widget-icon="https://substackcdn.com/image/logo.png"')
      expect(result).toContain('<a href="https://thereader.substack.com">')
    })
  })
})
