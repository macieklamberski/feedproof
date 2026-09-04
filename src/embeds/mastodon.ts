import { isAnyOf, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find } from '../utils/dom.js'
import { isRecord, readPixels } from '../utils/hints.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

export type MastodonStatus = {
  origin: string
  host: string
  user: string
  id: string
}

// A status lives at `/@user/<id>`, and the player at that path plus `/embed`. The numeric id
// is a snowflake (18 digits since the release that first shipped the embed endpoint), so a
// six-digit floor rejects a path that merely ends in a number without rejecting anything the
// platform can actually mint.
//
// A post the instance renders on someone else's behalf is filed under the full handle,
// `/@user@origin.instance/<id>`, and that form is refused. Mastodon's route constraint excludes
// `@` from a username, so the path never reaches `statuses#embed`: probed live with a real remote
// status, it 302s to `/redirect/statuses/<id>`, which answers `x-frame-options: DENY` and cannot
// be framed. The embeddable copy lives on the origin instance under a different id, and that
// redirect is the only thing mapping one to the other. A local post written under its own full
// handle fails the same way, so nothing is lost by refusing the spelling rather than the case.
//
// The AP-canonical spelling, `/users/<user>/statuses/<id>/embed`, routes to the same page but
// is deliberately not matched: the copy-embed UI never emits it, and it appears in none of the
// 352 corpus matches.
const statusPathRegex = /^\/@([\w.-]+)\/(\d{6,})(?:\/embed)?\/?$/

const embeddableProtocols = ['https:', 'http:']

export const parseMastodonStatus = (link: string): MastodonStatus | undefined => {
  const parsed = parseUrl(link)

  // A `javascript:` url parses and can carry a matching pathname, but its origin is the
  // string "null", so the check is what keeps one out of a minted embed url.
  if (!parsed || !isAnyOf(parsed.protocol, embeddableProtocols)) {
    return
  }

  const match = statusPathRegex.exec(parsed.pathname)

  if (!match) {
    return
  }

  return { origin: parsed.origin, host: parsed.host, user: match[1], id: match[2] }
}

const composeEmbedResult = (status: MastodonStatus): EmbedResolverResult => {
  return {
    provider: 'mastodon',
    // `EnrichEmbedFn` is handed `{provider, id}` and nothing else, and a status id is unique
    // only within the instance that minted it: two instances number their posts from the
    // same sequence. So the instance travels inside the id, or no lookup can be addressed
    // from a placeholder at all.
    id: `${status.host}/${status.id}`,
    src: `${status.origin}/@${status.user}/${status.id}/embed`,
    url: `${status.origin}/@${status.user}/${status.id}`,
    // The path names the user alone and the url carries the instance, so the handle is built
    // from the pair.
    author: `@${status.user}@${status.host}`,
    // On a federated network the instance is the thing that published the post, and it is
    // what the platform's own oEmbed reports as its provider name.
    publisher: status.host,
  }
}

// Mastodon has no fixed host: the corpus embeds 121 distinct instances across 352 matches, 83
// of them exactly once, so a host allowlist would miss most of the network while a bare url
// shape would claim every site that files posts under an author and a number. The status parse
// is therefore the guard that every carrier goes through, which lets the selector stay loose
// enough to take a class-less status iframe, since publishers ship those too.
//
// Pre-4.3 instances emit the iframe, with or without its class, 4.3 and later emit a blockquote
// that `embed.js` swaps for the same iframe at runtime, and WordPress strips that script so the
// blockquote arrives with only its anchor. The blockquote holds no post text, just the platform
// logo and a "View on Mastodon" caption, so nothing is lost by replacing it.
//
// Not matched: `aside.mastodon-embed`, which is a hand-typed quote of a post carrying the real
// body text and no embed at all, and `div.mastodon-embed`, which only wraps the iframe that is
// matched inside it.
//
// No size is derived here. The embed page reports its height by posting a message to the parent
// once it has rendered, so the publisher's markup holds the only height that exists offline, and
// the factory applies whatever the carrier declares.
export const mastodonEmbedResolver = createMarkupEmbedResolver(
  'iframe.mastodon-embed[src], iframe[src$="/embed"], blockquote.mastodon-embed',
  (element) => {
    // Each link is parsed on its own, because a carrier can hold the AP-canonical spelling this
    // resolver deliberately does not match beside an anchor that names the post in the matched
    // form.
    const status = [
      attr(element, 'src'),
      attr(element, 'data-embed-url'),
      attr(find(element, 'a[href]'), 'href'),
    ]
      .map((link) => (link ? parseMastodonStatus(link) : undefined))
      .find(Boolean)

    return status ? composeEmbedResult(status) : undefined
  },
)

// The player reports its height only when asked: post `setHeight` into the frame once it has
// loaded and it answers with the same type and the rendered height. The frame is served by the
// publisher's instance, so it has no origin to name here and the reader matches the frame's own.
export const readMastodonHeight = (data: unknown): number | undefined => {
  return isRecord(data) && data.type === 'setHeight' ? readPixels(data.height) : undefined
}

export const mastodonRenderHint: EmbedRenderHint = {
  provider: 'mastodon',
  requestHeight: { type: 'setHeight', id: 0 },
  readHeight: readMastodonHeight,
}
