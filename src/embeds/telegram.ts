import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { atUsername, createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'telegram'

// A channel name and a message id, the pair the widget spells channel/111424. Three characters
// is the floor: t.me/nft/3 serves a real post (checked 2026-09-07), and every reserved route
// that takes a numeric second segment is shorter.
const postRegex = /^([a-zA-Z][a-zA-Z0-9_]{2,})\/(\d+)$/

// The third apex Telegram has always answered on, serving the identical widget: probed live, a
// real post answers 200 there.
const telegramHosts = ['t.me', 'telegram.me', 'telegram.dog']

const composePost = (channel: string, messageId: string): EmbedResolverResult => {
  return {
    provider,
    id: `${channel}/${messageId}`,
    // Without embed=1 t.me serves the open-in-Telegram wrapper page instead of the post.
    src: `https://t.me/${channel}/${messageId}?embed=1`,
    url: `https://t.me/${channel}/${messageId}`,
    author: atUsername(channel),
  }
}

// A forum channel writes a third segment for the topic, and that shape is not read.
const readPost = (value: string | undefined): EmbedResolverResult | undefined => {
  const match = postRegex.exec(value ?? '')

  if (!match?.[1] || !match[2]) {
    return
  }

  return composePost(match[1], match[2])
}

// Telegram ships a post as a bare <script data-telegram-post> whose widget.js builds the iframe.
// Feeds carrying the script almost never hold a t.me iframe anywhere.
export const telegramScriptEmbedResolver = createMarkupEmbedResolver(
  'script[data-telegram-post]',
  (element) => {
    const result = readPost(attr(element, 'data-telegram-post'))

    if (!result) {
      return
    }

    // The widget resizes itself to fit the post, so the snippet states no height at all and
    // `data-width` is the only size it carries. The usual value is `100%`, which is not a pixel
    // size and is dropped here.
    const width = parsePixelSize(attr(element, 'data-width'))

    return width ? { ...result, width } : result
  },
)

// The post iframe that script builds, saved into the feed by a CMS that ran it first.
export const telegramResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  return readPost(getPathSegments(url).join('/'))
}

// The iframe the script above builds at runtime, saved into the feed by a CMS that ran the
// script first, plus the hand-written form some publishers use instead. `telegram.me` serves the
// same page as `t.me` and never redirects to it, so both hosts mint the canonical `t.me` url.
export const telegramIframeEmbedResolver = createUrlEmbedResolver(
  telegramHosts,
  telegramResolveEmbed,
)

// The player reports a `resize` event with its height, `null` for a post it could not load,
// which reads as nothing.
export const readTelegramHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.event === 'resize' ? readPixels(data.height) : undefined
}

export const telegramRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://t.me',
  readHeight: readTelegramHeight,
}
