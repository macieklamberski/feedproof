import { describe, expect, it } from 'bun:test'
import {
  defaultEmbedRenderHints,
  defaultNonContentSelectors,
  defaultWidgetResolvers,
} from './defaults.js'
import { parseHtml } from './parsers/linkedom.js'
import { createCitePlaceholder } from './utils/widgets.js'

describe('defaults', () => {
  // convertCiteCards hands every resolver the same document, in registration order, with
  // the earlier replacements already applied, so a resolver has to stay off the others'
  // toes. The next two tests pin the two ways one could tread on another.

  // Claiming a placeholder an earlier resolver already produced: that converts finished
  // work a second time, and the transform stops being idempotent.
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

    const matched = defaultWidgetResolvers
      .filter((resolver) => document.querySelectorAll(resolver.selector).length > 0)
      .map((resolver) => resolver.selector)

    expect(matched).toEqual([])
  })

  // Claiming a selector another resolver already owns: the later one only ever sees the
  // cards the first declined, so it looks registered while never really firing. Cite-only:
  // the url-keyed embed resolvers share the generic iframe selector on purpose.
  it('should not register the same cite selector twice', () => {
    const selectors = defaultWidgetResolvers
      .filter((resolver) => resolver.kind === 'cite')
      .map((resolver) => resolver.selector)
    const duplicates = selectors.filter((selector, index) => {
      return selectors.indexOf(selector) !== index
    })

    expect(duplicates).toEqual([])
  })

  // stripNonContentElements runs before the embed and cite transforms, so a selector
  // registered in both lists is always stripped and its resolver can never fire.
  it('should not list any resolver selector as a non-content selector', () => {
    const resolverSelectors = defaultWidgetResolvers
      .flatMap((resolver) => resolver.selector.split(','))
      .map((selector) => selector.trim())
    const overlap = resolverSelectors.filter((selector) => {
      return defaultNonContentSelectors.includes(selector)
    })

    expect(overlap).toEqual([])
  })
})

const named = defaultEmbedRenderHints.map((hint) => [hint.provider, hint] as const)

describe('defaultEmbedRenderHints', () => {
  it('should name each provider once', () => {
    const providers = defaultEmbedRenderHints.map((hint) => hint.provider)

    expect(new Set(providers).size).toBe(providers.length)
  })

  // A hint with nothing in it would register a provider and change nothing for a reader.
  it.each(named)('should give %s something a reader can act on', (_, hint) => {
    expect(hint.autoplayParams ?? hint.readHeight).toBeDefined()
  })

  // A reader compares `event.origin` with it by equality, so a path or a trailing slash
  // would never match.
  it.each(named.filter(([, hint]) => hint.origin))(
    'should state the %s origin as a bare origin',
    (_, hint) => {
      const origin = hint.origin ?? ''

      expect(new URL(origin).origin).toBe(origin)
    },
  )

  it.each(named.filter(([, hint]) => hint.requestHeight !== undefined))(
    'should read the answer to the %s height request',
    (_, hint) => {
      expect(hint.readHeight).toBeDefined()
    },
  )
})
