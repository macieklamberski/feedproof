import { describe, expect, it } from 'bun:test'
import { baseContext } from '../tests.js'
import { pickQueryParams, pickUrlParams, resolveOrKeepUrl } from './urls.js'

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
