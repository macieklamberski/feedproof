import { describe, expect, it } from 'bun:test'
import { extractLinksynergy } from './linksynergy.js'

describe('extractLinksynergy', () => {
  it('should extract target from murl param', () => {
    const url = new URL(
      'https://click.linksynergy.com/deeplink?id=abc&mid=12345&murl=https%3A%2F%2Fexample.com%2Fproduct',
    )

    expect(extractLinksynergy(url)).toBe('https://example.com/product')
  })

  it('should return null when murl param is missing', () => {
    const url = new URL('https://click.linksynergy.com/deeplink?id=abc&mid=12345')

    expect(extractLinksynergy(url)).toBeNull()
  })

  it('should return null for non-deeplink paths', () => {
    const url = new URL('https://click.linksynergy.com/click?murl=https%3A%2F%2Fexample.com')

    expect(extractLinksynergy(url)).toBeNull()
  })

  it('should return null for non-LinkSynergy hosts', () => {
    const url = new URL('https://example.com/deeplink?murl=https%3A%2F%2Fother.com')

    expect(extractLinksynergy(url)).toBeNull()
  })
})
