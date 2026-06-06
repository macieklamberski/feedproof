import { expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { EmbedResolverResult, EnrichEmbedFn, TransformContext } from '../../types.js'
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
    const value = '<p>No embeds here</p><div></div>'
    let called = false
    const fn: EnrichEmbedFn = () => {
      called = true
      return new Map()
    }

    await transform(value, withFn(fn))

    expect(called).toBe(false)
  })

  it('should call enrichEmbedFn once with all collected placeholders', async () => {
    const value = `
      <div data-embed-provider="youtube" data-embed-id="abc"></div>
      <div data-embed-provider="vimeo" data-embed-id="123"></div>
    `
    const calls: Array<Array<{ provider: string; id: string }>> = []
    const fn: EnrichEmbedFn = (embeds) => {
      calls.push(embeds)
      return new Map()
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
        duration: 125,
      }
      return new Map([['youtube:abc', data]])
    }
    const result = await transform(value, withFn(fn))

    expect(result).toContain('data-embed-title="Sample Title"')
    expect(result).toContain('data-embed-description="Sample description"')
    expect(result).toContain('data-embed-author="channel name"')
    expect(result).toContain('data-embed-duration="125"')
  })

  it('should not overwrite existing data-embed-* attributes', async () => {
    const value =
      '<div data-embed-provider="youtube" data-embed-id="abc" data-embed-title="Resolver Title"></div>'
    const fn: EnrichEmbedFn = () => {
      return new Map([['youtube:abc', { title: 'Enrichment Title' }]])
    }
    const result = await transform(value, withFn(fn))

    expect(result).toContain('data-embed-title="Resolver Title"')
    expect(result).not.toContain('Enrichment Title')
  })

  it('should swallow exceptions thrown by enrichEmbedFn', async () => {
    const value = '<div data-embed-provider="youtube" data-embed-id="abc"></div>'
    const fn: EnrichEmbedFn = () => {
      throw new Error('boom')
    }
    const result = await transform(value, withFn(fn))

    expect(result).toBe(value)
  })

  it('should silently skip placeholders missing from the returned map', async () => {
    const value = `
      <div data-embed-provider="youtube" data-embed-id="known"></div>
      <div data-embed-provider="youtube" data-embed-id="unknown"></div>
    `
    const fn: EnrichEmbedFn = () => {
      return new Map([['youtube:known', { title: 'Found' }]])
    }
    const result = await transform(value, withFn(fn))

    expect(result).toContain('data-embed-id="known"')
    expect(result).toContain('data-embed-id="unknown"')
    expect(result).toContain('data-embed-title="Found"')
    const titleMatches = result.match(/data-embed-title=/g)
    expect(titleMatches).toHaveLength(1)
  })

  it('should accept async (Promise-returning) enrichEmbedFn', async () => {
    const value = '<div data-embed-provider="youtube" data-embed-id="abc"></div>'
    const fn: EnrichEmbedFn = async (embeds) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return new Map(embeds.map((e) => [`${e.provider}:${e.id}`, { title: `t-${e.id}` }]))
    }
    const result = await transform(value, withFn(fn))

    expect(result).toContain('data-embed-title="t-abc"')
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
      return new Map([['youtube:abc', data]])
    }
    const once = await transform(value, withFn(fn))
    const twice = await transform(once, withFn(fn))

    expect(twice).toBe(once)
  })
})
