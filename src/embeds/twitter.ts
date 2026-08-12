import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, find, text } from '../utils/dom.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

// A tweet ships as `<blockquote class="twitter-tweet">` holding the tweet text in a `<p>`, then
// a byline reading "— Display Name (@user)" beside a dated anchor to the status, followed by a
// `widgets.js` loader that turns the quote into a player. The script is stripped from most
// feeds and absent from a quarter of them outright, so it is never required for a match: the
// blockquote is the embed, and the text it carries is the readable copy of the tweet.
//
// The status id is the only thing the player needs, and it sits in the anchor. `x.com`,
// `twitter.com` and `mobile.twitter.com` all appear, sometimes several eras in one feed.
const twitterHosts = ['twitter.com', 'x.com']

const isTwitterUrl = (url: URL): boolean => {
  return isHostOf(url, twitterHosts) || isSubdomainOf(url, twitterHosts)
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

  if (!parsed || !isTwitterUrl(parsed)) {
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

  const declared = attr(element, 'data-twitter-tweet-id') ?? attr(element, 'data-tweet-id')

  if (declared && safeStatusIdRegex.test(declared)) {
    return { status: { handle: '', id: declared } }
  }

  const frame = parseUrl(attr(find(element, 'iframe[src]'), 'src') ?? '', 'https://example.com')
  const framed = frame?.searchParams.get('id')

  return framed && safeStatusIdRegex.test(framed)
    ? { status: { handle: '', id: framed } }
    : undefined
}

// The tweet text and the byline, which by this point are two sibling paragraphs: whatever shape
// the source used, the bare byline has been wrapped into a paragraph of its own upstream.
const readContent = (element: Element, anchor: Element | undefined) => {
  const byline = anchor?.parentElement
  const bylineText = byline
    ? text(byline)
        ?.replace(text(anchor) ?? '', '')
        .trim()
    : undefined
  const body = find(element, 'p', (paragraph) => paragraph !== byline)

  return {
    description: text(body),
    author: bylineText?.match(bylineRegex)?.[1] ?? (bylineText || undefined),
    date: text(anchor),
  }
}

const composeEmbed = (status: Status, extra: Partial<EmbedResolverResult>): EmbedResolverResult => {
  return {
    provider: 'twitter',
    id: status.id,
    // Verified live 2026-08-12: this host serves the player and 200s, while `platform.x.com`
    // only redirects to it. The watch page is the reverse, `twitter.com` 301s to `x.com`.
    src: `https://platform.twitter.com/embed/Tweet.html?id=${status.id}`,
    url: status.handle ? `https://x.com/${status.handle}/status/${status.id}` : undefined,
    ...extra,
  }
}

// `twitter-tweet` is matched as a class token, never as the whole attribute: it arrives
// compounded with a skeleton class, with the rendered marker, and inside every CMS wrapper.
export const twitterEmbedResolver: EmbedResolver = {
  selector: '.twitter-tweet',
  extract: (element): EmbedResolverResult | undefined => {
    const found = findStatus(element)

    if (!found) {
      return
    }

    return composeEmbed(found.status, readContent(element, found.anchor))
  },
}

// The player a stored-after-render copy already points at, and the one this resolver mints, so
// a feed carrying the frame alone still names its provider.
export const twitterResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)
  const id = parsed?.pathname === '/embed/Tweet.html' ? parsed.searchParams.get('id') : undefined

  return id && safeStatusIdRegex.test(id) ? composeEmbed({ handle: '', id }, {}) : undefined
}

export const twitterIframeEmbedResolver = createIframeEmbedResolver(
  ['platform.twitter.com', 'platform.x.com'],
  twitterResolveEmbed,
)
