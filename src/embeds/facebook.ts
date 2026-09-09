import { type Nullish, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, parsePixelSize, text } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const facebookHosts = ['facebook.com', 'fb.watch']

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

const composePluginEmbed = (
  plugin: string,
  href: string,
  extra: Partial<EmbedResolverResult>,
): EmbedResolverResult => {
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
const pluginPathRegex = /^(?:\/v\d+(?:\.\d+)?)?\/plugins\/(?:post|video)\.php$/
const legacyVideoPathRegex = /^\/video\/embed$/
const safeVideoIdRegex = /^\d+$/

const querySize = (url: URL): { width?: number; height?: number } => {
  return {
    width: parsePixelSize(url.searchParams.get('width')),
    height: parsePixelSize(url.searchParams.get('height')),
  }
}

// Whole segments, not `\b`: `reel-big-fish` and `video.game.news` are page names.
const videoPathRegex = /(?:^|\/)(?:videos?|reel|watch)(?:\/|$)/i

// `/reel/{id}`, `/{page}/posts/{id}` or `/{page}/videos/{id}`.
const contentPathRegex = /^\/(?:reel\/[^/]+|[^/]+\/(?:posts|videos)\/[^/]+)/

const watchPathRegex = /^\/watch\/?$/

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

  return {
    provider: 'facebook',
    id: target.href,
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
