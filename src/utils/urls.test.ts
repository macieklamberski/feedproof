import { describe, expect, it } from 'bun:test'
import { baseContext } from '../tests.js'
import { chooseBaseUrl, pickUrlParams, resolveOrKeepUrl } from './urls.js'

describe('resolveOrKeepUrl', () => {
  const { resolveUrlFn } = baseContext

  it('should resolve a relative url against the base', () => {
    expect(resolveOrKeepUrl('/img.jpg', resolveUrlFn, 'https://example.com/post/')).toBe(
      'https://example.com/img.jpg',
    )
  })

  it('should resolve a protocol-relative url to the base scheme', () => {
    expect(resolveOrKeepUrl('//cdn.example/a.jpg', resolveUrlFn, 'https://example.com')).toBe(
      'https://cdn.example/a.jpg',
    )
  })

  it('should keep an absolute url unchanged', () => {
    expect(resolveOrKeepUrl('https://cdn.example/a.jpg', resolveUrlFn, 'https://example.com')).toBe(
      'https://cdn.example/a.jpg',
    )
  })

  it('should keep a data: url unchanged', () => {
    expect(resolveOrKeepUrl('data:image/png;base64,AAA', resolveUrlFn, 'https://example.com')).toBe(
      'data:image/png;base64,AAA',
    )
  })

  it('should keep a non-http scheme url unchanged', () => {
    expect(resolveOrKeepUrl('ftp://files.example/a.zip', resolveUrlFn, 'https://example.com')).toBe(
      'ftp://files.example/a.zip',
    )
  })

  it('should keep a relative url when there is no base', () => {
    expect(resolveOrKeepUrl('/img.jpg', resolveUrlFn, undefined)).toBe('/img.jpg')
  })

  it('should return undefined for an undefined url', () => {
    expect(resolveOrKeepUrl(undefined, resolveUrlFn, 'https://example.com')).toBeUndefined()
  })
})

