import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Eight url-safe base64 characters, in all 179 embeds the corpus carries.
const safeIdRegex = /^[A-Za-z0-9_-]{8}$/

const zencastrHosts = ['zencastr.com']

// The player is a square that tracks its width: the video sits in an `aspect-ratio: 1080 / 1080`
// box at `max-width: 100%` (Chrome, 2026-09-06), and Zencastr's own snippet frames it at 480 by
// 480. A ratio keeps that shape at any width, which is why it is preferred over the snippet's
// pixels.
const playerRatio = '480/480'

// The embed page answers 200 for a real episode and 404 for an invented one (2026-09-06).
export const zencastrResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, zencastrHosts)
  const [route, id, ...rest] = parsed ? getPathSegments(parsed) : []

  if (route !== 'embed' || !id || rest.length || !safeIdRegex.test(id)) {
    return
  }

  return {
    provider: 'zencastr',
    id,
    src: `https://zencastr.com/embed/${id}`,
    ratio: playerRatio,
  }
}

// Zencastr's embed code is a styled blockquote holding the logo and a "View on Zencastr" link,
// which a loader script swaps for an iframe of `data-episode-href`. Without the script the
// reader shows a black box with a link and no player.
export const zencastrBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.zenplayer[data-episode-href]',
  (element) => {
    return zencastrResolveEmbed(attr(element, 'data-episode-href') ?? '')
  },
  { preferResolverSize: true },
)

export const zencastrIframeEmbedResolver = createUrlEmbedResolver(
  zencastrHosts,
  zencastrResolveEmbed,
  { preferResolverSize: true },
)
