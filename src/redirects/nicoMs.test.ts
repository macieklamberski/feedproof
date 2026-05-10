import { describe, expect, it } from 'bun:test'
import { extractNicoMs } from './nicoMs.js'

describe('extractNicoMs', () => {
  it('should rewrite sm-prefixed ids to the nicovideo watch URL', () => {
    const url = new URL('https://nico.ms/sm12345678')

    expect(extractNicoMs(url)).toBe('https://www.nicovideo.jp/watch/sm12345678')
  })

  it('should rewrite nm-prefixed ids to the nicovideo watch URL', () => {
    const url = new URL('https://nico.ms/nm9876543')

    expect(extractNicoMs(url)).toBe('https://www.nicovideo.jp/watch/nm9876543')
  })

  it('should rewrite so-prefixed ids to the nicovideo watch URL', () => {
    const url = new URL('https://nico.ms/so123456')

    expect(extractNicoMs(url)).toBe('https://www.nicovideo.jp/watch/so123456')
  })

  it('should rewrite im-prefixed ids to the seiga illustration URL', () => {
    const url = new URL('https://nico.ms/im9999999')

    expect(extractNicoMs(url)).toBe('https://seiga.nicovideo.jp/seiga/im9999999')
  })

  it('should return null for an unrecognised prefix', () => {
    const url = new URL('https://nico.ms/xx12345')

    expect(extractNicoMs(url)).toBeUndefined()
  })

  it('should return null for non-nico.ms hosts', () => {
    const url = new URL('https://example.com/sm12345')

    expect(extractNicoMs(url)).toBeUndefined()
  })
})
