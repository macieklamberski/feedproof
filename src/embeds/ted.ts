import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVars, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

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
const adKeysTalkRegex = /(?:^|;)talk=([a-z0-9_]+)/i

// TED cut the adKeys value off at 55 characters, so a slug of exactly that length is a prefix of
// the real one and the player 404s on it. Measured 2026-09-06 against 151 distinct slugs mined
// from 200 corpus feeds: every one of 20 probed below the cap answered 200 and all 4 probed at
// the cap answered 404, and 13 of the 151 sit at it. A truncated slug is refused rather than
// minted into a url that does not serve.
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

  // The snippet states its own poster, on `images.ted.com`, and those files still serve. It is
  // taken as written rather than composed, since it carries no signature and no expiry and the
  // talk's poster is not derivable from the slug.
  const poster = config.get('su') ?? undefined

  return { slug, thumbnail: parseUrlOnHosts(poster, tedHosts) ? poster : undefined }
}

// Feeds carry a short slug (`ethan_zuckerman`) and TED redirects it to the full one
// (`ethan_zuckerman_listening_to_global_voices`), which cannot be derived offline, so one
// redirect is unavoidable. `/embed/{slug}` reaches the canonical player in a single hop while
// the `/talks/` path in the markup takes two, both checked 2026-08-11.
//
// The canonical talk page is derivable from the slug, which is what a reader gets to click. The
// thumbnail is not derivable from it: TED's oEmbed returns `thumbnail_url` (verified live in the
// platform research) but it is a lookup, so an iframe carrier leaves it to the enrichment hook,
// which needs exactly the provider and id tagged here. Only the Flash carrier states one, in its
// own configuration.
export const tedResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const slug = extractTedTalk(url)
  const talk = slug ? { slug } : readFlashTalk(url, element)

  if (!talk) {
    return
  }

  return {
    provider: 'ted',
    id: talk.slug,
    src: `https://embed.ted.com/embed/${talk.slug}`,
    url: `https://www.ted.com/talks/${talk.slug}`,
    ...(talk.thumbnail && { thumbnail: talk.thumbnail }),
  }
}

export const tedEmbedResolver = createUrlEmbedResolver(tedHosts, tedResolveEmbed)

// Starts playback on the click that loads the player: the embed reads `autoplay` out of its route
// query. It reaches the player only when the url does not redirect, since the embed's 308 from
// a legacy talk slug to the canonical one drops the query.
export const tedRenderHint: EmbedRenderHint = {
  provider: 'ted',
  autoplayParams: { autoplay: 'true' },
}
