import { describe, expect, it } from 'bun:test'
import { defaultEmbedRenderHints } from './hints.js'

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
