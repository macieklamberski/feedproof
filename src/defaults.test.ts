import { describe, expect, it } from 'bun:test'
import {
  defaultBookmarkResolvers,
  defaultEmbedResolvers,
  defaultNonContentSelectors,
} from './defaults.js'

describe('defaults', () => {
  // stripNonContentElements runs before the embed and bookmark transforms, so a selector
  // registered in both lists is always stripped and its resolver can never fire.
  it('should not list any resolver selector as a non-content selector', () => {
    const resolverSelectors = [...defaultBookmarkResolvers, ...defaultEmbedResolvers]
      .flatMap((resolver) => resolver.selector.split(','))
      .map((selector) => selector.trim())
    const overlap = resolverSelectors.filter((selector) => {
      return defaultNonContentSelectors.includes(selector)
    })

    expect(overlap).toEqual([])
  })
})
