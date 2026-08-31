import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, jsonAttr, text } from '../utils/dom.js'
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

// Nitter is self-hosted, so its instances cannot be listed: real feeds frame a handful of them,
// and xcancel.com is one more under a name of its own. What the rest share is the software's name
// as a whole host label, so that is the guard, together with the status path a match still needs.
// Matching `nitter` as a substring would claim theordinaryknitter.net, a real feed host.
const nitterHostRegex = /(^|\.)nitter\./

const isTweetUrl = (url: URL): boolean => {
  const isKnownHost = isHostOf(url, tweetHosts) || isSubdomainOf(url, tweetHosts)

  return isKnownHost || nitterHostRegex.test(url.hostname)
}

// `/{handle}/status/{id}`, with the plural `statuses` form from the earliest era.
const statusPathRegex = /^\/([a-zA-Z0-9_]{1,15})\/status(?:es)?\/(\d+)/

// The paths that name a status and carry no handle: the web client's permalink, the 2015-2017
// video frames, and the card frame before them. The frames are dead, answering 404 or a stub
// for a real id and a fabricated one alike, so the id in them is worth more than the url.
const handlelessPathRegex =
  /^\/(?:i\/(?:web\/status|videos\/tweet|videos|cards\/tfw\/v\d+)|status(?:es)?)\/(\d+)/

// Twitter takes `i` where a handle belongs and redirects to the real one, so a status recovered
// without a handle still yields a url a reader can follow.
const handleStandIn = 'i'
// The byline the embed dialog writes, whose parenthesised handle is dropped: the display name
// is the readable half and the handle is already in the url. The handle may be empty because a
// skeleton blockquote keeps the byline's punctuation and fills in neither half, so what it holds
// is `—  (@)`. That matches here and yields an empty name, which is how it gets dropped instead
// of being carried through as an author.
const bylineRegex = /^[—–-]\s*(.*?)\s*\(@[a-zA-Z0-9_]{0,15}\)\s*$/
const safeStatusIdRegex = /^\d+$/

type Status = { handle: string; id: string }

const readStatusUrl = (value: string | undefined): Status | undefined => {
  const parsed = parseUrl(value ?? '', 'https://example.com')

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
  const frame = parseUrl(attr(find(element, 'iframe[src]'), 'src') ?? '', 'https://example.com')
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
// A video tweet gets `twitter-video` from the embed dialog instead, on a blockquote whose
// insides are the same, so it reads through the same extraction. That one stays scoped to
// the blockquote the dialog writes, so a stray class on some other element is not claimed.
export const twitterBlockquoteEmbedResolver = createMarkupEmbedResolver(
  '.twitter-tweet, blockquote.twitter-video',
  extractTweet,
)

// The AMP component names the same tweet in an attribute and carries no text at all, so left
// alone it reaches the reader inert: stripEmptyTags skips custom elements, whose emptiness is
// meaningful, and no AMP runtime runs to build the frame.
export const twitterAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-twitter[data-tweetid]',
  extractTweet,
)

// Substack's editor stores a pasted tweet as a component of its own: a div whose `data-attrs`
// JSON carries the whole tweet, and whose body is rendered client-side, so left alone it is
// dropped as an empty tag. The keys read here are the ones every live payload carries. The
// engagement counts ride along in the same blob and are never emitted, and a `quoted_tweet`
// object nests another payload that is not read: only the outer tweet is resolved.
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

// The first photo, only when its url carries no query. Substack mirrors tweet media on its
// own host as a bare `pbs.substack.com/media/{key}.jpg` (checked live 2026-08-15: a real key
// answers 200 image/jpeg, a made-up one 404), so that form is stable. A signature or expiry
// token can only sit in the query string, so a url carrying one is left for enrichment.
const readPhotoUrl = (photos: SubstackTweetAttrs['photos']): string | undefined => {
  const url = photos?.[0]?.img_url
  const parsed = parseUrl(url ?? '')

  return parsed && parsed.search === '' ? url : undefined
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

// The component name is the second handle on purpose: sanitizers that strip classes keep
// data attributes, so some feeds carry the div with the name alone.
export const twitterSubstackEmbedResolver = createMarkupEmbedResolver(
  'div.twitter-embed[data-attrs], div[data-component-name="Twitter2ToDOM"]',
  extractSubstackTweet,
)

// The player a stored-after-render copy already points at, and the one this resolver mints, so
// a feed carrying the frame alone still names its provider. The player has two spellings with
// the same `id` query, and both occur in real feeds.
const playerPaths = new Set(['/embed/Tweet.html', '/embed/index.html'])

// A carrier framing the status page rather than the player, which is what a wrapper writes when
// it stores the url the author pasted: note.com puts `x.com/{handle}/status/{id}` in every one of
// its Twitter figures. That page cannot be framed at all (`x-frame-options: SAMEORIGIN`, checked
// 2026-08-15), so left unclaimed it reaches a reader as a placeholder pointing at a page that
// renders nothing. The status id is all the player needs and the path already states it, so the
// same placeholder the blockquote carrier builds is mintable from the url alone.
export const twitterResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)
  const id = parsed && playerPaths.has(parsed.pathname) ? parsed.searchParams.get('id') : undefined

  if (id && safeStatusIdRegex.test(id)) {
    return composeEmbed({ handle: '', id }, {})
  }

  const status = readStatusUrl(url)

  return status ? composeEmbed(status, {}) : undefined
}

// `twitter.com` and `x.com` cover the player hosts too, since `platform.twitter.com` and
// `platform.x.com` are subdomains of them and the host gate matches a subdomain as well as the
// host itself. The proxy front-ends stay out: `readStatusUrl` would accept their paths, but a
// framed proxy page is a page like any other and several of them are going dark.
export const twitterIframeEmbedResolver = createUrlEmbedResolver(
  ['twitter.com', 'x.com'],
  twitterResolveEmbed,
)
