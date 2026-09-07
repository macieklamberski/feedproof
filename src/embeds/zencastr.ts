import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Eight url-safe base64 characters, in all 179 embeds the corpus carries.
const safeIdRegex = /^[A-Za-z0-9_-]{8}$/

const zencastrHosts = ['zencastr.com']

// The embed page takes its `aspect-ratio` from the episode's own `videoResolution` and falls back
// to the square cover art where there is none, so the shape is per episode and landscape ones
// exist: `embed/gH4MR9sB` is 1920 by 1080. Nothing in the eight character id says which, so this
// states the square the snippet frames every episode at and leaves the rest to enrichment. It is
// preferred over that snippet's `width: 480px`, one vendor constant repeated on every carrier.
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
