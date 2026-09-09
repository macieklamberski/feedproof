import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'audioboom'

// `[^.]` keeps the enclosure out: `posts/{id}-{slug}.mp3` sits on the same host, and a slug that
// admitted the dot would turn every playable file into a placeholder.
// Audioboom's share code writes the slug hanging off the id, and the id alone addresses the post.
const postIdRegex = /^(\d+)(?:-[^.]*)?$/

// `audioboo.fm` is the pre-rename host.
const audioboomHosts = ['audioboom.com', 'audioboo.fm']

// `/embed/v4` is the full player at 300, and `/posts/{id}/embed` is the compact bar at 95. Both
// fill whatever frame they get, so these are the smallest box each accepts.
const playerHeights = { v4: 300, legacy: 95 }

export const extractAudioboomPost = (
  link: string,
): { id: string; isCurrent: boolean } | undefined => {
  const segments = getPathSegments(link)
  // `/posts/{id}/embed[/v4]` is current. `/boos/{id}/embed` is the pre-rename spelling.
  const marker = segments.findIndex((segment) => segment === 'posts' || segment === 'boos')
  const id = marker >= 0 ? segments[marker + 1]?.match(postIdRegex)?.[1] : undefined

  if (!id) {
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
    provider,
    id: post.id,
    // Not upgraded to v4: that would put a 300px player inside the 95px the publisher chose.
    src: post.isCurrent
      ? `https://embeds.audioboom.com/posts/${post.id}/embed/v4`
      : `https://embeds.audioboom.com/posts/${post.id}/embed`,
    height: post.isCurrent ? playerHeights.v4 : playerHeights.legacy,
  }
}

// Audioboom's player iframe, the full v4 player or the older compact bar.
export const audioboomIframeEmbedResolver = createUrlEmbedResolver(
  audioboomHosts,
  audioboomResolveEmbed,
)

// Audioboo's WordPress plugin: a div holding the player url, hydrated by a script the feed lacks.
// `data-boourl` holds the same player url the iframe form holds.
export const audioboomWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.ab-player[data-boourl]',
  (element) => {
    const parsed = parseUrlOnHosts(attr(element, 'data-boourl'), audioboomHosts)

    return parsed && audioboomResolveEmbed(parsed.href)
  },
)

// Starts playback on the click that loads the player: the v4 player reads `autoplay` off its
// query and starts from 0 once the audio node is ready. Undocumented, read from its chunks.
export const audioboomRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
