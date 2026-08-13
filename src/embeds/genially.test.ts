import { describe, expect, it } from 'bun:test'
import { extractGeniallyViewId, geniallyResolveEmbed } from './genially.js'

const viewId = '60294f8b2ec856159ae0baa5'

describe('extractGeniallyViewId', () => {
  it('should read the id from the modern host', () => {
    expect(extractGeniallyViewId(`https://view.genially.com/${viewId}`)).toBe(viewId)
  })

  it('should read the id from the legacy host', () => {
    expect(extractGeniallyViewId(`https://view.genial.ly/${viewId}`)).toBe(viewId)
  })

  // WordPress embeds it with the fragment its own embed handler adds.
  it('should read the id from a url carrying a secret fragment', () => {
    expect(extractGeniallyViewId(`https://view.genial.ly/${viewId}#?secret=5n2fsT8hDN`)).toBe(
      viewId,
    )
  })

  it('should read the id from a /view/ path', () => {
    expect(extractGeniallyViewId(`https://genially.com/view/${viewId}`)).toBe(viewId)
  })

  it('should return undefined for a genially url naming no view', () => {
    expect(extractGeniallyViewId('https://genially.com/pricing')).toBeUndefined()
  })

  it('should return undefined for an id that is not the documented shape', () => {
    expect(extractGeniallyViewId('https://view.genially.com/not-a-view-id')).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    expect(extractGeniallyViewId('https://[')).toBeUndefined()
  })
})

describe('geniallyResolveEmbed', () => {
  // The legacy host 301s to the modern one carrying the same id, so the hop is skippable.
  it('should mint the modern host from a legacy url', () => {
    expect(geniallyResolveEmbed(`https://view.genial.ly/${viewId}`)).toEqual({
      provider: 'genially',
      id: viewId,
      src: `https://view.genially.com/${viewId}`,
    })
  })

  it('should leave a modern url on its own host', () => {
    expect(geniallyResolveEmbed(`https://view.genially.com/${viewId}`)).toMatchObject({
      src: `https://view.genially.com/${viewId}`,
    })
  })

  it('should return undefined for a genially url naming no view', () => {
    expect(geniallyResolveEmbed('https://genially.com/pricing')).toBeUndefined()
  })
})
