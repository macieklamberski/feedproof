import { describe, expect, it } from 'bun:test'
import {
  defaultCiteResolvers,
  defaultEmbedResolvers,
  defaultNonContentSelectors,
} from './defaults.js'
import * as index from './index.js'

describe('defaults', () => {
  // A resolver reachable only through the default array cannot be named, so a consumer
  // has no way to drop one or reorder the registry — the array is all or nothing. Every
  // registered resolver therefore has to be exported individually as well; this pins that,
  // since the two lists drifted apart once already as resolvers were added.
  it('should export every registered resolver individually', () => {
    const exported = new Set(Object.values(index))
    const missing = [...defaultCiteResolvers, ...defaultEmbedResolvers].filter((resolver) => {
      return !exported.has(resolver)
    })

    expect(missing).toEqual([])
  })

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
