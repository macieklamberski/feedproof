import { getPathSegments, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVars, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'ted'

// Talk slugs are the speaker and title joined by underscores, e.g. `ethan_zuckerman`.
const safeSlugRegex = /^[a-z0-9_]+$/i
const htmlSuffixRegex = /\.html$/

const tedHosts = ['ted.com']

// `embed.ted.com/talks/{slug}.html`, and a localized variant that inserts the language:
// `embed.ted.com/talks/lang/{lang}/{slug}.html`. The slug is the talk's canonical id on
// ted.com, so a watch url follows from it without a lookup.
export const extractTedTalk = (link: string): string | undefined => {
  const segments = getPathSegments(link)

  if (segments[0] !== 'talks') {
    return
  }

  const slug = (segments[1] === 'lang' ? segments[3] : segments[1])?.replace(htmlSuffixRegex, '')

  return keepIfMatches(slug, safeSlugRegex)
}

// The Flash player's url is the same file for every talk, so the carrier names nothing on its
// own and the talk is only in the flashVars, inside the ad targeting keys:
// `adKeys=talk={slug};year=2010;theme=…`. The player is dead, so these embeds render nothing.
const flashPlayerPathRegex = /\/assets\/player\/swf\/embedplayer\.swf$/i
// The talk key in the flashVars adKeys value, spelled talk={slug};year={year}.
const adKeysTalkRegex = /(?:^|;)talk=([a-z0-9_]+)/i

// TED cut the talk key off at this length, so a slug this long is usually a prefix of the real
// one but not always.
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

  // A slug at the cap is a truncated key, and most of them lead to a talk page that 404s.
  if (!slug || slug.length >= truncatedSlugLength) {
    return
  }

  // The snippet states its own poster in `su`, on `images.ted.com`, and those files still serve
  // with no signature and no expiry.
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

  // The thumbnail is not derivable from the slug: TED's oEmbed returns `thumbnail_url`, so an
  // iframe carrier leaves it to enrichment. Only the Flash carrier states one, in its own config.
  return {
    provider,
    id: talk.slug,
    // Feeds carry a short slug (`ethan_zuckerman`) and TED redirects it to the full one, which
    // cannot be derived offline. `/embed/{slug}` reaches the canonical player in a single hop
    // while the `/talks/` path in the markup takes two.
    src: `https://embed.ted.com/embed/${talk.slug}`,
    url: `https://www.ted.com/talks/${talk.slug}`,
    ...trimObject({ thumbnail: talk.thumbnail, title }, Boolean),
  }
}

export const tedEmbedResolver = createUrlEmbedResolver(tedHosts, tedResolveEmbed)

// Starts playback on the click that loads the player: the embed reads `autoplay` out of its route
// query. It reaches the player only when the url does not redirect, since the embed's 308 from
// a legacy talk slug to the canonical one drops the query.
export const tedRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: 'true' },
}
