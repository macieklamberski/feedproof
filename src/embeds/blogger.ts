import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

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
