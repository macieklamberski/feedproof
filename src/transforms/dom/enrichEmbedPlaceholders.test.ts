import { expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { EmbedResolverResult, EnrichEmbedFn, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { enrichEmbedPlaceholders } from './enrichEmbedPlaceholders.js'

const withFn = (enrichEmbedFn: EnrichEmbedFn): TransformContext => {
  return { ...baseContext, enrichEmbedFn }
}

describeForEachParser('enrichEmbedPlaceholders', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [enrichEmbedPlaceholders(context)])
  }

  it('should be a no-op when enrichEmbedFn is not provided', async () => {
    const value = '<div data-embed-provider="youtube" data-embed-id="abc"></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should not call enrichEmbedFn when no placeholders have provider and id', async () => {
    const value = html`
      <p>No embeds here</p>
      <div></div>
    `
    let called = false
    const fn: EnrichEmbedFn = () => {
      called = true
      return []
    }

    await transform(value, withFn(fn))

    expect(called).toBe(false)
  })

  it('should call enrichEmbedFn once with all collected placeholders', async () => {
    const value = html`
      <div data-embed-provider="youtube" data-embed-id="abc"></div>
      <div data-embed-provider="vimeo" data-embed-id="123"></div>
    `
    const calls: Array<Array<{ provider: string; id: string }>> = []
    const fn: EnrichEmbedFn = (embeds) => {
      calls.push(embeds)
      return []
    }

    await transform(value, withFn(fn))

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual([
      { provider: 'youtube', id: 'abc' },
      { provider: 'vimeo', id: '123' },
    ])
  })

  it('should write returned fields as data-embed-* attributes', async () => {
    const value = '<div data-embed-provider="youtube" data-embed-id="abc"></div>'
    const fn: EnrichEmbedFn = () => {
      const data: Partial<EmbedResolverResult> = {
        title: 'Sample Title',
        description: 'Sample description',
        author: 'channel name',
        publisher: 'r/example',
        date: '2026-08-09',
        duration: 125,
      }
      return [{ ...data }]
    }
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="abc"
        data-embed-title="Sample Title"
        data-embed-description="Sample description"
        data-embed-author="channel name"
        data-embed-publisher="r/example"
        data-embed-date="2026-08-09"
        data-embed-duration="125"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  it('should write the enriched date normalized through parseDateFn', async () => {
    const value = '<div data-embed-provider="youtube" data-embed-id="abc"></div>'
    const fn: EnrichEmbedFn = () => {
      return [{ date: '2018.10.14' }]
    }
    const parseDateFn = (raw: string) => {
      return raw.replaceAll('.', '-')
    }
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="abc"
        data-embed-date="2018-10-14"
      ></div>
    `

    expect(await transform(value, { ...withFn(fn), parseDateFn })).toEqualHtml(expected)
  })

  it('should keep the raw enriched date when parseDateFn returns undefined', async () => {
    const value = '<div data-embed-provider="youtube" data-embed-id="abc"></div>'
    const fn: EnrichEmbedFn = () => {
      return [{ date: 'Jul 14' }]
    }
    const parseDateFn = () => undefined
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="abc"
        data-embed-date="Jul 14"
      ></div>
    `

    expect(await transform(value, { ...withFn(fn), parseDateFn })).toEqualHtml(expected)
  })

  it('should not overwrite existing data-embed-* attributes', async () => {
    const value = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="abc"
        data-embed-title="Resolver Title"
      >
      </div>
    `
    const fn: EnrichEmbedFn = () => {
      return [{ title: 'Enrichment Title' }]
    }
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="abc"
        data-embed-title="Resolver Title"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  it('should propagate an exception thrown by enrichEmbedFn', async () => {
    const value = '<div data-embed-provider="youtube" data-embed-id="abc"></div>'
    const fn: EnrichEmbedFn = () => {
      throw new Error('boom')
    }

    await expect(transform(value, withFn(fn))).rejects.toThrow('boom')
  })

  // The answer is positional, so nothing found for a placeholder is an undefined in its slot.
  it('should leave a placeholder alone when its slot is undefined', async () => {
    const value = html`
      <div data-embed-provider="youtube" data-embed-id="known"></div>
      <div data-embed-provider="youtube" data-embed-id="unknown"></div>
    `
    const fn: EnrichEmbedFn = () => {
      return [{ title: 'Found' }, undefined]
    }
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="known"
        data-embed-title="Found"
      ></div>
      <div
        data-embed-provider="youtube"
        data-embed-id="unknown"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  // An enricher that answers for fewer embeds than it was sent leaves the tail untouched rather
  // than failing the whole pass.
  it('should treat a short answer as nothing for the placeholders past its end', async () => {
    const value = html`
      <div data-embed-provider="youtube" data-embed-id="first"></div>
      <div data-embed-provider="youtube" data-embed-id="second"></div>
    `
    const fn: EnrichEmbedFn = () => {
      return [{ title: 'Found' }]
    }
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="first"
        data-embed-title="Found"
      ></div>
      <div
        data-embed-provider="youtube"
        data-embed-id="second"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  it('should accept async (Promise-returning) enrichEmbedFn', async () => {
    const value = '<div data-embed-provider="youtube" data-embed-id="abc"></div>'
    const fn: EnrichEmbedFn = async (embeds) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return embeds.map((embed) => ({ title: `t-${embed.id}` }))
    }
    const expected = html`
      <div
        data-embed-provider="youtube"
        data-embed-id="abc"
        data-embed-title="t-abc"
      ></div>
    `

    expect(await transform(value, withFn(fn))).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = '<div data-embed-provider="youtube" data-embed-id="abc"></div>'
    const fn: EnrichEmbedFn = () => {
      const data: Partial<EmbedResolverResult> = {
        title: 'Sample Title',
        description: 'Sample description',
        author: 'channel name',
        duration: 125,
      }
      return [{ ...data }]
    }
    const once = await transform(value, withFn(fn))
    const twice = await transform(once, withFn(fn))

    expect(twice).toBe(once)
  })
})
