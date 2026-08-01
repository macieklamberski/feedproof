import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'

// Ameba embeds its own uploads as an iframe pointing at a player page, which looks like
// something the iframe path should own. It is not: that page ships a <video> whose <source>
// carries no src and a <noscript> telling the reader to enable JavaScript, so following the
// iframe leads nowhere either. The upload id in the query resolves to the file directly
// (verified 2026-08-01, 206 video/mp4, no auth, and the redirect fills in the blog name).
const playerHost = 'static.blog-video.jp'
const uploadIdRegex = /^[A-Za-z0-9]{20,40}$/

const composeSourceUrl = (uploadId: string): string => {
  return `https://static.blog-video.jp/output/hq/${uploadId}.mp4`
}

export const amebaMediaResolver: MediaResolver = {
  selector: 'iframe[src]',
  extract: (element): MediaResolverResult | undefined => {
    const source = attr(element, 'src')

    if (!source) {
      return
    }

    const url = parseUrl(source, 'https://ameblo.jp')

    if (!url || (!isHostOf(url, playerHost) && !isSubdomainOf(url, playerHost))) {
      return
    }

    const uploadId = url.searchParams.get('v')

    if (!uploadId || !uploadIdRegex.test(uploadId)) {
      return
    }

    return { tag: 'video', src: composeSourceUrl(uploadId) }
  },
}
