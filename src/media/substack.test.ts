import { describe, expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { substackMediaResolver } from './substack.js'

const uploadId = 'de58e4a3-5505-45a7-8abc-b46c5c0f6e7a'
const uploadSrc = `https://api.substack.com/api/v1/video/upload/${uploadId}/src`

// Substack ships these as empty divs whose data lives in a `data-attrs` JSON blob, stored in
// a double-quoted attribute with the inner quotes HTML-encoded, which is what survives a
// parse and serialise roundtrip.
const makeContainer = (className: string, attrs?: Record<string, unknown> | string): string => {
  if (attrs === undefined) {
    return `<div class="${className}"></div>`
  }

  const raw = typeof attrs === 'string' ? attrs : JSON.stringify(attrs)

  return `<div class="${className}" data-attrs="${raw.replace(/"/g, '&quot;')}"></div>`
}

describeForEachParser('substackMediaResolver', (parseHtml) => {
  const extract = (value: string): MediaResolverResult | undefined => {
    const element = parseHtml(value).querySelector(substackMediaResolver.selector)

    return element ? (substackMediaResolver.extract(element) as MediaResolverResult) : undefined
  }

  describe('happy paths', () => {
    it('should build a video source url from the upload id', () => {
      const value = makeContainer('native-video-embed', { mediaUploadId: uploadId })
      const expected: MediaResolverResult = { tag: 'video', src: uploadSrc }

      expect(extract(value)).toEqual(expected)
    })

    it('should build an audio source url through the same endpoint', () => {
      const value = makeContainer('native-audio-embed', {
        label: null,
        mediaUploadId: uploadId,
        duration: 1743.0465,
        downloadable: false,
      })
      const expected: MediaResolverResult = { tag: 'audio', src: uploadSrc }

      expect(extract(value)).toEqual(expected)
    })

    it('should ignore the other payload keys', () => {
      const value = makeContainer('native-video-embed', {
        mediaUploadId: uploadId,
        duration: null,
        isEditorNode: true,
      })

      expect(extract(value)?.src).toBe(uploadSrc)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when data-attrs is absent', () => {
      expect(extract(makeContainer('native-video-embed'))).toBeUndefined()
    })

    it('should return undefined when data-attrs is malformed json', () => {
      expect(extract(makeContainer('native-video-embed', 'not-json'))).toBeUndefined()
    })

    it('should return undefined when data-attrs is valid json but not an object', () => {
      expect(extract(makeContainer('native-video-embed', '"just-a-string"'))).toBeUndefined()
    })

    it('should return undefined when mediaUploadId is missing', () => {
      const value = makeContainer('native-video-embed', { duration: 12 })

      expect(extract(value)).toBeUndefined()
    })

    // The id is interpolated straight into a url, so a value that is not the shape Substack
    // emits is dropped rather than used to build one.
    it('should return undefined when mediaUploadId is not a uuid', () => {
      const value = makeContainer('native-video-embed', { mediaUploadId: '../../etc/passwd' })

      expect(extract(value)).toBeUndefined()
    })

    it('should return undefined when mediaUploadId is empty', () => {
      const value = makeContainer('native-video-embed', { mediaUploadId: '' })

      expect(extract(value)).toBeUndefined()
    })

    it('should treat a container carrying both classes as audio', () => {
      const value = makeContainer('native-video-embed native-audio-embed', {
        mediaUploadId: uploadId,
      })

      expect(extract(value)?.tag).toBe('audio')
    })
  })
})
