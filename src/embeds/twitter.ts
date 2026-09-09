import { isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, jsonAttr, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { isOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'twitter'

const tweetHosts = [
  'twitter.com',
  'x.com',
  'xcancel.com',
  'fxtwitter.com',
  'vxtwitter.com',
  'fixupx.com',
  'fixvx.com',
  'twittpr.com',
]

const nitterHostRegex = /(^|\.)nitter\./

const isTweetUrl = (url: URL): boolean => {
  const isKnownHost = isOnHosts(url, tweetHosts)

  return isKnownHost || nitterHostRegex.test(url.hostname)
}

const statusPathRegex = /^\/([a-zA-Z0-9_]+)\/status(?:es)?\/(\d+)/

const handlelessPathRegex =
  /^\/(?:i\/(?:web\/status|videos\/tweet|videos|cards\/tfw\/v\d+)|status(?:es)?)\/(\d+)/

const handleStandIn = 'i'
// The dash class is an em dash, an en dash and a hyphen.
const bylineRegex = /^[—–-]\s*(.*?)\s*\(@[a-zA-Z0-9_]*\)\s*$/
const safeStatusIdRegex = /^\d+$/

type Status = { handle: string; id: string }

const readStatusUrl = (value: string | undefined): Status | undefined => {
  const parsed = parseUrl(value ?? '', placeholderBaseUrl)

  if (!parsed || !isTweetUrl(parsed)) {
    return
  }

  const match = parsed.pathname.match(statusPathRegex)

  if (match) {
    return { handle: match[1], id: match[2] }
  }

  const handleless = parsed.pathname.match(handlelessPathRegex)

  return handleless ? { handle: handleStandIn, id: handleless[1] } : undefined
}

const findStatus = (element: Element): { status: Status; anchor?: Element } | undefined => {
  const anchors = Array.from(element.querySelectorAll('a[href]')).reverse()

  for (const anchor of anchors) {
    const status = readStatusUrl(attr(anchor, 'href'))

    if (status) {
      return { status, anchor }
    }
  }

  const frame = parseUrl(attr(find(element, 'iframe[src]'), 'src') ?? '', placeholderBaseUrl)
  const framed = frame && isTweetUrl(frame) ? frame.searchParams.get('id') : undefined
  const declared = [
    attr(element, 'data-twitter-tweet-id'),
    attr(element, 'data-tweet-id'),
    attr(element, 'data-tweetid'),
    framed,
  ].find((id) => id && safeStatusIdRegex.test(id))

  return declared ? { status: { handle: '', id: declared } } : undefined
}

const readAuthor = (bylineText: string | undefined): string | undefined => {
  const byline = bylineText?.match(bylineRegex)

  return byline ? byline[1] || undefined : bylineText || undefined
}

const readContent = (element: Element, anchor: Element | undefined) => {
  const byline = anchor?.parentElement
  const bylineText = byline
    ? text(byline)
        ?.replace(text(anchor) ?? '', '')
        .trim()
    : undefined
  const body = Array.from(element.querySelectorAll('p'))
    .filter((paragraph) => paragraph !== byline)
    .map((paragraph) => text(paragraph))
    .filter((value) => !!value)
    .join('\n')

  return {
    description: body || undefined,
    author: readAuthor(bylineText),
    date: text(anchor),
  }
}

const composeEmbed = (status: Status, extra: Partial<EmbedResolverResult>): EmbedResolverResult => {
  return {
    provider,
    id: status.id,
    src: `https://platform.twitter.com/embed/Tweet.html?id=${status.id}`,
    url: status.handle ? `https://x.com/${status.handle}/status/${status.id}` : undefined,
    ...extra,
  }
}

const extractTweet = (element: Element): EmbedResolverResult | undefined => {
  const found = findStatus(element)

  if (!found) {
    return
  }

  return composeEmbed(found.status, readContent(element, found.anchor))
}

// Twitter's oEmbed blockquote: tweet text and a byline that only widgets.js turns into a player.
export const twitterBlockquoteEmbedResolver = createMarkupEmbedResolver(
  '.twitter-tweet, blockquote.twitter-video',
  extractTweet,
)

// AMP's amp-twitter names the tweet in an attribute and carries no text without the AMP runtime.
export const twitterAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-twitter[data-tweetid]',
  extractTweet,
)

type SubstackTweetAttrs = {
  url?: string
  full_text?: string
  name?: string
  username?: string
  profile_image_url?: string
  date?: string
  photos?: Array<{ img_url?: string }>
}

const readTweetText = (element: Element, fullText: string | undefined): string | undefined => {
  if (!fullText) {
    return
  }

  const container = element.ownerDocument.createElement('div')
  container.innerHTML = fullText

  return text(container)
}

const readPhotoUrl = (photos: SubstackTweetAttrs['photos']): string | undefined => {
  const url = photos?.[0]?.img_url

  if (!url) {
    return
  }

  const parsed = parseUrl(url, placeholderBaseUrl)

  return parsed?.search === '' ? url : undefined
}

const extractSubstackTweet = (element: Element): EmbedResolverResult | undefined => {
  const attrs = jsonAttr<SubstackTweetAttrs>(element, 'data-attrs')

  if (!attrs) {
    return
  }

  const status = readStatusUrl(attrs.url)

  if (!status) {
    return
  }

  return composeEmbed(status, {
    description: readTweetText(element, attrs.full_text),
    author: attrs.name?.trim() || attrs.username?.trim() || undefined,
    avatar: attrs.profile_image_url?.trim() || undefined,
    date: attrs.date?.trim() || undefined,
    thumbnail: readPhotoUrl(attrs.photos),
  })
}

// Substack's tweet component: an empty div whose data-attrs JSON carries the whole tweet.
export const twitterSubstackEmbedResolver = createMarkupEmbedResolver(
  'div.twitter-embed[data-attrs], div[data-component-name="Twitter2ToDOM"]',
  extractSubstackTweet,
)

const playerPaths = new Set(['/embed/Tweet.html', '/embed/index.html'])

export const twitterResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)
  const id = parsed && playerPaths.has(parsed.pathname) ? parsed.searchParams.get('id') : undefined

  if (id && safeStatusIdRegex.test(id)) {
    return composeEmbed({ handle: '', id }, {})
  }

  const status = readStatusUrl(url)

  return status ? composeEmbed(status, {}) : undefined
}

// A Twitter player iframe, or a frame of the status page, which refuses framing.
export const twitterIframeEmbedResolver = createUrlEmbedResolver(
  ['twitter.com', 'x.com'],
  twitterResolveEmbed,
)

export const readTwitterHeight = (data: unknown): number | undefined => {
  const call = isPlainObject(data) ? data['twttr.embed'] : undefined
  const params =
    isPlainObject(call) && call.method === 'twttr.private.resize' && Array.isArray(call.params)
      ? call.params[0]
      : undefined

  return isPlainObject(params) ? readPixels(params.height) : undefined
}

export const twitterRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://platform.twitter.com',
  readHeight: readTwitterHeight,
}
