import { describe, expect, it } from 'bun:test'
import type { EmbedResolverResult } from '../types.js'
import { extractTedTalk, tedResolveEmbed } from './ted.js'

describe('extractTedTalk', () => {
  it('should read a talk slug', () => {
    const value = 'https://embed.ted.com/talks/ethan_zuckerman.html'
    const expected = 'ethan_zuckerman'

    expect(extractTedTalk(value)).toBe(expected)
  })

  // The localized player inserts the language between the slug and the path.
  it('should read a talk slug from the localized player', () => {
    const value = 'https://embed.ted.com/talks/lang/ja/ethan_zuckerman.html'
    const expected = 'ethan_zuckerman'

    expect(extractTedTalk(value)).toBe(expected)
  })

  it('should read a slug with no html suffix', () => {
    const value = 'https://embed.ted.com/talks/ethan_zuckerman'
    const expected = 'ethan_zuckerman'

    expect(extractTedTalk(value)).toBe(expected)
  })

  it('should return undefined for a ted url that is not a talk', () => {
    const value = 'https://www.ted.com/playlists/123/something'

    expect(extractTedTalk(value)).toBeUndefined()
  })

  it('should return undefined for a url that cannot be parsed', () => {
    const value = 'https://['

    expect(extractTedTalk(value)).toBeUndefined()
  })
})

describe('tedResolveEmbed', () => {
  it('should derive the watch url from the slug', () => {
    const value = 'https://embed.ted.com/talks/lang/ja/ethan_zuckerman.html'
    const expected: EmbedResolverResult = {
      provider: 'ted',
      id: 'ethan_zuckerman',
      src: 'https://embed.ted.com/embed/ethan_zuckerman',
      url: 'https://www.ted.com/talks/ethan_zuckerman',
    }

    expect(tedResolveEmbed(value)).toEqual(expected)
  })

  it('should return undefined for a ted url naming no talk', () => {
    const value = 'https://embed.ted.com/about'

    expect(tedResolveEmbed(value)).toBeUndefined()
  })
})
