import { isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, jsonAttr, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { isOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'twitter'

// `x.com`, `twitter.com` and `mobile.twitter.com` all appear, sometimes several eras in one feed.
// The proxy front-ends republish a tweet at the same path, and fxtwitter, fixupx and twittpr
// send a browser to x.com themselves.
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

// nitter as a whole host label only: a substring match claims theordinaryknitter.net.
// Nitter is self-hosted, so its instances cannot be listed, and xcancel.com is one more under a
// name of its own.
const nitterHostRegex = /(^|\.)nitter\./

const isTweetUrl = (url: URL): boolean => {
  const isKnownHost = isOnHosts(url, tweetHosts)

  return isKnownHost || nitterHostRegex.test(url.hostname)
}

// `/{handle}/status/{id}`, with the plural `statuses` form from the earliest era.
const statusPathRegex = /^\/([a-zA-Z0-9_]+)\/status(?:es)?\/(\d+)/

// The paths that name a status and carry no handle: the web client's permalink, the 2015-2017
// video frames, and the card frame before them. The frames are dead, answering 404 or a stub
// for a real id and a fabricated one alike, so the id in them is worth more than the url.
const handlelessPathRegex =
  /^\/(?:i\/(?:web\/status|videos\/tweet|videos|cards\/tfw\/v\d+)|status(?:es)?)\/(\d+)/

// Twitter takes `i` where a handle belongs and redirects to the real one, so a status recovered
// without a handle still yields a url a reader can follow.
const handleStandIn = 'i'
// The dash class is an em dash, an en dash and a hyphen.
// The byline reads "— Display Name (@user)" beside a dated anchor to the status. A skeleton
// blockquote keeps the byline's punctuation and fills in neither half, so it holds `—  (@)`.
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

// Where the tweet is named, in the order the shapes provide it. The dated anchor is the usual
// answer. A skeleton blockquote that carries no text names the tweet in an attribute instead,
// and a stored-after-render copy names it in the player it already built.
const findStatus = (element: Element): { status: Status; anchor?: Element } | undefined => {
  const anchors = Array.from(element.querySelectorAll('a[href]')).reverse()

  for (const anchor of anchors) {
    const status = readStatusUrl(attr(anchor, 'href'))

    if (status) {
      return { status, anchor }
    }
  }

  // The frame has to be the platform's own: `id` is an ordinary parameter name, so any other
  // iframe a publisher nested in the quote would otherwise name the tweet.
  const frame = parseUrl(attr(find(element, 'iframe[src]'), 'src') ?? '', placeholderBaseUrl)
  const framed = frame && isTweetUrl(frame) ? frame.searchParams.get('id') : undefined
  // Each id is validated on its own, because the attributes disagree: a block copied between
  // platforms carries several generations of them and only one is guaranteed to be intact.
  const declared = [
    attr(element, 'data-twitter-tweet-id'),
    attr(element, 'data-tweet-id'),
    attr(element, 'data-tweetid'),
    framed,
  ].find((id) => id && safeStatusIdRegex.test(id))

  return declared ? { status: { handle: '', id: declared } } : undefined
}

// A byline the embed dialog wrote gives up its display name. Anything else is taken whole, since
// a publisher who hand-wrote the line still named someone.
const readAuthor = (bylineText: string | undefined): string | undefined => {
  const byline = bylineText?.match(bylineRegex)

  return byline ? byline[1] || undefined : bylineText || undefined
}

// The tweet text and the byline, which by this point are sibling paragraphs: whatever shape
// the source used, the bare byline has been wrapped into a paragraph of its own upstream.
// A long tweet spans several paragraphs, so every one that is not the byline is tweet text.
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

// Both carriers name the tweet the same four ways and hold their text in the same place, so
// the reading is one function and only the selector separates them.
const extractTweet = (element: Element): EmbedResolverResult | undefined => {
  const found = findStatus(element)

  if (!found) {
    return
  }

  return composeEmbed(found.status, readContent(element, found.anchor))
}

// Twitter's oEmbed blockquote: tweet text and a byline that only widgets.js turns into a player.
export const twitterBlockquoteEmbedResolver = createMarkupEmbedResolver(
  // `twitter-tweet` arrives compounded with a skeleton class, with the rendered marker, and inside
  // every CMS wrapper. A video tweet gets `twitter-video` from the embed dialog, on a blockquote
  // whose insides are the same.
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

// The tweet text arrives as markup, links as `a.tweet-url` anchors and hashtags as
// `span.tweet-fake-link` spans, so it is parsed and read back as plain text.
const readTweetText = (element: Element, fullText: string | undefined): string | undefined => {
  if (!fullText) {
    return
  }

  const container = element.ownerDocument.createElement('div')
  container.innerHTML = fullText

  return text(container)
}

// Substack mirrors tweet media on its own host as a bare `pbs.substack.com/media/{key}.jpg`, and
// a signature or expiry token can only sit in the query string.
const readPhotoUrl = (photos: SubstackTweetAttrs['photos']): string | undefined => {
  const url = photos?.[0]?.img_url

  if (!url) {
    return
  }

  const parsed = parseUrl(url, placeholderBaseUrl)

  // A query carries a signature or an expiry, and a stored url with one stops resolving.
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
  // Sanitizers that strip classes keep data attributes, so some feeds carry the div with the
  // component name alone.
  'div.twitter-embed[data-attrs], div[data-component-name="Twitter2ToDOM"]',
  extractSubstackTweet,
)

// The player a stored-after-render copy already points at, and the one this resolver mints, so
// a feed carrying the frame alone still names its provider. The player has two spellings with
// the same `id` query, and both occur in real feeds.
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
// note.com puts `x.com/{handle}/status/{id}` in every one of its Twitter figures.
// `platform.twitter.com` and `platform.x.com` are subdomains of these two hosts.
export const twitterIframeEmbedResolver = createUrlEmbedResolver(
  ['twitter.com', 'x.com'],
  twitterResolveEmbed,
)

// The player reports its rendered height in a JSON-RPC envelope, unprompted, once the frame is
// in view, and again when a reader expands a truncated post. The other calls in the same
// envelope, `initialized`, `results` and `rendered`, carry no size.
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