describe('chooseBaseUrl', () => {
  it('should prefer itemUrl when available', () => {
    const value = chooseBaseUrl(
      'https://example.com/post/1',
      'https://example.com',
      'https://example.com/feed.xml',
    )
    const expected = 'https://example.com/post/1'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is null', () => {
    const value = chooseBaseUrl(null, 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is undefined', () => {
    const value = chooseBaseUrl(undefined, 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is not http/https', () => {
    const value = chooseBaseUrl(
      'ftp://files.example.com/post',
      'https://example.com',
      'https://example.com/feed.xml',
    )
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is invalid', () => {
    const value = chooseBaseUrl('not-a-url', 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should resolve relative siteUrl against feedUrl', () => {
    const value = chooseBaseUrl(null, '/', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should resolve relative path siteUrl against feedUrl', () => {
    const value = chooseBaseUrl(null, '/blog', 'https://example.com/feed.xml')
    const expected = 'https://example.com/blog'

    expect(value).toBe(expected)
  })

  it('should fall back to feedUrl when both itemUrl and siteUrl are null', () => {
    const value = chooseBaseUrl(null, null, 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should fall back to feedUrl when siteUrl resolves to non-http', () => {
    const value = chooseBaseUrl(null, 'ftp://files.example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should return undefined when no URL yields http/https', () => {
    expect(chooseBaseUrl(null, null, 'not-a-url')).toBeUndefined()
  })

  it('should return undefined when feedUrl is not http/https', () => {
    expect(chooseBaseUrl(null, null, 'ftp://example.com/feed')).toBeUndefined()
  })

  it('should skip itemUrl and siteUrl falling through to feedUrl', () => {
    const value = chooseBaseUrl('not-a-url', 'ftp://bad', 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should preserve itemUrl path for relative content resolution', () => {
    const value = chooseBaseUrl(
      'https://example.com/newsletter/dispatch-015/',
      'https://example.com',
      'https://example.com/index.xml',
    )
    const expected = 'https://example.com/newsletter/dispatch-015/'

    expect(value).toBe(expected)
  })

  it('should fall back to siteUrl when itemUrl is an empty string', () => {
    const value = chooseBaseUrl('', 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  it('should fall back to feedUrl when siteUrl is an empty string', () => {
    const value = chooseBaseUrl(null, '', 'https://example.com/feed.xml')
    const expected = 'https://example.com/feed.xml'

    expect(value).toBe(expected)
  })

  it('should return undefined when all inputs are empty strings', () => {
    expect(chooseBaseUrl('', '', '')).toBeUndefined()
  })

  it('should fall back to siteUrl when itemUrl is relative', () => {
    const value = chooseBaseUrl('/post/1', 'https://example.com', 'https://example.com/feed.xml')
    const expected = 'https://example.com/'

    expect(value).toBe(expected)
  })

  describe('xml:base', () => {
    it('should prefer a declared item xml:base over the item url', () => {
      const value = chooseBaseUrl(
        'https://example.com/post/1',
        'https://example.com',
        'https://example.com/feed.xml',
        { item: 'https://cdn.example.com/assets/' },
      )
      const expected = 'https://cdn.example.com/assets/'

      expect(value).toBe(expected)
    })

    it('should resolve a relative item xml:base against the channel one', () => {
      const value = chooseBaseUrl(null, null, 'https://example.com/feed.xml', {
        channel: 'https://cdn.example.com/assets/',
        item: 'posts/1/',
      })
      const expected = 'https://cdn.example.com/assets/posts/1/'

      expect(value).toBe(expected)
    })

    it('should resolve a relative channel xml:base against the feed url', () => {
      const value = chooseBaseUrl(null, null, 'https://example.com/feeds/main.xml', {
        channel: '../assets/',
      })
      const expected = 'https://example.com/assets/'

      expect(value).toBe(expected)
    })

    it('should resolve a relative item xml:base against the feed url when no channel one is declared', () => {
      const value = chooseBaseUrl(null, null, 'https://example.com/feeds/main.xml', {
        item: 'posts/1/',
      })
      const expected = 'https://example.com/feeds/posts/1/'

      expect(value).toBe(expected)
    })

    it('should treat an empty xml:base as a reset to the feed url', () => {
      const value = chooseBaseUrl(
        'https://example.com/post/1',
        null,
        'https://example.com/feed.xml',
        { channel: '' },
      )
      const expected = 'https://example.com/feed.xml'

      expect(value).toBe(expected)
    })

    // An xml:base is meant to be a URL, so a malformed one is repaired like the item, site
    // and feed urls are, rather than dropped.
    it('should repair a feed-scheme xml:base', () => {
      const value = chooseBaseUrl(null, null, 'https://example.com/feed.xml', {
        channel: 'feed://cdn.example.com/assets/',
      })
      const expected = 'https://cdn.example.com/assets/'

      expect(value).toBe(expected)
    })

    it('should decode entities in an xml:base', () => {
      const value = chooseBaseUrl(null, null, 'https://example.com/feed.xml', {
        channel: 'https://cdn.example.com/a&amp;b/',
      })
      const expected = 'https://cdn.example.com/a&b/'

      expect(value).toBe(expected)
    })

    it('should fall through to the item url when the xml:base is not a usable url', () => {
      const value = chooseBaseUrl('https://example.com/post/1', null, 'not-a-url', {
        item: 'assets/',
      })
      const expected = 'https://example.com/post/1'

      expect(value).toBe(expected)
    })
  })

  describe('item guid', () => {
    it('should use a url-shaped guid when the item url is missing', () => {
      const value = chooseBaseUrl(
        null,
        'https://example.com',
        'https://example.com/feed.xml',
        undefined,
        'https://example.com/post/1',
      )
      const expected = 'https://example.com/post/1'

      expect(value).toBe(expected)
    })

    it('should rank the item url above the guid', () => {
      const value = chooseBaseUrl(
        'https://example.com/post/1',
        null,
        'https://example.com/feed.xml',
        undefined,
        'https://example.com/other/2',
      )
      const expected = 'https://example.com/post/1'

      expect(value).toBe(expected)
    })

    // A tag: URI, an opaque string and a bare number are all common guids. None is a base,
    // and a bare host must not be promoted into one by adding a scheme.
    it.each([
      'tag:example.com,2024:post-1',
      '12345',
      'example.com',
      'post-1',
    ])('should skip the guid %s', (guid) => {
      const value = chooseBaseUrl(null, null, 'https://example.com/feed.xml', undefined, guid)
      const expected = 'https://example.com/feed.xml'

      expect(value).toBe(expected)
    })
  })
})

describe('pickUrlParams', () => {
  it('should keep only the named parameters, in the order given', () => {
    const value = 'https://example.com/e/x?utm_source=feed&index=4&list=PLabc&start=90'

    expect(pickUrlParams(value, ['start', 'list', 'index'])).toBe('?start=90&list=PLabc&index=4')
  })

  it('should return an empty string when none are present', () => {
    const value = 'https://example.com/e/x?utm_source=feed'

    expect(pickUrlParams(value, ['start'])).toBe('')
  })

  it('should return an empty string when there is no query', () => {
    expect(pickUrlParams('https://example.com/e/x', ['start'])).toBe('')
  })

  it('should skip a parameter present but empty', () => {
    expect(pickUrlParams('https://example.com/e/x?start=', ['start'])).toBe('')
  })

  it('should return an empty string for an unparseable url', () => {
    expect(pickUrlParams('not a url', ['start'])).toBe('')
  })

  it('should encode a value that needs it', () => {
    const value = 'https://example.com/e/x?clipt=a%2Bb%2Fc'

    expect(pickUrlParams(value, ['clipt'])).toBe('?clipt=a%2Bb%2Fc')
  })
})
