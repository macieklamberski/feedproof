import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Url-safe base64, which is what the embed path takes: a dot or a slash marks a file or a deeper
// route, and the `embed` route serves neither. Not the eight characters every corpus embed has,
// since a wrong id fails the same whether it is minted or passed through, and a bound would
// refuse the next id space.
const safeIdRegex = /^[A-Za-z0-9_-]+$/

// `zen.ai` 301s every zencastr.com path, the episode files on `redirect.zen.ai` included, so the
// route check below is what keeps an enclosure playable.
const zencastrHosts = ['zencastr.com', 'zen.ai']

// The embed page sets its `aspect-ratio` from the episode's own `videoResolution` and falls back to
// a hardcoded `1/1`, so the shape is per episode and the id says nothing about it. Square is what
// Zencastr's recorder writes and the commonest case by a distance: 176 of 228 episodes sampled
// across 116 shows, against 46 landscape and 6 portrait. It beats the carrier's box, which the
// snippet fixes at a square in pixels no publisher chose.
const playerRatio = '1/1'

// `zencastr.com/z/{id}` is the public episode page and takes the same id the player route does,
// which is what the blockquote's "View on Zencastr" link opens. Both routes discriminate,
// checked 2026-09-07 with a browser user agent: `z/cK98nMcr` answers 200 at 2,531,407 bytes
// against 7,732 for `z/zzzzzzzz`, the same pair `embed/` gives.
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
    url: `https://zencastr.com/z/${id}`,
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
