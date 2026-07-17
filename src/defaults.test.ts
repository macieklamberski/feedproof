import { describe, expect, it } from 'bun:test'
import {
  defaultBookmarkResolvers,
  defaultEmbedResolvers,
  defaultInertSelectors,
} from './defaults.js'

describe('defaults', () => {
  // stripInertElements runs before the embed and bookmark transforms, so a selector
  // registered in both lists is always stripped and its resolver can never fire.
  it('should not list any resolver selector as an inert selector', () => {
    const resolverSelectors = [...defaultBookmarkResolvers, ...defaultEmbedResolvers]
      .flatMap((resolver) => resolver.selector.split(','))
      .map((selector) => selector.trim())
    const overlap = resolverSelectors.filter((selector) => {
      return defaultInertSelectors.includes(selector)
    })

    expect(overlap).toEqual([])
  })
})
