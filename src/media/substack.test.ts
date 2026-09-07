import { describe, expect, it } from 'bun:test'
import { describeForEachParser, jsonAttrValue, resolverExtractor } from '../tests.js'
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

  return `<div class="${className}" data-attrs="${jsonAttrValue(attrs)}"></div>`
}

describeForEachParser('substackMediaResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, substackMediaResolver)

  describe('happy paths', () => {
    it('should build a video source url from the upload id', async () => {
      const value = makeContainer('native-video-embed', { mediaUploadId: uploadId })
      const expected: MediaResolverResult = { tag: 'video', src: uploadSrc }

      expect(await extract(value)).toEqual(expected)
    })

    it('should build an audio source url through the same endpoint', async () => {
      const value = makeContainer('native-audio-embed', {
        label: null,
        mediaUploadId: uploadId,
        duration: 1743.0465,
        downloadable: false,
      })
      const expected: MediaResolverResult = { tag: 'audio', src: uploadSrc }

      expect(await extract(value)).toEqual(expected)
    })

    it('should ignore the other payload keys', async () => {
      const value = makeContainer('native-video-embed', {
        mediaUploadId: uploadId,
        duration: null,
        isEditorNode: true,
      })
      const expected: MediaResolverResult = { tag: 'video', src: uploadSrc }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should return undefined when data-attrs is absent', async () => {
      const value = makeContainer('native-video-embed')

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is malformed json', async () => {
      const value = makeContainer('native-video-embed', 'not-json')

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when data-attrs is valid json but not an object', async () => {
      const value = makeContainer('native-video-embed', '"just-a-string"')

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when mediaUploadId is missing', async () => {
      const value = makeContainer('native-video-embed', { duration: 12 })

      expect(await extract(value)).toBeUndefined()
    })

    // The id is interpolated straight into a url, so a value that is not the shape Substack
    // emits is dropped rather than used to build one.
    it('should return undefined when mediaUploadId is not a uuid', async () => {
      const value = makeContainer('native-video-embed', { mediaUploadId: '../../etc/passwd' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when mediaUploadId is empty', async () => {
      const value = makeContainer('native-video-embed', { mediaUploadId: '' })

      expect(await extract(value)).toBeUndefined()
    })

    it('should treat a container carrying both classes as audio', async () => {
      const value = makeContainer('native-video-embed native-audio-embed', {
        mediaUploadId: uploadId,
      })
      const expected: MediaResolverResult = { tag: 'audio', src: uploadSrc }

      expect(await extract(value)).toEqual(expected)
    })
  })
})
