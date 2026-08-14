import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The token is opaque and url-safe base64, so anything outside that alphabet is not one and is
// left to the generic iframe path instead of being interpolated into a url.
const safeTokenRegex = /^[\w-]+$/

const bloggerHosts = ['blogger.com']

// Blogger's own hosted video, `iframe.b-hbp-video.b-uploaded` pointing at
// `blogger.com/video.g?token={token}`, in 16,118 corpus feeds. The iframe renders on its own,
// so this states provider and id and nothing else.
//
// There is no poster to derive and no page to open. The player paints its poster as a css
// background image on `i9.ytimg.com/vi_blogger/{internalId}/1.jpg`, and that internal id is in
// neither the token nor the feed, so reaching it means running the player page. Liveness is
// just as invisible: a live token, a deleted video and an invented one all answer 200 with a
// near-identical 16KB javascript shell, checked 2026-08-13.
export const extractBloggerToken = (link: string): string | undefined => {
  const parsed = parseUrl(link)

  if (!parsed || getPathSegments(parsed)[0] !== 'video.g') {
    return
  }

  const token = parsed.searchParams.get('token')

  if (token && safeTokenRegex.test(token)) {
    return token
  }
}

export const bloggerResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const token = extractBloggerToken(url)

  if (!token) {
    return
  }

  return {
    provider: 'blogger',
    id: token,
    src: `https://www.blogger.com/video.g?token=${token}`,
  }
}

export const bloggerEmbedResolver = createUrlEmbedResolver(bloggerHosts, bloggerResolveEmbed)
