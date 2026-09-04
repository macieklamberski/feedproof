import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { standfmEmbedResolver, standfmResolveEmbed } from './standfm.js'

describe('standfmResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the player from an episode page url', () => {
      const value = 'https://stand.fm/episodes/6a8065825e9572e804f8a5cb'
      const expected: EmbedResolverResult = {
        provider: 'standfm',
        id: 'episodes/6a8065825e9572e804f8a5cb',
        src: 'https://stand.fm/embed/episodes/6a8065825e9572e804f8a5cb',
        url: 'https://stand.fm/episodes/6a8065825e9572e804f8a5cb',
        height: 190,
      }

      expect(standfmResolveEmbed(value)).toEqual(expected)
    })

    // A channel is a scrolling list with no height of its own, so it states none, and the kind
    // stays in the id to tell the two players apart.
    it('should build the player from a channel page url', () => {
      const value = 'https://stand.fm/channels/645af1b90b5e6b2d87ce1dc9'
      const expected: EmbedResolverResult = {
        provider: 'standfm',
        id: 'channels/645af1b90b5e6b2d87ce1dc9',
        src: 'https://stand.fm/embed/channels/645af1b90b5e6b2d87ce1dc9',
        url: 'https://stand.fm/channels/645af1b90b5e6b2d87ce1dc9',
      }

      expect(standfmResolveEmbed(value)).toEqual(expected)
    })

    // The player url is what a CMS saves once it has run note.com's client, so it arrives too.
    it('should take the player url a carrier already states', () => {
      const value = 'https://stand.fm/embed/episodes/6a8065825e9572e804f8a5cb'
      const expected: EmbedResolverResult = {
        provider: 'standfm',
        id: 'episodes/6a8065825e9572e804f8a5cb',
        src: 'https://stand.fm/embed/episodes/6a8065825e9572e804f8a5cb',
        url: 'https://stand.fm/episodes/6a8065825e9572e804f8a5cb',
        height: 190,
      }

      expect(standfmResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should state nothing for a kind it does not know', () => {
      const value = 'https://stand.fm/users/6a8065825e9572e804f8a5cb'

      expect(standfmResolveEmbed(value)).toBeUndefined()
    })

    it('should state nothing for an id that is not a 24-character hex', () => {
      const value = 'https://stand.fm/episodes/not-an-object-id'

      expect(standfmResolveEmbed(value)).toBeUndefined()
    })

    it('should state nothing for the site root', () => {
      const value = 'https://stand.fm/'

      expect(standfmResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('standfmEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, standfmEmbedResolver)

  it('should resolve an episode carrier', async () => {
    const value = html`
      <iframe src="https://stand.fm/embed/episodes/6a8065825e9572e804f8a5cb"></iframe>
    `
    const expected: EmbedResolverResult = {
      provider: 'standfm',
      id: 'episodes/6a8065825e9572e804f8a5cb',
      src: 'https://stand.fm/embed/episodes/6a8065825e9572e804f8a5cb',
      url: 'https://stand.fm/episodes/6a8065825e9572e804f8a5cb',
      height: 190,
    }

    expect(await extract(value)).toEqual(expected)
  })

  // The host gate is what rejects this: the path carries the host as a substring so the
  // selector still matches, and only the gate can turn it away.
  it('should not resolve a foreign host carrying the path', async () => {
    const value = html`
      <iframe src="https://evil.test/stand.fm/episodes/6a8065825e9572e804f8a5cb"></iframe>
    `

    expect(await extract(value)).toBeUndefined()
  })
})
