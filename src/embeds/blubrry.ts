import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

const blubrryHosts = ['blubrry.com']

// The player is a fixed height on a fluid width. Blubrry publishes no oEmbed, so this and the
// provider tag are what the resolver adds.
//
// Measured 2026-09-07 in Chrome against `player.blubrry.com/id/153989314/` and the `?media_url=`
// form: 164 at 320, 640 and 1280 wide, and still 164 inside a 100-tall frame. Publishers write one
// more than that, and nearly all of them write something: of 13,604 `player.blubrry.com` iframes
// across 305 corpus feeds, 13,001 state 165, 311 state 138, and exactly one states no height at
// all. This number reaches that carrier and every one stating a width and no height, since a lone
// carrier width does not outrank a resolver's size.
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

  return mediaUrl || undefined
}

// PowerPress, Blubrry's WordPress plugin, can render the same player on the publisher's own
// domain (`{site}/?powerpress_embed={postId}-{feed}`) with no Blubrry host in the url at all.
// Host matching cannot reach those, and they keep the generic placeholder.
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

// No play request. The page listens for a bare number, `-1` clicks Play, and the button flips
// to its playing state, but loaded in Chrome by a click the audio never started from it. Nothing
// to send until it does.
