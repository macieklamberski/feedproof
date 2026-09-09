import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

const blubrryHosts = ['blubrry.com']

const playerHeight = 164

export const extractBlubrryEmbed = (link: string): string | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)

  if (segments[0] === 'id' && segments[1] && safeIdRegex.test(segments[1])) {
    return segments[1]
  }

  const mediaUrl = parsed.searchParams.get('media_url')

  return mediaUrl || undefined
}

// Blubrry's player iframe, by episode id or by media url, with no oEmbed to size it.
export const blubrryResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const id = extractBlubrryEmbed(url)

  if (!id) {
    return
  }

  const isEpisodeId = safeIdRegex.test(id)

  return {
    provider: 'blubrry',
    id,
    src: isEpisodeId
      ? `https://player.blubrry.com/id/${id}/`
      : `https://player.blubrry.com/?media_url=${encodeURIComponent(id)}`,
    height: playerHeight,
  }
}

export const blubrryEmbedResolver = createUrlEmbedResolver(blubrryHosts, blubrryResolveEmbed)
