import { isAnyOf, isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

const provider = 'mastodon'

export type MastodonStatus = {
  origin: string
  host: string
  user: string
  id: string
}

// A full handle, /@user@origin/{id}, 302s to a page served x-frame-options: DENY.
// A status id is a snowflake, 18 digits since the release that first shipped the embed endpoint.
const statusPathRegex = /^\/@([\w.-]+)\/(\d{6,})(?:\/embed)?\/?$/

// A javascript: url parses with a matching pathname, and its origin is the string null.
const embeddableProtocols = ['https:', 'http:']

// Any host filing posts under an author and a long number takes this shape, Medium among them.
export const parseMastodonStatus = (link: string): MastodonStatus | undefined => {
  const parsed = parseUrl(link)

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
    provider,
    // A status id is unique only within its instance, so the host travels in the id.
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

// A Mastodon status: an iframe before 4.3, and from 4.3 a blockquote only embed.js hydrates.
// WordPress strips embed.js, and the blockquote holds no post text, only a logo, a caption and a
// link.
export const mastodonEmbedResolver = createMarkupEmbedResolver(
  // Publishers ship the status iframe without its class, so the bare src arm stays.
  // aside.mastodon-embed is a hand-typed quote carrying the post's body text, and
  // div.mastodon-embed only wraps the iframe.
  'iframe.mastodon-embed[src], iframe[src$="/embed"], blockquote.mastodon-embed',
  (element) => {
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
  return isPlainObject(data) && data.type === 'setHeight' ? readPixels(data.height) : undefined
}

export const mastodonRenderHint: EmbedRenderHint = {
  provider,
  requestHeight: { type: 'setHeight', id: 0 },
  readHeight: readMastodonHeight,
}
