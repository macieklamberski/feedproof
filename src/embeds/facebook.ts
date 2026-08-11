import { coerceNumber, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Facebook's embed SDK ships a post as `<div class="fb-post" data-href="{post url}">` and a
// video as `<div class="fb-video" data-href="{video url}">` next to a script that builds the
// widget at runtime. A reader runs no JS, so both divs render nothing and the post vanishes
// with no fallback link to keep. The keyless plugin endpoints take the href as-is (verified
// live 2026-08-08, 200 on real posts and videos):
//   https://www.facebook.com/plugins/post.php?href={encoded href}
//   https://www.facebook.com/plugins/video.php?href={encoded href}
const facebookHost = 'facebook.com'

// Posts live on the apex and on `web.`/`m.`/`business.` alike, so both checks are the guard,
// and only a url passing it may be interpolated into the plugin template.
const isFacebookUrl = (url: URL): boolean => {
  return isHostOf(url, facebookHost) || isSubdomainOf(url, facebookHost)
}

const extractEmbed = (element: Element, plugin: string): EmbedResolverResult | undefined => {
  const href = attr(element, 'data-href')

  if (!href) {
    return
  }

  const parsed = parseUrl(href, 'https://example.com')

  if (!parsed || !isFacebookUrl(parsed)) {
    return
  }

  return {
    provider: 'facebook',
    id: href,
    src: `https://www.facebook.com/plugins/${plugin}.php?href=${encodeURIComponent(href)}`,
    url: href,
  }
}

export const facebookPostEmbedResolver: EmbedResolver = {
  selector: 'div.fb-post[data-href]',
  extract: (element): EmbedResolverResult | undefined => {
    return extractEmbed(element, 'post')
  },
}

export const facebookVideoEmbedResolver: EmbedResolver = {
  selector: 'div.fb-video[data-href]',
  extract: (element): EmbedResolverResult | undefined => {
    return extractEmbed(element, 'video')
  },
}

// The plugin url the SDK builds at runtime, which is also what Facebook's own embed dialog
// hands a publisher to paste. It is the more common of the two forms, so most Facebook embeds
// arrive already pointing at a working player and only need naming.
const pluginPathRegex = /^\/plugins\/(?:post|video)\.php$/

// The dialog writes the chosen size into the query as well as onto the element, and the query
// copy survives a CMS that strips presentation attributes. It is the publisher's own number,
// not a guess: a Reel comes out vertical (267x476 and 304x540 are both in the corpus) and a
// landscape video 560x314, where a shared default would make both 16:9. A size on the element
// still wins, since the widget pass reads that first.
const querySize = (url: URL): { width?: number; height?: number } => {
  return {
    width: coerceNumber(url.searchParams.get('width')),
    height: coerceNumber(url.searchParams.get('height')),
  }
}

export const facebookResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed || !pluginPathRegex.test(parsed.pathname)) {
    return
  }

  const href = parsed.searchParams.get('href')
  const target = href ? parseUrl(href) : undefined

  if (!href || !target || !isFacebookUrl(target)) {
    return
  }

  // The src stays as the publisher wrote it. Rebuilding it from the href alone would drop
  // `show_text`, which decides whether a video carries its caption.
  return {
    provider: 'facebook',
    id: href,
    src: url,
    url: href,
    ...querySize(parsed),
  }
}

export const facebookIframeEmbedResolver = createUrlEmbedResolver(
  [facebookHost],
  facebookResolveEmbed,
)
