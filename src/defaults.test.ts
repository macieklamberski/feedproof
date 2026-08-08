import { describe, expect, it } from 'bun:test'
import {
  defaultCiteResolvers,
  defaultGalleryResolvers,
  defaultNonContentSelectors,
  defaultWidgetResolvers,
} from './defaults.js'
import * as index from './index.js'
import { parseHtml } from './parsers/linkedom.js'
import { createCitePlaceholder, createGalleryPlaceholder } from './utils/widgets.js'

describe('defaults', () => {
  // A resolver reachable only through the default array cannot be named, so a consumer
  // has no way to drop one or reorder the registry — the array is all or nothing. Every
  // registered resolver therefore has to be exported individually as well; this pins that,
  // since the two lists drifted apart once already as resolvers were added.
  it('should export every registered resolver individually', () => {
    const exported = new Set(Object.values(index))
    const registered = [
      ...defaultCiteResolvers,
      ...defaultWidgetResolvers,
      ...defaultGalleryResolvers,
    ]
    const missing = registered.filter((resolver) => {
      return !exported.has(resolver)
    })

    expect(missing).toEqual([])
  })

  // convertCiteCards hands every resolver the same document, in registration order, with
  // the earlier replacements already applied — so a resolver has to stay off the others'
  // toes. The next two tests pin the two ways one could tread on another.

  // Claiming a placeholder an earlier resolver already produced: that converts finished
  // work a second time, and the transform stops being idempotent.
  it('should not match a cite or gallery placeholder with any resolver selector', () => {
    const document = parseHtml('<div></div>')
    const citePlaceholder = createCitePlaceholder(document, {
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
    const galleryPlaceholder = createGalleryPlaceholder(document, {
      provider: 'stub',
      title: 'Title',
      layout: 'slideshow',
      items: [
        { url: 'https://example.com/a.jpg', fullUrl: 'https://example.com/a-full.jpg' },
        { url: 'https://example.com/b.jpg' },
      ],
    })
    // Each placeholder is matched both on its own and wrapped, since the pipeline leaves it
    // nested inside whatever contained the element it replaced.
    for (const placeholder of [citePlaceholder, galleryPlaceholder]) {
      const wrapper = document.createElement('div')
      wrapper.appendChild(placeholder)
      document.body.appendChild(wrapper)
    }

    const matched = [...defaultCiteResolvers, ...defaultWidgetResolvers, ...defaultGalleryResolvers]
      .filter((resolver) => document.querySelectorAll(resolver.selector).length > 0)
      .map((resolver) => resolver.selector)

    expect(matched).toEqual([])
  })

  // Claiming a selector another resolver already owns: the later one only ever sees the
  // cards the first declined, so it looks registered while never really firing.
  it('should not register the same selector twice', () => {
    const selectors = [...defaultCiteResolvers, ...defaultGalleryResolvers].map((resolver) => {
      return resolver.selector
    })
    const duplicates = selectors.filter((selector, index) => {
      return selectors.indexOf(selector) !== index
    })

    expect(duplicates).toEqual([])
  })

  // stripNonContentElements runs before the embed, cite and gallery transforms, so a
  // selector registered in both lists is always stripped and its resolver can never fire.
  it('should not list any resolver selector as a non-content selector', () => {
    const resolverSelectors = [
      ...defaultCiteResolvers,
      ...defaultWidgetResolvers,
      ...defaultGalleryResolvers,
    ]
      .flatMap((resolver) => resolver.selector.split(','))
      .map((selector) => selector.trim())
    const overlap = resolverSelectors.filter((selector) => {
      return defaultNonContentSelectors.includes(selector)
    })

    expect(overlap).toEqual([])
  })
})
