import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'telegram'

// A channel name and a message id, the pair the widget spells channel/111424.
const postRegex = /^([a-zA-Z][a-zA-Z0-9_]{2,})\/(\d+)$/

const telegramHosts = ['t.me', 'telegram.me', 'telegram.dog']

const composePost = (channel: string, messageId: string): EmbedResolverResult => {
  return {
    provider,
    id: `${channel}/${messageId}`,
    src: `https://t.me/${channel}/${messageId}?embed=1`,
    url: `https://t.me/${channel}/${messageId}`,
    author: channel,
  }
}

const readPost = (value: string | undefined): EmbedResolverResult | undefined => {
  const match = postRegex.exec(value ?? '')

  if (!match?.[1] || !match[2]) {
    return
  }

  return composePost(match[1], match[2])
}

// Telegram ships a post as a bare <script data-telegram-post> whose widget.js builds the iframe.
export const telegramScriptEmbedResolver = createMarkupEmbedResolver(
  'script[data-telegram-post]',
  (element) => {
    const result = readPost(attr(element, 'data-telegram-post'))

    if (!result) {
      return
    }

    const width = parsePixelSize(attr(element, 'data-width'))

    return width ? { ...result, width } : result
  },
)

// The post iframe that script builds, saved into the feed by a CMS that ran it first.
export const telegramResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  return readPost(getPathSegments(url).join('/'))
}

export const telegramIframeEmbedResolver = createUrlEmbedResolver(
  telegramHosts,
  telegramResolveEmbed,
)

export const readTelegramHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.event === 'resize' ? readPixels(data.height) : undefined
}

export const telegramRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://t.me',
  readHeight: readTelegramHeight,
}
