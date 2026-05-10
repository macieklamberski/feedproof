import { describe, expect, it } from 'bun:test'
import { extractOutlookSafelinks } from './outlookSafelinks.js'

describe('extractOutlookSafelinks', () => {
  it('should extract target from url param', () => {
    const url = new URL(
      'https://nam06.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2Fstory&data=foo&sdata=bar&reserved=0',
    )

    expect(extractOutlookSafelinks(url)).toBe('https://example.com/story')
  })

  it('should extract target from a different tenant subdomain', () => {
    const url = new URL(
      'https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2Fstory&data=foo',
    )

    expect(extractOutlookSafelinks(url)).toBe('https://example.com/story')
  })

  it('should return null when url param is missing', () => {
    const url = new URL('https://nam06.safelinks.protection.outlook.com/?data=foo')

    expect(extractOutlookSafelinks(url)).toBeUndefined()
  })

  it('should return null for non-Outlook hosts', () => {
    const url = new URL('https://example.com/?url=https%3A%2F%2Fother.com')

    expect(extractOutlookSafelinks(url)).toBeUndefined()
  })
})
