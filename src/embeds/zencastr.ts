import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// An id is url-safe base64, and the `embed` route serves neither a file nor a deeper route.
const safeIdRegex = /^[A-Za-z0-9_-]+$/

// `zen.ai` 301s every zencastr.com path, the episode files on `redirect.zen.ai` included.
const zencastrHosts = ['zencastr.com', 'zen.ai']

// The carrier's box is a pixel square the snippet fixed, not a size the publisher chose.
// The embed page sets its `aspect-ratio` from the episode's own `videoResolution` and falls back
// to `1/1`, which is what Zencastr's recorder writes.
const playerRatio = '1/1'

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
    // `zencastr.com/z/{id}` is the public episode page, which the blockquote's "View on Zencastr"
    // link opens.
    url: `https://zencastr.com/z/${id}`,
    ratio: playerRatio,
  }
}

// Zencastr's embed blockquote: a logo and a link that only a loader script swaps for the player.
// Without the script the reader shows a black box with a link and no player.
export const zencastrBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.zenplayer[data-episode-href]',
  (element) => {
    return zencastrResolveEmbed(attr(element, 'data-episode-href') ?? '')
  },
  { preferResolverSize: true },
)

// A Zencastr episode player iframe, which renders on its own but names no poster or page.
export const zencastrIframeEmbedResolver = createUrlEmbedResolver(
  zencastrHosts,
  zencastrResolveEmbed,
  { preferResolverSize: true },
)
