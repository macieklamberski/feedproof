import { describe, expect, it } from 'bun:test'
import { baseContext } from '../tests.js'
import { pickUrlParams, resolveOrKeepUrl } from './urls.js'

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
