import { describe, expect, it } from 'bun:test'
import {
  defaultCiteResolvers,
  defaultEmbedResolvers,
  defaultNonContentSelectors,
} from './defaults.js'

describe('defaults', () => {
  // stripNonContentElements runs before the embed and cite transforms, so a selector
  // registered in both lists is always stripped and its resolver can never fire.
  it('should not list any resolver selector as a non-content selector', () => {
    const resolverSelectors = [...defaultCiteResolvers, ...defaultEmbedResolvers]
      .flatMap((resolver) => resolver.selector.split(','))
      .map((selector) => selector.trim())
    const overlap = resolverSelectors.filter((selector) => {
      return defaultNonContentSelectors.includes(selector)
    })

    expect(overlap).toEqual([])
  })
})
