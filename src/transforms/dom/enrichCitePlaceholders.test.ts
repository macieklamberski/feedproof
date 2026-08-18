import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { CiteResolverResult, EnrichCiteFn, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { enrichCitePlaceholders } from './enrichCitePlaceholders.js'

const withFn = (enrichCiteFn: EnrichCiteFn): TransformContext => {
  return { ...baseContext, enrichCiteFn }
}

describeForEachParser('enrichCitePlaceholders', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [enrichCitePlaceholders(context)])
  }

  it('should be a no-op when enrichCiteFn is not provided', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should not call enrichCiteFn when no placeholders have provider and url', async () => {
    const value = html`
      <p>No cites here</p>
      <div></div>
    `
    let called = false
    const fn: EnrichCiteFn = () => {
      called = true
      return []
    }

    await transform(value, withFn(fn))

    expect(called).toBe(false)
  })

  it('should call enrichCiteFn once with all collected placeholders', async () => {
    const value = html`
      <div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>
      <div data-cite-provider="ghost" data-cite-url="https://example.org/other"></div>
    `
    const calls: Array<Array<{ provider: string; url: string }>> = []
    const fn: EnrichCiteFn = (cites) => {
      calls.push(cites)
      return []
    }

    await transform(value, withFn(fn))

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual([
      { provider: 'tumblr', url: 'https://example.com/post' },
      { provider: 'ghost', url: 'https://example.org/other' },
    ])
  })

  it('should write returned fields as data-cite-* attributes', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      const data: Partial<CiteResolverResult> = {
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        thumbnail: 'https://example.com/cover.jpg',
      }
      return [{ ...data }]
    }
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-title="Page title"
        data-cite-description="Preview text"
        data-cite-publisher="example.com"
        data-cite-thumbnail="https://example.com/cover.jpg"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  it('should write the enriched date normalized through parseDateFn', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      return [{ date: 'January 13th, 2023' }]
    }
    const parseDateFn = (raw: string) => {
      return raw === 'January 13th, 2023' ? '2023-01-13' : undefined
    }
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-date="2023-01-13"
      ></div>
    `

    expect(await transform(value, { ...withFn(fn), parseDateFn })).toEqualHtml(expected)
  })

  it('should keep the raw enriched date when the hook returns undefined', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      return [{ date: 'January 13th, 2023' }]
    }
    const parseDateFn = () => undefined
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-date="January 13th, 2023"
      ></div>
    `

    expect(await transform(value, { ...withFn(fn), parseDateFn })).toEqualHtml(expected)
  })

  it('should keep the raw enriched date when no hook is provided', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      return [{ date: 'January 13th, 2023' }]
    }
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-date="January 13th, 2023"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  it('should not overwrite existing data-cite-* attributes', async () => {
    const value = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-title="Resolver title"
      >
      </div>
    `
    const fn: EnrichCiteFn = () => {
      return [{ title: 'Enrichment title' }]
    }
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-title="Resolver title"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  // Two placeholders citing one url arrive as two entries and expect two answers. Whether the
  // enricher fetches the url once or twice behind that is its own business.
  it('should hand the enricher one entry per placeholder, even for a repeated url', async () => {
    const value = html`
      <div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>
      <div data-cite-provider="ghost" data-cite-url="https://example.com/post"></div>
    `
    const fn: EnrichCiteFn = (cites) => {
      return cites.map(() => ({ title: 'Page title' }))
    }
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-title="Page title"
      ></div>
      <div
        data-cite-provider="ghost"
        data-cite-url="https://example.com/post"
        data-cite-title="Page title"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  it('should propagate an exception thrown by enrichCiteFn', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      throw new Error('boom')
    }

    await expect(transform(value, withFn(fn))).rejects.toThrow('boom')
  })

  // The answer is positional, so nothing found for a placeholder is an undefined in its slot.
  it('should leave a placeholder alone when its slot is undefined', async () => {
    const value = html`
      <div data-cite-provider="tumblr" data-cite-url="https://example.com/known"></div>
      <div data-cite-provider="tumblr" data-cite-url="https://example.com/unknown"></div>
    `
    const fn: EnrichCiteFn = () => {
      return [{ title: 'Found' }, undefined]
    }
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/known"
        data-cite-title="Found"
      ></div>
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/unknown"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  it('should accept async (Promise-returning) enrichCiteFn', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = async (cites) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return cites.map(() => ({ title: 'Page title' }))
    }
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-title="Page title"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      const data: Partial<CiteResolverResult> = {
        title: 'Page title',
        description: 'Preview text',
        publisher: 'example.com',
        thumbnail: 'https://example.com/cover.jpg',
      }
      return [{ ...data }]
    }
    const once = await transform(value, withFn(fn))
    const twice = await transform(once, withFn(fn))

    expect(twice).toBe(once)
  })
})
