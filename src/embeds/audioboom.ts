import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'audioboom'

// `[^.]` is deliberate: the enclosure is `posts/{id}-{slug}.mp3` on the same host.
const postIdRegex = /^(\d+)(?:-[^.]*)?$/

// `audioboo.fm` is the pre-rename host.
const audioboomHosts = ['audioboom.com', 'audioboo.fm']

const playerHeights = { v4: 300, legacy: 95 }

export const extractAudioboomPost = (
  link: string,
): { id: string; isCurrent: boolean } | undefined => {
  const segments = getPathSegments(link)
  const marker = segments.findIndex((segment) => segment === 'posts' || segment === 'boos')
  const id = marker >= 0 ? segments[marker + 1]?.match(postIdRegex)?.[1] : undefined

  if (!id) {
    return
  }

  return { id, isCurrent: segments.includes('v4') }
}

export const audioboomResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const post = extractAudioboomPost(url)

  if (!post) {
    return
  }

  return {
    provider,
    id: post.id,
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
export const audioboomWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.ab-player[data-boourl]',
  (element) => {
    const parsed = parseUrlOnHosts(attr(element, 'data-boourl'), audioboomHosts)

    return parsed && audioboomResolveEmbed(parsed.href)
  },
)

export const audioboomRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
