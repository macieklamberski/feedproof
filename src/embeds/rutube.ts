import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A Rutube video id is a uuid with the dashes stripped. The older numeric ids the same routes
// once carried are not taken: `api/video/{id}/` answers 404 for every one probed, the same as
// for an invented id, so nothing can be minted for them.
const safeVideoIdRegex = /^[0-9a-f]{32}$/

const rutubeHost = 'rutube.ru'

// `/video/embed/{id}` and `/embed/{id}` both 301 to `/play/embed/{id}`, and the playlist route
// `/pl/?pl_video={id}` does the same, so all four spellings mint the one the player serves.
// The Flash player on `video.rutube.ru/{id}` is not one of them: every id it names answers 404
// on the API today, so the carrier is left alone.
const embedPathRegex = /^\/(?:play\/embed|video\/embed|embed)\/([^/]+)\/?$/
const playlistPathRegex = /^\/pl\/?$/

// The route's own parameters, which name the playlist and not the video.
const playlistParams = new Set(['pl_id', 'pl_type', 'pl_video'])

// `api/video/{id}/` and `api/oembed/?url=` both answer key-free with the title, the author, the
// duration and a poster, 200 for a real id and 404 for an invented one (checked 2026-09-06), so
// the id is a self-sufficient enrichment key. The poster file is named by a hash the id does not
// yield, so it stays with enrichment.
//
// The player fills its box, and Rutube's own snippet and oEmbed size it 720x405, which 384 of
// 1,491 corpus iframes repeat exactly; the ratio stands in only where a carrier states nothing,
// since vertical clips are embedded at their own shape.
const composeEmbed = (videoId: string, search: URLSearchParams): EmbedResolverResult => {
  const query = new URLSearchParams()

  for (const [name, value] of search) {
    if (!playlistParams.has(name)) {
      query.set(name, value)
    }
  }

  return {
    provider: 'rutube',
    id: videoId,
    src: `https://rutube.ru/play/embed/${videoId}${query.size ? `?${query}` : ''}`,
    url: `https://rutube.ru/video/${videoId}/`,
    ratio: '16/9',
  }
}

export const rutubeResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, rutubeHost)

  if (!parsed) {
    return
  }

  const candidate = playlistPathRegex.test(parsed.pathname)
    ? parsed.searchParams.get('pl_video')
    : parsed.pathname.match(embedPathRegex)?.[1]
  const videoId = keepIfMatches(candidate, safeVideoIdRegex)

  if (!videoId) {
    return
  }

  const result = composeEmbed(videoId, parsed.searchParams)
  const title = attr(element, 'title')

  return title ? { ...result, title } : result
}

export const rutubeEmbedResolver = createUrlEmbedResolver([rutubeHost], rutubeResolveEmbed)
