import { expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { amebaMediaResolver } from './ameba.js'

const uploadId = 'NTTAZiju6kYqXnmJoOe2Cjtp4p'
const uploadSrc = `https://static.blog-video.jp/output/hq/${uploadId}.mp4`

describeForEachParser('amebaMediaResolver', (parseHtml) => {
  const extract = (value: string): MediaResolverResult | undefined => {
    const element = parseHtml(value).querySelector(amebaMediaResolver.selector)

    return element ? (amebaMediaResolver.extract(element) as MediaResolverResult) : undefined
  }

  it('should build a video source url from the player iframe', () => {
    const value = `<iframe src="https://static.blog-video.jp/?v=${uploadId}" width="276"></iframe>`
    const expected: MediaResolverResult = { tag: 'video', src: uploadSrc }

    expect(extract(value)).toEqual(expected)
  })

  it('should accept a protocol-relative player url', () => {
    const value = `<iframe src="//static.blog-video.jp/?v=${uploadId}"></iframe>`

    expect(extract(value)?.src).toBe(uploadSrc)
  })

  it('should return undefined for another host', () => {
    const value = `<iframe src="https://www.youtube.com/embed/${uploadId}"></iframe>`

    expect(extract(value)).toBeUndefined()
  })

  // A host ending in the player domain is the player; one merely containing it is not.
  it('should return undefined for a lookalike host', () => {
    const value = `<iframe src="https://static.blog-video.jp.evil.test/?v=${uploadId}"></iframe>`

    expect(extract(value)).toBeUndefined()
  })

  it('should return undefined when the id is missing', () => {
    expect(extract('<iframe src="https://static.blog-video.jp/"></iframe>')).toBeUndefined()
  })

  it('should return undefined when the id is not the shape Ameba emits', () => {
    const value = '<iframe src="https://static.blog-video.jp/?v=../../etc/passwd"></iframe>'

    expect(extract(value)).toBeUndefined()
  })
})
