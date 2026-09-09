import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

// PowerPress, Blubrry's WordPress plugin, renders the same player on the publisher's own domain
// as `{site}/?powerpress_embed={postId}-{feed}`, with no Blubrry host in the url at all.
const blubrryHosts = ['blubrry.com']

// The player is 164 tall, one less than the 165 publishers write.
// A fixed height on a fluid width, and still 164 inside a 100-tall frame.
const playerHeight = 164

// Two forms: `/id/{episodeId}/` names the episode, while `/?media_url={mp3}` names the file
// directly. The media url is not promoted to a native <audio>: a provider's player iframe stays
// an embed placeholder, and the raw file is only input for the enrichment hook.
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

  // Not promoted to a native audio: a provider's player iframe stays an embed placeholder.
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

// No render hint: the player listens for a bare number and `-1` flips the button to playing, but
// the audio never starts from it.
export const blubrryEmbedResolver = createUrlEmbedResolver(blubrryHosts, blubrryResolveEmbed)
