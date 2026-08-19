import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractGeniallyViewId, geniallyResolveEmbed } from './genially.js'

const viewId = '60294f8b2ec856159ae0baa5'

describe('extractGeniallyViewId', () => {
  it('should read the id from the modern host', () => {
    const value = `https://view.genially.com/${viewId}`

    expect(extractGeniallyViewId(value)).toBe(viewId)
  })

  it('should read the id from the legacy host', () => {
    const value = `https://view.genial.ly/${viewId}`

    expect(extractGeniallyViewId(value)).toBe(viewId)
  })

  // WordPress embeds it with the fragment its own embed handler adds.
  it('should read the id from a url carrying a secret fragment', () => {
    const value = `https://view.genial.ly/${viewId}#?secret=5n2fsT8hDN`

    expect(extractGeniallyViewId(value)).toBe(viewId)
  })

  it('should read the id from a /view/ path', () => {
    const value = `https://genially.com/view/${viewId}`

    expect(extractGeniallyViewId(value)).toBe(viewId)
  })

  it('should return undefined for a genially url naming no view', () => {
    const value = 'https://genially.com/pricing'

    expect(extractGeniallyViewId(value)).toBeUndefined()
  })

  it('should return undefined for an id that is not the documented shape', () => {
    const value = 'https://view.genially.com/not-a-view-id'

    expect(extractGeniallyViewId(value)).toBeUndefined()
  })

  it('should return undefined for an uppercase id', () => {
    const value = 'https://view.genially.com/60294F8B2EC856159AE0BAA5'

    expect(extractGeniallyViewId(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractGeniallyViewId(value)).toBeUndefined()
  })
})

describe('geniallyResolveEmbed', () => {
  // The legacy host 301s to the modern one carrying the same id, so the hop is skippable.
  it('should mint the modern host from a legacy url', () => {
    const value = `https://view.genial.ly/${viewId}`
    const expected: EmbedResolverResult = {
      provider: 'genially',
      id: viewId,
      src: `https://view.genially.com/${viewId}`,
    }

    expect(geniallyResolveEmbed(value)).toEqual(expected)
  })

  it('should leave a modern url on its own host', () => {
    const value = `https://view.genially.com/${viewId}`
    const expected: EmbedResolverResult = {
      provider: 'genially',
      id: viewId,
      src: `https://view.genially.com/${viewId}`,
    }

    expect(geniallyResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a genially url naming no view', () => {
    const value = 'https://genially.com/pricing'

    expect(geniallyResolveEmbed(value)).toBeUndefined()
  })
})
