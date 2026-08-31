import { describe, expect, it } from 'bun:test'
import { baseContext } from '../tests.js'
import {
  cleanUrl,
  decodeSegment,
  parseUrlOnHosts,
  pickQueryParams,
  pickUrlParams,
  resolveOrDropUrl,
  resolveOrKeepUrl,
} from './urls.js'

describe('parseUrlOnHosts', () => {
  const hosts = ['platform.example', 'other.example']

  it('should return the parsed url when it is on one of the hosts', () => {
    const value = 'https://platform.example/watch/123?v=1'

    expect(parseUrlOnHosts(value, hosts)?.pathname).toBe('/watch/123')
  })

  it('should accept a subdomain of a host', () => {
    const value = 'https://open.platform.example/track/123'

    expect(parseUrlOnHosts(value, hosts)?.hostname).toBe('open.platform.example')
  })

  it('should accept a protocol-relative url on a host', () => {
    const value = '//platform.example/watch/123'

    expect(parseUrlOnHosts(value, hosts)?.hostname).toBe('platform.example')
  })

  it('should return undefined for a url on another host', () => {
    expect(parseUrlOnHosts('https://elsewhere.example/watch/123', hosts)).toBeUndefined()
  })

  it('should return undefined for a host that only ends with the name', () => {
    expect(parseUrlOnHosts('https://notplatform.example/watch/123', hosts)).toBeUndefined()
  })

  it('should return undefined for a relative path', () => {
    expect(parseUrlOnHosts('/watch/123', hosts)).toBeUndefined()
  })

  it('should return undefined for an unparseable url', () => {
    expect(parseUrlOnHosts('http://[', hosts)).toBeUndefined()
  })

  it('should return undefined for an empty or undefined url', () => {
    expect(parseUrlOnHosts('', hosts)).toBeUndefined()
    expect(parseUrlOnHosts(undefined, hosts)).toBeUndefined()
  })
})

describe('resolveOrKeepUrl', () => {
  it('should resolve a relative url against the base', () => {
    const valueUrl = '/img.jpg'
    const baseUrl = 'https://example.com/post/'
    const expectedUrl = 'https://example.com/img.jpg'

    expect(resolveOrKeepUrl(valueUrl, { ...baseContext, baseUrl })).toBe(expectedUrl)
  })

  it('should resolve a protocol-relative url to the base scheme', () => {
    const valueUrl = '//cdn.example/a.jpg'
    const baseUrl = 'https://example.com'
    const expectedUrl = 'https://cdn.example/a.jpg'

    expect(resolveOrKeepUrl(valueUrl, { ...baseContext, baseUrl })).toBe(expectedUrl)
  })

  it('should keep an absolute url unchanged', () => {
    const valueUrl = 'https://cdn.example/a.jpg'
    const baseUrl = 'https://example.com'

    expect(resolveOrKeepUrl(valueUrl, { ...baseContext, baseUrl })).toBe(valueUrl)
  })

  it('should keep a data: url unchanged', () => {
    const valueUrl = 'data:image/png;base64,AAA'
    const baseUrl = 'https://example.com'

    expect(resolveOrKeepUrl(valueUrl, { ...baseContext, baseUrl })).toBe(valueUrl)
  })

  it('should keep a non-http scheme url unchanged', () => {
    const valueUrl = 'ftp://files.example/a.zip'
    const baseUrl = 'https://example.com'

    expect(resolveOrKeepUrl(valueUrl, { ...baseContext, baseUrl })).toBe(valueUrl)
  })

  it('should keep a relative url when there is no base', () => {
    const valueUrl = '/img.jpg'

    expect(resolveOrKeepUrl(valueUrl, { ...baseContext, baseUrl: undefined })).toBe(valueUrl)
  })

  it('should return undefined for an undefined url', () => {
    const baseUrl = 'https://example.com'

    expect(resolveOrKeepUrl(undefined, { ...baseContext, baseUrl })).toBeUndefined()
  })
})

describe('resolveOrDropUrl', () => {
  it('should resolve a relative url against the base', () => {
    const valueUrl = '/img.jpg'
    const baseUrl = 'https://example.com/post/'
    const expectedUrl = 'https://example.com/img.jpg'

    expect(resolveOrDropUrl(valueUrl, { ...baseContext, baseUrl })).toBe(expectedUrl)
  })

  it('should drop a relative url when there is no base', () => {
    const valueUrl = '/img.jpg'

    expect(resolveOrDropUrl(valueUrl, { ...baseContext, baseUrl: undefined })).toBeUndefined()
  })

  it('should drop a url whose scheme the resolver refuses', () => {
    const valueUrl = 'javascript:alert(1)'
    const baseUrl = 'https://example.com'

    expect(resolveOrDropUrl(valueUrl, { ...baseContext, baseUrl })).toBeUndefined()
  })

  // A whitespace-only attribute would otherwise resolve to the base url itself, so the element
  // ends up pointing at the article it sits in.
  it('should return undefined for a whitespace-only url', () => {
    const valueUrl = '   '
    const baseUrl = 'https://example.com/post/'

    expect(resolveOrDropUrl(valueUrl, { ...baseContext, baseUrl })).toBeUndefined()
  })

  it('should return undefined for an undefined url', () => {
    const baseUrl = 'https://example.com'

    expect(resolveOrDropUrl(undefined, { ...baseContext, baseUrl })).toBeUndefined()
  })
})

