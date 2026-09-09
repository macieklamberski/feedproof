import { type Nullish, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, parsePixelSize, text } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// `fb.watch` is the short-link host the mobile app hands out, found inside both widget divs.
// Posts live on the apex and on `web.`, `m.` and `business.` alike.
const facebookHosts = ['facebook.com', 'fb.watch']

// The embed dialog ships the post text, the page and the date in a fallback `<blockquote cite>`
// that renders when the SDK never loads. The shape is fixed: a caption paragraph, then
// "Posted by {page} on {date}" as two anchors.
const readFallback = (blockquote: Nullish<Element>): Partial<EmbedResolverResult> => {
  if (!blockquote) {
    return {}
  }

  const description = text(find(blockquote, 'p'))
  const anchors = Array.from(blockquote.querySelectorAll('a'))

  if (anchors.length !== 2) {
    return { description }
  }

  return { description, author: text(anchors[0]), date: text(anchors[1]) }
}

const fallbackSelector = '.fb-xfbml-parse-ignore blockquote, blockquote.fb-xfbml-parse-ignore'

// A carrier that does not already hold a plugin url resolves to one built around the page it
// named, which is the only form Facebook frames. The page is also the canonical url, so a caller
// that knows a better id than the href states it in `extra`.
const composePluginEmbed = (
  plugin: string,
  href: string,
  extra: Partial<EmbedResolverResult>,
): EmbedResolverResult => {
  // Absolutised here: `resolveUrlFn` never touches the id or a query, so a bare href would reach
  // enrichment with no scheme and address nothing.
  const absoluteHref = parseUrl(href, 'https://www.facebook.com')?.href ?? href

  return {
    provider: 'facebook',
    id: absoluteHref,
    src: `https://www.facebook.com/plugins/${plugin}.php?href=${encodeURIComponent(absoluteHref)}`,
    url: href,
    ...extra,
  }
}

const extractEmbed = (
  element: Element,
  plugin: string,
  attribute = 'data-href',
): EmbedResolverResult | undefined => {
  const href = attr(element, attribute)

  if (!href || !parseUrlOnHosts(href, facebookHosts)) {
    return
  }

  return composePluginEmbed(plugin, href, readFallback(find(element, fallbackSelector)))
}

// Facebook's SDK div for a post or a video, empty until a script feeds strip builds the widget.
export const facebookWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.fb-post[data-href], div.fb-video[data-href]',
  (element) => {
    return extractEmbed(element, element.classList.contains('fb-post') ? 'post' : 'video')
  },
)

// The pre-SDK <fb:post> tag: an empty element carrying only the url in its href.
export const facebookXfbmlEmbedResolver = createMarkupEmbedResolver(
  'fb\\:post[href]',
  (element) => {
    return extractEmbed(element, 'post', 'href')
  },
)

// The <amp-facebook> component, empty without the AMP runtime.
export const facebookAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-facebook[data-href]',
  (element) => {
    const embedAs = attr(element, 'data-embed-as')

    if (embedAs === 'comment') {
      return
    }

    return extractEmbed(element, embedAs === 'video' ? 'video' : 'post')
  },
)

// `/plugins/post.php` or `/plugins/video.php`, with or without a Graph API version in front.
// Older SDKs prefixed their Graph API version, and those urls still serve the same plugin.
const pluginPathRegex = /^(?:\/v\d+(?:\.\d+)?)?\/plugins\/(?:post|video)\.php$/
// The pre-plugins video frame from old posts, naming its video in `video_id`.
const legacyVideoPathRegex = /^\/video\/embed$/
const safeVideoIdRegex = /^\d+$/

// The dialog writes the chosen size into the query as well as onto the element. A Reel comes out
// vertical, 267x476 or 304x540, and a landscape video 560x314.
const querySize = (url: URL): { width?: number; height?: number } => {
  return {
    width: parsePixelSize(url.searchParams.get('width')),
    height: parsePixelSize(url.searchParams.get('height')),
  }
}

// Whole segments, not `\b`: `reel-big-fish` and `video.game.news` are page names.
// A video, reel or watch path is the video player, and everything else Facebook frames is a post.
const videoPathRegex = /(?:^|\/)(?:videos?|reel|watch)(?:\/|$)/i

// `/reel/{id}`, `/{page}/posts/{id}` or `/{page}/videos/{id}`.
// `/{page}/posts/` and `/{page}/videos/` with nothing after them are the page's listing tabs.
const contentPathRegex = /^\/(?:reel\/[^/]+|[^/]+\/(?:posts|videos)\/[^/]+)/

// The bare `/watch` hub is Facebook's video front page, where every visitor sees something else.
const watchPathRegex = /^\/watch\/?$/

// A Watch video id is numeric, in every spelling the corpus and the platform's own share urls
// carry. Junk in `v` would otherwise mint a plugin frame that cannot load, where the generic
// placeholder at least holds the url the publisher wrote.
const safeWatchIdRegex = /^\d+$/

const isWatchPage = (url: URL): boolean => {
  return watchPathRegex.test(url.pathname) && safeWatchIdRegex.test(url.searchParams.get('v') ?? '')
}

export const facebookResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed) {
    return
  }

  if (legacyVideoPathRegex.test(parsed.pathname)) {
    const videoId = parsed.searchParams.get('video_id')

    if (!videoId || !safeVideoIdRegex.test(videoId)) {
      return
    }

    const watchUrl = `https://www.facebook.com/watch/?v=${videoId}`

    return composePluginEmbed('video', watchUrl, { id: videoId, ...querySize(parsed) })
  }

  if (contentPathRegex.test(parsed.pathname) || isWatchPage(parsed)) {
    const plugin = videoPathRegex.test(parsed.pathname) ? 'video' : 'post'

    return composePluginEmbed(plugin, url, querySize(parsed))
  }

  if (!pluginPathRegex.test(parsed.pathname)) {
    return
  }

  const href = parsed.searchParams.get('href') ?? undefined
  const target = parseUrlOnHosts(href, facebookHosts)

  if (!href || !target) {
    return
  }

  // The src stays as the publisher wrote it. Rebuilding it from the href alone would drop
  // `show_text`, which decides whether a video carries its caption.
  return {
    provider: 'facebook',
    id: target.href,
    // Kept as written: rebuilding it from the href would drop `show_text`, the caption toggle.
    src: url,
    url: href,
    ...querySize(parsed),
  }
}

// Facebook's plugin iframe, or a pasted post, video or watch page, which x-frame-options blanks.
export const facebookIframeEmbedResolver = createUrlEmbedResolver(
  facebookHosts,
  facebookResolveEmbed,
)

// The embed dialog's fallback blockquote, kept by the publisher without its widget div.
export const facebookBlockquoteEmbedResolver = createMarkupEmbedResolver(
  fallbackSelector,
  (element) => {
    const cite = attr(element, 'cite')
    const parsed = parseUrlOnHosts(cite, facebookHosts)

    if (!cite || !parsed) {
      return
    }

    const plugin = videoPathRegex.test(parsed.pathname) ? 'video' : 'post'

    return composePluginEmbed(plugin, cite, readFallback(element))
  },
)
