import { isHostOf, isSubdomainOf, type Nullish, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, parsePixelSize, text } from '../utils/dom.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Facebook's embed SDK ships a post as `<div class="fb-post" data-href="{post url}">` and a
// video as `<div class="fb-video" data-href="{video url}">` next to a script that builds the
// widget at runtime. A reader runs no JS, so both divs render nothing and the post vanishes
// with no fallback link to keep. The keyless plugin endpoints take the href as-is (verified
// live 2026-08-08, 200 on real posts and videos):
//   https://www.facebook.com/plugins/post.php?href={encoded href}
//   https://www.facebook.com/plugins/video.php?href={encoded href}
// `fb.watch` is the short-link host the mobile app hands out, and it turns up inside both
// widget divs, so it is a Facebook url for our purposes even though the plugin lives elsewhere.
const facebookHosts = ['facebook.com', 'fb.watch']

// Posts live on the apex and on `web.`/`m.`/`business.` alike, so both checks are the guard,
// and only a url passing it may be interpolated into the plugin template.
const isFacebookUrl = (url: URL): boolean => {
  return isHostOf(url, facebookHosts) || isSubdomainOf(url, facebookHosts)
}

// The copy-paste embed dialog ships the post text, the page and the date inside a fallback
// `<blockquote cite>` that renders when the SDK never loads. Replacing the widget without
// lifting those out would drop the only readable copy of the post.
//
// The shape is fixed: a caption paragraph, then "Posted by {page} on {date}" as two anchors.
// Anything else is not the dialog's output, so only the paragraph is taken.
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

const extractEmbed = (
  element: Element,
  plugin: string,
  attribute = 'data-href',
): EmbedResolverResult | undefined => {
  const href = attr(element, attribute)

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
    ...readFallback(find(element, fallbackSelector)),
  }
}

// The SDK widget div, which is one carrier and not two: a post and a video arrive as the same
// empty `data-href` div and differ only in the class, which is what names the plugin the script
// would have built. Splitting them into a resolver each would state the same reader twice.
export const facebookWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.fb-post[data-href], div.fb-video[data-href]',
  (element) => {
    return extractEmbed(element, element.classList.contains('fb-post') ? 'post' : 'video')
  },
)

// The pre-SDK XFBML tag, still pasted into old blog templates. It is an empty element with the
// url in a plain `href`, so left alone it is deleted as an empty tag and the post disappears.
export const facebookXfbmlEmbedResolver = createMarkupEmbedResolver(
  'fb\\:post[href]',
  (element) => {
    return extractEmbed(element, 'post', 'href')
  },
)

// The AMP component, which names which plugin it wants in `data-embed-as` (post, video or
// comment). A comment thread is page chrome rather than the article's content, so it is left
// for the non-content pass and only the other two resolve.
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

// The plugin url the SDK builds at runtime, which is also what Facebook's own embed dialog
// hands a publisher to paste. It is the more common of the two forms, so most Facebook embeds
// arrive already pointing at a working player and only need naming. Older SDKs prefixed the
// path with their Graph API version (`/v2.5/plugins/post.php`), and those urls still serve
// the same plugin, so the version segment is accepted and ignored.
const pluginPathRegex = /^(?:\/v\d+(?:\.\d+)?)?\/plugins\/(?:post|video)\.php$/
// The pre-plugins video frame from old posts, which names its video in `video_id` instead of an
// encoded href. It is rebuilt onto the current plugin, pointed at the watch page.
const legacyVideoPathRegex = /^\/video\/embed$/
const safeVideoIdRegex = /^\d+$/

// The dialog writes the chosen size into the query as well as onto the element, and the query
// copy survives a CMS that strips presentation attributes. It is the publisher's own number,
// not a guess: a Reel comes out vertical (267x476 and 304x540 are both in the corpus) and a
// landscape video 560x314, where a shared default would make both 16:9. A size on the element
// still wins, since the factory applies what the carrier declares over what this returns.
const querySize = (url: URL): { width?: number; height?: number } => {
  return {
    width: parsePixelSize(url.searchParams.get('width')),
    height: parsePixelSize(url.searchParams.get('height')),
  }
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

    return {
      provider: 'facebook',
      id: videoId,
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(watchUrl)}`,
      url: watchUrl,
      ...querySize(parsed),
    }
  }

  if (!pluginPathRegex.test(parsed.pathname)) {
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
  facebookHosts,
  facebookResolveEmbed,
)

// The same fallback blockquote as above, but the publisher kept only it and dropped the widget
// div, so nothing names the plugin. The url in `cite` does: a video, reel or watch path is the
// video player, everything else is a post. Registered after the widget div, whose subtree this
// would otherwise match a second time.
const videoPathRegex = /\/(?:videos?|reel|watch)\b/i

export const facebookBlockquoteEmbedResolver = createMarkupEmbedResolver(
  fallbackSelector,
  (element) => {
    const cite = attr(element, 'cite')
    const parsed = cite ? parseUrl(cite) : undefined

    if (!cite || !parsed || !isFacebookUrl(parsed)) {
      return
    }

    const plugin = videoPathRegex.test(parsed.pathname) ? 'video' : 'post'

    return {
      provider: 'facebook',
      id: cite,
      src: `https://www.facebook.com/plugins/${plugin}.php?href=${encodeURIComponent(cite)}`,
      url: cite,
      ...readFallback(element),
    }
  },
)
