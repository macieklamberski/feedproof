import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'

// WeChat articles carry narration as an <mpvoice> custom element with no audio anywhere on
// the page. Its `voice_encode_fileid` resolves to the file with no key, no Referer and no
// user agent (verified 2026-08-01, 206 audio/mp3). The `src` on the element points at a
// WeChat template page, not at the audio, so it is not usable as a source.
//
// The id rides in that url's query, so the shape is a mint check and carries no width. The
// element renders as nothing on its own, so a refusal here costs a reader the audio outright.
const mediaIdRegex = /^[A-Za-z0-9_-]+$/

const composeSourceUrl = (mediaId: string): string => {
  return `https://res.wx.qq.com/voice/getvoice?mediaid=${mediaId}`
}

export const wechatMediaResolver: MediaResolver = {
  kind: 'media',
  selector: 'mpvoice[voice_encode_fileid]',
  extract: (element): MediaResolverResult | undefined => {
    const mediaId = attr(element, 'voice_encode_fileid')

    if (!mediaId || !mediaIdRegex.test(mediaId)) {
      return
    }

    return { tag: 'audio', src: composeSourceUrl(mediaId) }
  },
}
