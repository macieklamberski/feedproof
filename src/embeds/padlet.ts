import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A board id is a run of lowercase letters and digits, twelve or sixteen characters in the wild.
// The length is not checked: both routes below are exact and take an id and nothing else, so a
// bound would only refuse the next length Padlet mints. It was not keeping site pages out either,
// which is the job it looked like it was doing: `padlet.com/embed/dashboard` is nine characters
// and resolved under the old bound. Nothing needs keeping out, because Padlet serves nothing but
// a board behind `/embed/` — checked 2026-09-07, `dashboard`, `gallery`, `settings`, `help` and
// `about` all answer 404 at nine bytes there, the same as an invented id, while the site's own
// pages live at the first path segment this resolver never reads. What the alphabet does do is
// exclude the dot, which is what keeps a media file on the host playable, since the enclosure
// probe offers every attachment a feed carries to this resolver.
const safeBoardIdRegex = /^[a-z0-9]+$/

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
