import { describe, expect, it } from 'bun:test'
import {
  defaultCiteResolvers,
  defaultEmbedResolvers,
  defaultNonContentSelectors,
} from './defaults.js'
import * as index from './index.js'
import { parseHtml } from './parsers/linkedom.js'
import { createCitePlaceholder } from './utils/embeds.js'

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

  // convertCiteCards runs every resolver over the same document, so a resolver whose
  // selector matches an already-emitted placeholder would convert another resolver's
  // output — or its own on a second run — and the transform would stop being idempotent.
  it('should not match a cite placeholder with any resolver selector', () => {
    const document = parseHtml('<div></div>')
    const placeholder = createCitePlaceholder(document, {
      provider: 'stub',
      url: 'https://example.com/post',
      title: 'Title',
      description: 'Description',
      caption: 'Caption',
      author: 'Author',
      publisher: 'Publisher',
      date: '2026-01-01T00:00:00.000Z',
      icon: 'https://example.com/icon.png',
      thumbnail: 'https://example.com/thumb.jpg',
      kind: 'bookmark',
    })
    // The placeholder is matched both on its own and wrapped, since the pipeline leaves it
    // nested inside whatever contained the card it replaced.
    const wrapper = document.createElement('div')
    wrapper.appendChild(placeholder)
    document.body.appendChild(wrapper)

    const matched = [...defaultCiteResolvers, ...defaultEmbedResolvers]
      .filter((resolver) => document.querySelectorAll(resolver.selector).length > 0)
      .map((resolver) => resolver.selector)

    expect(matched).toEqual([])
  })

  // Two resolvers sharing a selector means the second only ever sees cards the first
  // declined, which is a silent shadowing rather than a registration.
  it('should not register the same selector twice', () => {
    const selectors = defaultCiteResolvers.map((resolver) => resolver.selector)
    const duplicates = selectors.filter((selector, index) => {
      return selectors.indexOf(selector) !== index
    })

    expect(duplicates).toEqual([])
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
