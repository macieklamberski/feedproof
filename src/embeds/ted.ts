import { getPathSegments, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVars, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'ted'

const safeSlugRegex = /^[a-z0-9_]+$/i
const htmlSuffixRegex = /\.html$/

const tedHosts = ['ted.com']

export const extractTedTalk = (link: string): string | undefined => {
  const segments = getPathSegments(link)

  if (segments[0] !== 'talks') {
    return
  }

  const slug = (segments[1] === 'lang' ? segments[3] : segments[1])?.replace(htmlSuffixRegex, '')

  return keepIfMatches(slug, safeSlugRegex)
}

const flashPlayerPathRegex = /\/assets\/player\/swf\/embedplayer\.swf$/i
// The talk key in the flashVars adKeys value, spelled talk={slug};year={year}.
const adKeysTalkRegex = /(?:^|;)talk=([a-z0-9_]+)/i

const truncatedSlugLength = 55

const readFlashTalk = (
  url: string,
  element: Element | undefined,
): { slug: string; thumbnail?: string } | undefined => {
  const parsed = parseUrlOnHosts(url, tedHosts)

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const config = new URLSearchParams(flashVars(element) ?? '')
  const slug = keepIfMatches(config.get('adKeys')?.match(adKeysTalkRegex)?.[1], safeSlugRegex)

  if (!slug || slug.length >= truncatedSlugLength) {
    return
  }

  const poster = config.get('su') ?? undefined

  return { slug, thumbnail: parseUrlOnHosts(poster, tedHosts) ? poster : undefined }
}

// TED's embed.ted.com iframe, and the dead Flash player that names the talk only in its flashVars.
export const tedResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const slug = extractTedTalk(url)
  const talk = slug ? { slug } : readFlashTalk(url, element)

  if (!talk) {
    return
  }

  const title = attr(element, 'title')

  return {
    provider,
    id: talk.slug,
    src: `https://embed.ted.com/embed/${talk.slug}`,
    url: `https://www.ted.com/talks/${talk.slug}`,
    ...trimObject({ thumbnail: talk.thumbnail, title }, Boolean),
  }
}

export const tedEmbedResolver = createUrlEmbedResolver(tedHosts, tedResolveEmbed)

export const tedRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: 'true' },
}