describe('cleanUrl', () => {
  it('should return what the cleaner answers', () => {
    const valueUrl = 'https://example.com/post?utm_source=feed'
    const cleanUrlFn = (url: string) => url.split('?')[0] ?? url
    const expectedUrl = 'https://example.com/post'

    expect(cleanUrl(valueUrl, { ...baseContext, cleanUrlFn })).toBe(expectedUrl)
  })

  it('should keep the url when there is no cleaner', () => {
    const valueUrl = 'https://example.com/post?utm_source=feed'

    expect(cleanUrl(valueUrl, { ...baseContext, cleanUrlFn: undefined })).toBe(valueUrl)
  })

  // A cleaner that answers with an empty string has not answered. Taking it literally would put
  // an empty href on the element, which is a link back to the reader's own page.
  it('should keep the url when the cleaner answers with nothing', () => {
    const valueUrl = 'https://example.com/post'
    const cleanUrlFn = () => ''

    expect(cleanUrl(valueUrl, { ...baseContext, cleanUrlFn })).toBe(valueUrl)
  })

  it('should return undefined for an undefined url without calling the cleaner', () => {
    let called = false
    const cleanUrlFn = (url: string) => {
      called = true
      return url
    }

    expect(cleanUrl(undefined, { ...baseContext, cleanUrlFn })).toBeUndefined()
    expect(called).toBe(false)
  })
})

describe('decodeSegment', () => {
  it('should decode a percent-encoded segment', () => {
    const value = 'urn%3Ali%3Ashare%3A6626097641602281472'
    const expected = 'urn:li:share:6626097641602281472'

    expect(decodeSegment(value)).toBe(expected)
  })

  it('should leave a plain segment unchanged', () => {
    const value = 'urn:li:share:6626097641602281472'

    expect(decodeSegment(value)).toBe(value)
  })

  it('should return undefined for a malformed escape', () => {
    const value = '%E0%A4%A'

    expect(decodeSegment(value)).toBeUndefined()
  })

  it('should return undefined for undefined', () => {
    expect(decodeSegment(undefined)).toBeUndefined()
  })
})

describe('pickQueryParams', () => {
  it('should keep only the named parameters', () => {
    const value = 'start=90&autoplay=1&list=PLabc'
    const expected = { start: '90', list: 'PLabc' }

    expect(pickQueryParams(value, ['start', 'list'])).toEqual(expected)
  })

  it('should state nothing when none are present', () => {
    const value = 'autoplay=1&rel=0'

    expect(pickQueryParams(value, ['start'])).toEqual({})
  })

  it('should state nothing for an empty query', () => {
    expect(pickQueryParams('', ['start'])).toEqual({})
  })

  it('should skip a parameter present but empty', () => {
    expect(pickQueryParams('start=', ['start'])).toEqual({})
  })

  // The query arrives from an attribute, so it may carry the punctuation a url would have
  // percent-encoded; `URLSearchParams` decodes it the same way either way.
  it('should decode a value that arrived encoded', () => {
    const value = 'clipt=a%2Bb%2Fc'
    const expected = { clipt: 'a+b/c' }

    expect(pickQueryParams(value, ['clipt'])).toEqual(expected)
  })

  it('should take the first of a repeated parameter', () => {
    const value = 'start=10&start=90'
    const expected = { start: '10' }

    expect(pickQueryParams(value, ['start'])).toEqual(expected)
  })
})

describe('pickUrlParams', () => {
  it('should keep only the named parameters, in the order given', () => {
    const value = 'https://example.com/e/x?utm_source=feed&index=4&list=PLabc&start=90'
    const expected = '?start=90&list=PLabc&index=4'

    expect(pickUrlParams(value, ['start', 'list', 'index'])).toBe(expected)
  })

  it('should return an empty string when none are present', () => {
    const value = 'https://example.com/e/x?utm_source=feed'
    const expected = ''

    expect(pickUrlParams(value, ['start'])).toBe(expected)
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
    const expected = '?clipt=a%2Bb%2Fc'

    expect(pickUrlParams(value, ['clipt'])).toBe(expected)
  })
})
