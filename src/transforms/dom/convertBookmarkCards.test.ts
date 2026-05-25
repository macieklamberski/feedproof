import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { parseHtml } from '../../parsers/linkedom.js'
import { baseContext } from '../../tests.js'
import type { BookmarkResolver, TransformContext } from '../../types.js'
import { convertBookmarkCards } from './convertBookmarkCards.js'

// Reads bookmark fields off a `.card` element's data-* attributes.
const cardResolver: BookmarkResolver = {
  selector: '.card',
  extract: (element) => {
    const url = element.getAttribute('data-url')
    const title = element.getAttribute('data-title')

    if (!url || !title) {
      return
    }

    return {
      provider: 'stub',
      url,
      title,
      icon: element.getAttribute('data-icon') ?? undefined,
      thumbnail: element.getAttribute('data-thumbnail') ?? undefined,
    }
  },
}

const transform = (html: string, bookmarkResolvers: Array<BookmarkResolver>) => {
  const context: TransformContext = { ...baseContext, bookmarkResolvers }
  return applyDomTransforms(parseHtml(html), [convertBookmarkCards(context)])
}

describe('convertBookmarkCards', () => {
  describe('happy paths', () => {
    it('should replace a matched element with a bookmark placeholder', async () => {
      const result = await transform(
        '<div class="card" data-url="https://example.com" data-title="Title"></div>',
        [cardResolver],
      )

      expect(result).toContain('data-bookmark=""')
      expect(result).toContain('data-bookmark-provider="stub"')
      expect(result).toContain('data-bookmark-url="https://example.com"')
      expect(result).toContain('data-bookmark-title="Title"')
      expect(result).toContain('<a href="https://example.com">Title</a>')
      expect(result).not.toContain('class="card"')
    })

    it('should emit sibling placeholders for multiple matches without a list wrapper', async () => {
      const html =
        '<div class="card" data-url="https://e.com/1" data-title="One"></div>' +
        '<div class="card" data-url="https://e.com/2" data-title="Two"></div>'
      const result = await transform(html, [cardResolver])

      expect(result).not.toContain('<ul')
      expect(result).not.toContain('<li')
      expect((result.match(/data-bookmark=""/g) ?? []).length).toBe(2)
    })

    it('should run each resolver in the registry', async () => {
      const resolverA: BookmarkResolver = {
        selector: '.a',
        extract: (element) => {
          const url = element.getAttribute('data-url')
          return url ? { provider: 'a', url, title: 'A' } : undefined
        },
      }
      const resolverB: BookmarkResolver = {
        selector: '.b',
        extract: (element) => {
          const url = element.getAttribute('data-url')
          return url ? { provider: 'b', url, title: 'B' } : undefined
        },
      }
      const result = await transform(
        '<div class="a" data-url="https://a.com"></div><div class="b" data-url="https://b.com"></div>',
        [resolverA, resolverB],
      )

      expect(result).toContain('data-bookmark-provider="a"')
      expect(result).toContain('data-bookmark-provider="b"')
    })
  })

  describe('hygiene (via createBookmarkPlaceholder)', () => {
    it('should upgrade http urls to https for url and icon', async () => {
      const result = await transform(
        '<div class="card" data-url="http://example.com/p" data-title="T" data-icon="http://example.com/i.ico"></div>',
        [cardResolver],
      )

      expect(result).toContain('data-bookmark-url="https://example.com/p"')
      expect(result).toContain('data-bookmark-icon="https://example.com/i.ico"')
      expect(result).toContain('<a href="https://example.com/p">')
    })

    it('should drop unsafe icon and thumbnail urls but keep the rest of the placeholder', async () => {
      const result = await transform(
        '<div class="card" data-url="https://example.com" data-title="T" data-icon="javascript:alert(1)" data-thumbnail="javascript:alert(2)"></div>',
        [cardResolver],
      )

      expect(result).not.toContain('data-bookmark-icon')
      expect(result).not.toContain('data-bookmark-thumbnail')
      expect(result).toContain('data-bookmark-title="T"')
    })
  })

  describe('edge cases', () => {
    it('should leave content unchanged when no resolver matches', async () => {
      const value = '<p>Regular content</p>'

      expect(await transform(value, [cardResolver])).toBe(value)
    })

    it('should skip elements when the resolver returns undefined', async () => {
      const result = await transform('<div class="card"></div>', [cardResolver])

      expect(result).not.toContain('data-bookmark')
      expect(result).toContain('class="card"')
    })
  })
})
