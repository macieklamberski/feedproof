import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A board id is a run of lowercase letters and digits, twelve or sixteen characters in the wild.
const safeBoardIdRegex = /^[a-z0-9]{8,32}$/

const padletHost = 'padlet.com'
const embedPathRegex = /^\/embed\/([^/]+)\/?$/
const previewPathRegex = /^\/padlets\/([^/]+)\/embeds\/preview_embed\/?$/

// The share code sizes the board `height: 608px` at full width, and nearly every carrier
// repeats that; the preview form sizes itself `height: 100%` and so states nothing usable.
const boardHeight = 608

// The social preview is addressed by the board id alone: a real board answers a 240 KB render,
// a fabricated id a 7 KB placeholder, both 200 `image/jpeg` (2026-09-06). The embed route itself
// discriminates, 200 real and 404 fabricated. The board's page is `padlet.com/{user}/{slug}-{id}`
// and neither half is in the embed url, so no page url is minted. The slideshow view of a board
// is a different presentation and is left as the publisher wrote it.
export const padletResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, padletHost)
  const boardId =
    parsed?.pathname.match(embedPathRegex)?.[1] ?? parsed?.pathname.match(previewPathRegex)?.[1]

  if (!boardId || !safeBoardIdRegex.test(boardId)) {
    return
  }

  return {
    provider: 'padlet',
    id: boardId,
    src: `https://padlet.com/embed/${boardId}`,
    thumbnail: `https://padlet.net/social-previews/board/${boardId}/opengraph.jpg`,
    height: boardHeight,
  }
}

export const padletEmbedResolver = createUrlEmbedResolver([padletHost], padletResolveEmbed)
