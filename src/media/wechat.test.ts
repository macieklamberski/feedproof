import { describe, expect, it } from 'bun:test'
import { describeForEachParser, resolverExtractor } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { wechatMediaResolver } from './wechat.js'

const mediaId = 'MjM5NjYyMjM0MF8yNjUwOTc3MjQy'
const mediaSrc = `https://res.wx.qq.com/voice/getvoice?mediaid=${mediaId}`

describeForEachParser('wechatMediaResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, wechatMediaResolver)

  describe('happy paths', () => {
    it('should build an audio source url from the encoded file id', async () => {
      const value = `<mpvoice class="js_editor_audio" voice_encode_fileid="${mediaId}" name="Episode"></mpvoice>`
      const expected: MediaResolverResult = { tag: 'audio', src: mediaSrc }

      expect(await extract(value)).toEqual(expected)
    })

    // The element's own src points at a WeChat template page, never at the audio.
    it('should ignore the element src', async () => {
      const value = `<mpvoice src="/cgi-bin/readtemplate?t=tmpl/audio_tmpl" voice_encode_fileid="${mediaId}"></mpvoice>`
      const expected: MediaResolverResult = { tag: 'audio', src: mediaSrc }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when the id is missing', async () => {
      const value = '<mpvoice class="js_editor_audio"></mpvoice>'

      expect(await extract(value)).toBeUndefined()
    })

    // Both would move the mint off the query slot the id belongs in.
    it('should return undefined when the id is not the shape WeChat emits', async () => {
      const value = '<mpvoice voice_encode_fileid="../../etc/passwd"></mpvoice>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined when the id carries a query separator', async () => {
      const value = `<mpvoice voice_encode_fileid="${mediaId}&mediaid=stolen"></mpvoice>`

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    // Nothing has measured how long these run, and refusing one costs the narration outright.
    it('should build the source url from an id shorter than the corpus ones', async () => {
      const value = '<mpvoice voice_encode_fileid="MjM5Ng"></mpvoice>'
      const expected: MediaResolverResult = {
        tag: 'audio',
        src: 'https://res.wx.qq.com/voice/getvoice?mediaid=MjM5Ng',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })
})
