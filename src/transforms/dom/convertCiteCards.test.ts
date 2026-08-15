import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { CiteResolver, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertCiteCards } from './convertCiteCards.js'

// Reads cite fields off a `.card` element's data-* attributes.
const cardResolver: CiteResolver = {
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
      date: element.getAttribute('data-date') ?? undefined,
    }
  },
}

describeForEachParser('convertCiteCards', (parseHtml) => {
  const transform = (
    html: string,
    citeResolvers: Array<CiteResolver>,
    context: TransformContext = baseContext,
  ) => {
    return applyDomTransforms(parseHtml(html), [convertCiteCards({ ...context, citeResolvers })])
  }

  describe('happy paths', () => {
    it('should replace a matched element with a cite placeholder', async () => {
      const value = html`
        <div
          class="card"
          data-url="https://example.com"
          data-title="Title"
        ></div>
      `
      const expected = html`
        <div
          data-cite-provider="stub"
          data-cite-url="https://example.com"
          data-cite-title="Title"
        ></div>
      `

      expect(await transform(value, [cardResolver])).toEqualHtml(expected)
    })

    it('should emit sibling placeholders for multiple matches without a list wrapper', async () => {
      const value = html`
        <div class="card" data-url="https://example.com/1" data-title="One"></div>
        <div class="card" data-url="https://example.com/2" data-title="Two"></div>
      `
      const result = await transform(value, [cardResolver])

      expect(result).not.toContain('<ul')
      expect(result).not.toContain('<li')
      expect((result.match(/data-cite-provider="/g) ?? []).length).toBe(2)
    })

    it('should run each resolver in the registry', async () => {
      const resolverA: CiteResolver = {
        selector: '.a',
        extract: (element) => {
          const url = element.getAttribute('data-url')
          return url ? { provider: 'a', url, title: 'A' } : undefined
        },
      }
      const resolverB: CiteResolver = {
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
          data-cite-provider="a"
          data-cite-url="https://example.org"
          data-cite-title="A"
        ></div>
        <div
          data-cite-provider="b"
          data-cite-url="https://example.net"
          data-cite-title="B"
        ></div>
      `

      expect(await transform(value, [resolverA, resolverB])).toEqualHtml(expected)
    })

    it('should support a resolver with a promise-returning extract', async () => {
      const asyncResolver: CiteResolver = {
        selector: '.card',
        extract: (element) => {
          const url = element.getAttribute('data-url')
          return Promise.resolve(url ? { provider: 'async', url, title: 'Async title' } : undefined)
        },
      }
      const value = '<div class="card" data-url="https://example.com/post"></div>'
      const expected = html`
        <div
          data-cite-provider="async"
          data-cite-url="https://example.com/post"
          data-cite-title="Async title"
        ></div>
      `

      expect(await transform(value, [asyncResolver])).toEqualHtml(expected)
    })
  })

  describe('hygiene (via createCitePlaceholder)', () => {
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

      expect(result).toContain('data-cite-url="http://example.com/p"')
      expect(result).toContain('data-cite-icon="http://example.com/i.ico"')
    })

    it('should resolve relative url, icon and thumbnail against the base url', async () => {
      const context: TransformContext = {
        ...baseContext,
        citeResolvers: [cardResolver],
        baseUrl: 'https://example.com/post/',
      }
      const value = html`
        <div class="card" data-url="/p" data-title="T" data-icon="/i.ico" data-thumbnail="/t.jpg">
        </div>
      `
      const result = await applyDomTransforms(parseHtml(value), [convertCiteCards(context)])

      expect(result).toContain('data-cite-url="https://example.com/p"')
      expect(result).toContain('data-cite-icon="https://example.com/i.ico"')
      expect(result).toContain('data-cite-thumbnail="https://example.com/t.jpg"')
    })

    it('should clean the url with the provided cleanUrlFn', async () => {
      const context: TransformContext = {
        ...baseContext,
        citeResolvers: [cardResolver],
        cleanUrlFn: (url) => url.split('?')[0] ?? url,
      }
      const value = html`
        <div class="card" data-url="https://example.com/p?utm_source=feed" data-title="T"></div>
      `
      const result = await applyDomTransforms(parseHtml(value), [convertCiteCards(context)])

      expect(result).toContain('data-cite-url="https://example.com/p"')
    })

    it('should clean the url after resolving it against the base url', async () => {
      const context: TransformContext = {
        ...baseContext,
        citeResolvers: [cardResolver],
        baseUrl: 'https://example.com/post/',
        cleanUrlFn: (url) => url.split('?')[0] ?? url,
      }
      const value = html`
        <div class="card" data-url="/p?utm_source=feed" data-title="T"></div>
      `
      const result = await applyDomTransforms(parseHtml(value), [convertCiteCards(context)])

      expect(result).toContain('data-cite-url="https://example.com/p"')
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

      expect(result).toContain('data-cite-icon="javascript:alert(1)"')
      expect(result).toContain('data-cite-thumbnail="javascript:alert(2)"')
      expect(result).toContain('data-cite-title="T"')
    })
  })

  describe('edge cases', () => {
    it('should leave content unchanged when no resolver matches', async () => {
      const value = '<p>Regular content</p>'

      expect(await transform(value, [cardResolver])).toBe(value)
    })

    it('should skip elements when the resolver returns undefined', async () => {
      const result = await transform('<div class="card"></div>', [cardResolver])

      expect(result).not.toContain('data-cite')
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

  describe('parseDateFn', () => {
    const value =
      '<div class="card" data-url="https://example.com" data-title="Title" data-date="2018.10.14"></div>'

    it('should write the normalized date when the hook parses it', async () => {
      const parseDateFn = (raw: string) => {
        return raw === '2018.10.14' ? '2018-10-14' : undefined
      }
      const result = await transform(value, [cardResolver], { ...baseContext, parseDateFn })

      expect(result).toContain('data-cite-date="2018-10-14"')
    })

    it('should keep the raw date when the hook returns undefined', async () => {
      const parseDateFn = () => undefined
      const result = await transform(value, [cardResolver], { ...baseContext, parseDateFn })

      expect(result).toContain('data-cite-date="2018.10.14"')
    })

    it('should keep the raw date when no hook is provided', async () => {
      const result = await transform(value, [cardResolver])

      expect(result).toContain('data-cite-date="2018.10.14"')
    })

    it('should not call the hook when the card has no date', async () => {
      const calls: Array<string> = []
      const parseDateFn = (raw: string) => {
        calls.push(raw)
        return raw
      }
      const noDate = '<div class="card" data-url="https://example.com" data-title="Title"></div>'
      const result = await transform(noDate, [cardResolver], { ...baseContext, parseDateFn })

      expect(result).not.toContain('data-cite-date')
      expect(calls).toEqual([])
    })
  })
})
