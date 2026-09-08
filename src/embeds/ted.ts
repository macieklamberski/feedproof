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
const adKeysTalkRegex = /(?:^|;)talk=([a-z0-9_]+)/i

// TED cut the talk key off at this length, so a slug that long is usually a prefix of the real one
// but not always. Of the 17 sitting at the cap among 196 slugs mined from the corpus, 11 answered
// 404 when probed on 2026-09-07 and 6 reached a real talk. Nothing else in the flashVars tells the
// two apart, so the cap is refused whole: that costs those 6 talks and avoids 11 TED placeholders
// whose link does not serve.
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
//
// The carrier's title names the talk rather than the player: across 26 titled frames in a 1/16
// corpus sample the commonest value covered 12% of them.
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
    ...trimObject({ thumbnail: talk.thumbnail, title }),
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
