import { expect, it } from 'bun:test'
import { describeForEachParser } from '../tests.js'
import type { MediaResolverResult } from '../types.js'
import { wechatMediaResolver } from './wechat.js'

const mediaId = 'MjM5NjYyMjM0MF8yNjUwOTc3MjQy'
const mediaSrc = `https://res.wx.qq.com/voice/getvoice?mediaid=${mediaId}`

describeForEachParser('wechatMediaResolver', (parseHtml) => {
  const extract = (value: string): MediaResolverResult | undefined => {
    const element = parseHtml(value).querySelector(wechatMediaResolver.selector)

    return element ? (wechatMediaResolver.extract(element) as MediaResolverResult) : undefined
  }

  it('should build an audio source url from the encoded file id', () => {
    const value = `<mpvoice class="js_editor_audio" voice_encode_fileid="${mediaId}" name="Episode"></mpvoice>`
    const expected: MediaResolverResult = { tag: 'audio', src: mediaSrc }

    expect(extract(value)).toEqual(expected)
  })

  // The element's own src points at a WeChat template page, never at the audio.
  it('should ignore the element src', () => {
    const value = `<mpvoice src="/cgi-bin/readtemplate?t=tmpl/audio_tmpl" voice_encode_fileid="${mediaId}"></mpvoice>`
    const expected: MediaResolverResult = { tag: 'audio', src: mediaSrc }

    expect(extract(value)).toEqual(expected)
  })

  it('should return undefined when the id is missing', () => {
    const value = '<mpvoice class="js_editor_audio"></mpvoice>'

    expect(extract(value)).toBeUndefined()
  })

  it('should return undefined when the id is not the shape WeChat emits', () => {
    const value = '<mpvoice voice_encode_fileid="../../etc/passwd"></mpvoice>'

    expect(extract(value)).toBeUndefined()
  })
})
