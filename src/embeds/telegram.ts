import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { atUsername, createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'telegram'

// A channel and a message id, the pair the widget spells `channel/111424`. Telegram's signup
// form asks for five characters, but shorter names exist: Telegram holds some itself and
// Fragment auctions the rest, and `t.me/nft/3?embed=1` serves a real post (checked 2026-09-07).
// Three is the floor because every reserved route that takes a numeric second segment is
// shorter than that, the private channel's own `c/{id}` included. A message id is a plain
// counter. A forum channel writes a third segment for the topic, and that shape is left alone:
// no real specimen was available to check the url against.
const postRegex = /^([a-zA-Z][a-zA-Z0-9_]{2,})\/(\d+)$/

// The third apex Telegram has always answered on, serving the identical widget: probed live, a
// real post answers 200 there.
const telegramHosts = ['t.me', 'telegram.me', 'telegram.dog']

// `?embed=1` is what makes t.me answer with the post itself. The same path without it serves the
// "open in Telegram" page that wraps the post in action buttons (checked 2026-08-14), so the
// parameter repairs a bare link as much as it normalizes the two carriers onto one url. A
// fabricated message id answers with a "Post not found" bubble, which is how the mint was
// verified against a real one.
const composePost = (channel: string, messageId: string): EmbedResolverResult => {
  return {
    provider,
    id: `${channel}/${messageId}`,
    src: `https://t.me/${channel}/${messageId}?embed=1`,
    url: `https://t.me/${channel}/${messageId}`,
    author: atUsername(channel),
  }
}

const readPost = (value: string | undefined): EmbedResolverResult | undefined => {
  const match = postRegex.exec(value ?? '')

  if (!match?.[1] || !match[2]) {
    return
  }

  return composePost(match[1], match[2])
}

// Telegram ships a post as a bare `<script async src="https://telegram.org/js/telegram-widget.js"
// data-telegram-post="channel/111424">` that builds the player iframe at runtime. The script is
// stripped and the post goes with it, so the pipeline returns only the paragraphs around it:
// feeds carrying the script almost never hold a t.me iframe anywhere.
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
