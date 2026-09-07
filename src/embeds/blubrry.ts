import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

const blubrryHosts = ['blubrry.com']

// The player is 138 tall. Blubrry publishes no oEmbed, so this and the provider tag are what
// the resolver adds.
//
// Measured 2026-09-07 in Chrome against `player.blubrry.com/id/109738465/`: the player box is
// 164 tall at 320, 640 and 1280 wide, and still 164 inside a 100-tall frame, so it is a fixed
// height that ignores its width, and it is 26 more than the 138 above. The carriers say the same:
// of 1,423 `player.blubrry.com` iframes across 40 corpus feeds, 1,285 state 165, 124 state 138, 8
// state 150 and 6 state 230. Left at 138 here because a size change is a behaviour change. The
// number only fires when the carrier states no size, since `decideSize` takes the carrier's first,
// and every one of those 1,423 states a height.
const playerHeight = 138

// Two forms: `/id/{episodeId}/` names the episode, while `/?media_url={mp3}` names the file
// directly. The media url is not promoted to a native <audio>: a provider's player iframe stays
// an embed placeholder, and the raw file is only input for the enrichment hook.
export const extractBlubrryEmbed = (link: string): string | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

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
