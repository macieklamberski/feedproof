import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'

const mediaIdRegex = /^[A-Za-z0-9_-]+$/

// res.wx.qq.com serves the file for the id with no key, no Referer and no user agent.
const composeSourceUrl = (mediaId: string): string => {
  return `https://res.wx.qq.com/voice/getvoice?mediaid=${mediaId}`
}

// WeChat articles carry narration as an <mpvoice> element with no audio anywhere on the page.
export const wechatMediaResolver: MediaResolver = {
  kind: 'media',
  selector: 'mpvoice[voice_encode_fileid]',
  extract: (element): MediaResolverResult | undefined => {
    // The element's src is a WeChat template page, not the audio.
    const mediaId = attr(element, 'voice_encode_fileid')

    if (!mediaId || !mediaIdRegex.test(mediaId)) {
      return
    }

    return { tag: 'audio', src: composeSourceUrl(mediaId) }
  },
}
