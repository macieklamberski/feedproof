import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The alphabet is the whole guard: the prefix and the length are Google's to change.
const safeTokenRegex = /^[\w-]+$/

const bloggerHosts = ['blogger.com']

export const extractBloggerToken = (link: string): string | undefined => {
  const parsed = parseUrl(link)

  if (!parsed || getPathSegments(parsed)[0] !== 'video.g') {
    return
  }

  const token = parsed.searchParams.get('token')

  return keepIfMatches(token, safeTokenRegex)
}

// Blogger's own hosted video: an iframe on blogger.com/video.g with no poster and no page to open.
// The poster is a css background on `i9.ytimg.com/vi_blogger/{internalId}/1.jpg`, and that id is
// in neither the token nor the feed. A live, a deleted and an invented token all answer 200.
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
