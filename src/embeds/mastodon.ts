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

const statusPathRegex = /^\/@([\w.-]+)\/(\d{6,})(?:\/embed)?\/?$/

const embeddableProtocols = ['https:', 'http:']

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
    id: `${status.host}/${status.id}`,
    src: `${status.origin}/@${status.user}/${status.id}/embed`,
    url: `${status.origin}/@${status.user}/${status.id}`,
    author: `@${status.user}@${status.host}`,
    publisher: status.host,
  }
}

// A Mastodon status: an iframe before 4.3, and from 4.3 a blockquote only embed.js hydrates.
export const mastodonEmbedResolver = createMarkupEmbedResolver(
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

export const readMastodonHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.type === 'setHeight' ? readPixels(data.height) : undefined
}

export const mastodonRenderHint: EmbedRenderHint = {
  provider,
  requestHeight: { type: 'setHeight', id: 0 },
  readHeight: readMastodonHeight,
}
