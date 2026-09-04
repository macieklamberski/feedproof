import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

// `audioboo.fm` is the pre-rename host and still appears in feeds.
const audioboomHosts = ['audioboom.com', 'audioboo.fm']

// The player version decides the size, and the url names it: `/embed/v4` is the full player at
// 300 while the older `/posts/{id}/embed` is the compact bar at 95. Sizing them alike would
// misreserve one of the two.
const playerHeights = { v4: 300, legacy: 95 }

export const extractAudioboomPost = (
  link: string,
): { id: string; isCurrent: boolean } | undefined => {
  const segments = getPathSegments(link)
  // `/posts/{id}/embed[/v4]` is current. `/boos/{id}/embed` is the pre-rename spelling.
  const marker = segments.findIndex((segment) => segment === 'posts' || segment === 'boos')
  const id = marker >= 0 ? segments[marker + 1] : undefined

  if (!id || !safeIdRegex.test(id)) {
    return
  }

  return { id, isCurrent: segments.includes('v4') }
}

// No metadata offline: Audioboom's oEmbed accepts only `audioboom.com` page urls, not the
// `embeds.` player url the markup carries, so a title needs a lookup the enricher would do.
export const audioboomResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const post = extractAudioboomPost(url)

  if (!post) {
    return
  }

  return {
    provider: 'audioboom',
    id: post.id,
    // The form is preserved rather than upgraded. Minting v4 for a legacy embed would put a
    // 300px player inside the 95px the publisher chose, and neither form can be probed:
    // Audioboom 403s every user agent, so the safe move is to keep what the feed states.
    src: post.isCurrent
      ? `https://embeds.audioboom.com/posts/${post.id}/embed/v4`
      : `https://embeds.audioboom.com/posts/${post.id}/embed`,
    height: post.isCurrent ? playerHeights.v4 : playerHeights.legacy,
  }
}

export const audioboomEmbedResolver = createUrlEmbedResolver(audioboomHosts, audioboomResolveEmbed)

// Starts playback on the click that loads the player: the v4 player reads `autoplay` off its
// query and starts from 0 once the audio node is ready. Undocumented, read from its chunks.
export const audioboomRenderHint: EmbedRenderHint = {
  provider: 'audioboom',
  autoplayParams: { autoplay: '1' },
}
