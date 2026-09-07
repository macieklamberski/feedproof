import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Eight url-safe base64 characters, in all 179 embeds the corpus carries.
const safeIdRegex = /^[A-Za-z0-9_-]{8}$/

const zencastrHosts = ['zencastr.com']

// The embed page sets its `aspect-ratio` from the episode's own `videoResolution` and falls back to
// a hardcoded `1/1`, and both come out square: all 68 episodes publishers embed are, and the only
// landscape ones in a 115 episode sample are Zencastr's own how-to videos. It beats the carrier's
// box, which the snippet fixes at a square in pixels no publisher chose.
const playerRatio = '1/1'

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
