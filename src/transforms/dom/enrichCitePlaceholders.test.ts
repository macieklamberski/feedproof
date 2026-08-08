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
      return new Map()
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
      return new Map()
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
      return new Map([['https://example.com/post', data]])
    }
    const result = await transform(value, withFn(fn))

    expect(result).toContain('data-cite-title="Page title"')
    expect(result).toContain('data-cite-description="Preview text"')
    expect(result).toContain('data-cite-publisher="example.com"')
    expect(result).toContain('data-cite-thumbnail="https://example.com/cover.jpg"')
  })

  it('should write the enriched date normalized through parseDateFn', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      return new Map([['https://example.com/post', { date: 'January 13th, 2023' }]])
    }
    const parseDateFn = (raw: string) => {
      return raw === 'January 13th, 2023' ? '2023-01-13' : undefined
    }
    const result = await transform(value, { ...withFn(fn), parseDateFn })

    expect(result).toContain('data-cite-date="2023-01-13"')
  })

  it('should keep the raw enriched date when the hook returns undefined', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      return new Map([['https://example.com/post', { date: 'January 13th, 2023' }]])
    }
    const parseDateFn = () => undefined
    const result = await transform(value, { ...withFn(fn), parseDateFn })

    expect(result).toContain('data-cite-date="January 13th, 2023"')
  })

  it('should keep the raw enriched date when no hook is provided', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      return new Map([['https://example.com/post', { date: 'January 13th, 2023' }]])
    }
    const result = await transform(value, withFn(fn))

    expect(result).toContain('data-cite-date="January 13th, 2023"')
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
      return new Map([['https://example.com/post', { title: 'Enrichment title' }]])
    }
    const result = await transform(value, withFn(fn))

    expect(result).toContain('data-cite-title="Resolver title"')
    expect(result).not.toContain('Enrichment title')
  })

  it('should apply one entry to every placeholder citing that url, whatever their provider', async () => {
    const value = html`
      <div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>
      <div data-cite-provider="ghost" data-cite-url="https://example.com/post"></div>
    `
    const fn: EnrichCiteFn = () => {
      return new Map([['https://example.com/post', { title: 'Page title' }]])
    }
    const result = await transform(value, withFn(fn))

    expect(result.match(/data-cite-title="Page title"/g)).toHaveLength(2)
  })

  it('should propagate an exception thrown by enrichCiteFn', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = () => {
      throw new Error('boom')
    }

    await expect(transform(value, withFn(fn))).rejects.toThrow('boom')
  })

  it('should silently skip placeholders missing from the returned map', async () => {
    const value = html`
      <div data-cite-provider="tumblr" data-cite-url="https://example.com/known"></div>
      <div data-cite-provider="tumblr" data-cite-url="https://example.com/unknown"></div>
    `
    const fn: EnrichCiteFn = () => {
      return new Map([['https://example.com/known', { title: 'Found' }]])
    }
    const result = await transform(value, withFn(fn))

    expect(result).toContain('data-cite-url="https://example.com/known"')
    expect(result).toContain('data-cite-url="https://example.com/unknown"')
    expect(result).toContain('data-cite-title="Found"')
    const titleMatches = result.match(/data-cite-title=/g)
    expect(titleMatches).toHaveLength(1)
  })

  it('should accept async (Promise-returning) enrichCiteFn', async () => {
    const value = '<div data-cite-provider="tumblr" data-cite-url="https://example.com/post"></div>'
    const fn: EnrichCiteFn = async (cites) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return new Map(cites.map((cite) => [cite.url, { title: 'Page title' }]))
    }
    const result = await transform(value, withFn(fn))

    expect(result).toContain('data-cite-title="Page title"')
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
      return new Map([['https://example.com/post', data]])
    }
    const once = await transform(value, withFn(fn))
    const twice = await transform(once, withFn(fn))

    expect(twice).toBe(once)
  })
})
