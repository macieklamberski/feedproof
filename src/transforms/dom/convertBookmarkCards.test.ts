import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { BookmarkResolver, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
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

describeForEachParser('convertBookmarkCards', (parseHtml) => {
  const transform = (html: string, bookmarkResolvers: Array<BookmarkResolver>) => {
    const context: TransformContext = { ...baseContext, bookmarkResolvers }
    return applyDomTransforms(parseHtml(html), [convertBookmarkCards(context)])
  }

  describe('happy paths', () => {
    it('should replace a matched element with a bookmark placeholder', async () => {
      const result = await transform(
        '<div class="card" data-url="https://example.com" data-title="Title"></div>',
        [cardResolver],
      )

      expect(result).toContain('data-bookmark-provider="stub"')
      expect(result).toContain('data-bookmark-url="https://example.com"')
      expect(result).toContain('data-bookmark-title="Title"')
      expect(result).toContain('<a href="https://example.com">Title</a>')
      expect(result).not.toContain('class="card"')
    })

    it('should emit sibling placeholders for multiple matches without a list wrapper', async () => {
      const value = html`
        <div class="card" data-url="https://example.com/1" data-title="One"></div>
        <div class="card" data-url="https://example.com/2" data-title="Two"></div>
      `
      const result = await transform(value, [cardResolver])

      expect(result).not.toContain('<ul')
      expect(result).not.toContain('<li')
      expect((result.match(/data-bookmark-provider="/g) ?? []).length).toBe(2)
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
      const value = html`
        <div class="a" data-url="https://example.org"></div>
        <div class="b" data-url="https://example.net"></div>
      `
      const expected = html`
        <div
          data-bookmark-provider="a"
          data-bookmark-url="https://example.org"
          data-bookmark-title="A"
        >
          <a href="https://example.org">A</a>
        </div>
        <div
          data-bookmark-provider="b"
          data-bookmark-url="https://example.net"
          data-bookmark-title="B"
        >
          <a href="https://example.net">B</a>
        </div>
      `

      expect(await transform(value, [resolverA, resolverB])).toEqualHtml(expected)
    })

    it('should support a resolver with a promise-returning extract', async () => {
      const asyncResolver: BookmarkResolver = {
        selector: '.card',
        extract: (element) => {
          const url = element.getAttribute('data-url')
          return Promise.resolve(url ? { provider: 'async', url, title: 'Async title' } : undefined)
        },
      }
      const value = '<div class="card" data-url="https://example.com/post"></div>'
      const expected = html`
        <div
          data-bookmark-provider="async"
          data-bookmark-url="https://example.com/post"
          data-bookmark-title="Async title"
        >
          <a href="https://example.com/post">Async title</a>
        </div>
      `

      expect(await transform(value, [asyncResolver])).toEqualHtml(expected)
    })
  })

  describe('hygiene (via createBookmarkPlaceholder)', () => {
    it('should pass http urls through without changing the protocol', async () => {
      const result = await transform(
        html`
          <div
            class="card"
            data-url="http://example.com/p"
            data-title="T"
            data-icon="http://example.com/i.ico"
          >
          </div>
        `,
        [cardResolver],
      )

      expect(result).toContain('data-bookmark-url="http://example.com/p"')
      expect(result).toContain('data-bookmark-icon="http://example.com/i.ico"')
      expect(result).toContain('<a href="http://example.com/p">')
    })

    it('should resolve relative url, icon and thumbnail against the base url', async () => {
      const context: TransformContext = {
        ...baseContext,
        bookmarkResolvers: [cardResolver],
        baseUrl: 'https://example.com/post/',
      }
      const value = html`
        <div class="card" data-url="/p" data-title="T" data-icon="/i.ico" data-thumbnail="/t.jpg">
        </div>
      `
      const result = await applyDomTransforms(parseHtml(value), [convertBookmarkCards(context)])

      expect(result).toContain('data-bookmark-url="https://example.com/p"')
      expect(result).toContain('data-bookmark-icon="https://example.com/i.ico"')
      expect(result).toContain('data-bookmark-thumbnail="https://example.com/t.jpg"')
    })

    // URL safety is neutralizeUnsafeUrls' job (see its tests); this transform only
    // emits the placeholder, so unsafe icon/thumbnail urls pass through here unchanged.
    it('should pass unsafe icon and thumbnail urls through unchanged', async () => {
      const result = await transform(
        html`
          <div
            class="card"
            data-url="https://example.com"
            data-title="T"
            data-icon="javascript:alert(1)"
            data-thumbnail="javascript:alert(2)"
          >
          </div>
        `,
        [cardResolver],
      )

      expect(result).toContain('data-bookmark-icon="javascript:alert(1)"')
      expect(result).toContain('data-bookmark-thumbnail="javascript:alert(2)"')
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

    it.todo('should surface errors when a resolver extract throws', () => {
      // An extract that throws currently rejects the whole transform run. Whether the error should
      // propagate or the element should be skipped is an open design question, so the contract is
      // not pinned yet.
    })

    it('should be idempotent', async () => {
      const value = '<div class="card" data-url="https://example.com" data-title="Title"></div>'
      const once = await transform(value, [cardResolver])
      const twice = await transform(once, [cardResolver])

      expect(twice).toBe(once)
    })
  })
})
