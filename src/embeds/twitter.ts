import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, text } from '../utils/dom.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// A tweet ships as `<blockquote class="twitter-tweet">` holding the tweet text in a `<p>`, then
// a byline reading "— Display Name (@user)" beside a dated anchor to the status, followed by a
// `widgets.js` loader that turns the quote into a player. The script is stripped from most
// feeds and absent from a quarter of them outright, so it is never required for a match: the
// blockquote is the embed, and the text it carries is the readable copy of the tweet.
//
// The status id is the only thing the player needs, and it sits in the anchor. `x.com`,
// `twitter.com` and `mobile.twitter.com` all appear, sometimes several eras in one feed.
//
// The proxy front-ends republish a tweet at that same path, so the handle and the id come across
// unchanged and the placeholder is built from them like any other. The proxy url is dropped in
// favour of the x.com one: fxtwitter, fixupx and twittpr send a browser there themselves, and the
// front-ends that do serve their own page are the ones going dark, nitter.net answering with an
// empty body and nitter.poast.org with a 503.
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

// Nitter is self-hosted, so its instances cannot be listed: the corpus holds seven of them and
// xcancel.com is an eighth under a name of its own. What the rest share is the software's name as
// a whole host label, so that is the guard, together with the status path a match still needs.
// Matching `nitter` as a substring would claim theordinaryknitter.net, a real feed host.
const nitterHostRegex = /(^|\.)nitter\./

const isTweetUrl = (url: URL): boolean => {
  const isKnownHost = isHostOf(url, tweetHosts) || isSubdomainOf(url, tweetHosts)

  return isKnownHost || nitterHostRegex.test(url.hostname)
}

// `/{handle}/status/{id}`, with the plural `statuses` form from the earliest era.
const statusPathRegex = /^\/([a-zA-Z0-9_]{1,15})\/status(?:es)?\/(\d+)/
// The byline the embed dialog writes, whose parenthesised handle is dropped: the display name
// is the readable half and the handle is already in the url.
const bylineRegex = /^[—–-]\s*(.+?)\s*\(@[a-zA-Z0-9_]{1,15}\)\s*$/
const safeStatusIdRegex = /^\d+$/

type Status = { handle: string; id: string }

const readStatusUrl = (value: string | undefined): Status | undefined => {
  const parsed = parseUrl(value ?? '', 'https://example.com')

  if (!parsed || !isTweetUrl(parsed)) {
    return
  }

  const match = parsed.pathname.match(statusPathRegex)

  return match ? { handle: match[1], id: match[2] } : undefined
}

// Where the tweet is named, in the order the shapes provide it. The dated anchor is the usual
// answer; a skeleton blockquote that carries no text names the tweet in an attribute instead,
// and a stored-after-render copy names it in the player it already built.
const findStatus = (element: Element): { status: Status; anchor?: Element } | undefined => {
  const anchors = Array.from(element.querySelectorAll('a[href]')).reverse()

  for (const anchor of anchors) {
    const status = readStatusUrl(attr(anchor, 'href'))

    if (status) {
      return { status, anchor }
    }
  }

  const declared =
    attr(element, 'data-twitter-tweet-id') ??
    attr(element, 'data-tweet-id') ??
    attr(element, 'data-tweetid')

  if (declared && safeStatusIdRegex.test(declared)) {
    return { status: { handle: '', id: declared } }
  }

  const frame = parseUrl(attr(find(element, 'iframe[src]'), 'src') ?? '', 'https://example.com')
  const framed = frame?.searchParams.get('id')

  return framed && safeStatusIdRegex.test(framed)
    ? { status: { handle: '', id: framed } }
    : undefined
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
    author: bylineText?.match(bylineRegex)?.[1] ?? (bylineText || undefined),
    date: text(anchor),
  }
}

const composeEmbed = (status: Status, extra: Partial<EmbedResolverResult>): EmbedResolverResult => {
  return {
    provider: 'twitter',
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

// `twitter-tweet` is matched as a class token, never as the whole attribute: it arrives
// compounded with a skeleton class, with the rendered marker, and inside every CMS wrapper.
export const twitterBlockquoteEmbedResolver = createMarkupEmbedResolver(
  '.twitter-tweet',
  extractTweet,
)

// The AMP component names the same tweet in an attribute and carries no text at all, so left
// alone it is dropped as an empty element.
export const twitterAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-twitter[data-tweetid]',
  extractTweet,
)


// The player a stored-after-render copy already points at, and the one this resolver mints, so
// a feed carrying the frame alone still names its provider.
export const twitterResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)
  const id = parsed?.pathname === '/embed/Tweet.html' ? parsed.searchParams.get('id') : undefined

  return id && safeStatusIdRegex.test(id) ? composeEmbed({ handle: '', id }, {}) : undefined
}

export const twitterIframeEmbedResolver = createUrlEmbedResolver(
  ['platform.twitter.com', 'platform.x.com'],
  twitterResolveEmbed,
)
