import { describe, expect, it } from 'bun:test'
import { extractTedTalk, tedResolveEmbed } from './ted.js'

describe('extractTedTalk', () => {
  it('should read a talk slug', () => {
    expect(extractTedTalk('https://embed.ted.com/talks/ethan_zuckerman.html')).toBe(
      'ethan_zuckerman',
    )
  })

  // The localized player inserts the language between the slug and the path.
  it('should read a talk slug from the localized player', () => {
    expect(extractTedTalk('https://embed.ted.com/talks/lang/ja/ethan_zuckerman.html')).toBe(
      'ethan_zuckerman',
    )
  })

  it('should read a slug with no html suffix', () => {
    expect(extractTedTalk('https://embed.ted.com/talks/ethan_zuckerman')).toBe('ethan_zuckerman')
  })

  it('should return undefined for a ted url that is not a talk', () => {
    expect(extractTedTalk('https://www.ted.com/playlists/123/something')).toBeUndefined()
  })
})

describe('tedResolveEmbed', () => {
  it('should derive the watch url from the slug', () => {
    expect(tedResolveEmbed('https://embed.ted.com/talks/lang/ja/ethan_zuckerman.html')).toEqual({
      provider: 'ted',
      id: 'ethan_zuckerman',
      src: 'https://embed.ted.com/embed/ethan_zuckerman',
      url: 'https://www.ted.com/talks/ethan_zuckerman',
    })
  })
})
