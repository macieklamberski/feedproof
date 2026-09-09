import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const megatvHosts = ['megatv.com']

const safeEmbedIdRegex = /^\d+$/

// The 2020 is a fixed prefix the player plugin writes, not the year: a June 2026 article embeds
// 20202420350 behind it, checked 2026-09-07.
// Mega switched to it at post 151920 in October 2020, and earlier articles carry eight-digit ids.
const prefixedPostIdRegex = /^2020(\d{6,})$/

const megatvResolveEmbed = (link: string, element: Element): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed || getPathSegments(parsed).join('/') !== 'embed') {
    return
  }

  const id = parsed.searchParams.get('p')

  if (!id || !safeEmbedIdRegex.test(id)) {
    return
  }

  // A shorter number behind the prefix is another id space, and ?p= serves an article for any id.
  // An id without the prefix names a post under some other mapping.
  const post = id.match(prefixedPostIdRegex)?.[1]

  // The embed page answers 200 for any id and plays some other post's video for an unknown one.
  // It carries the poster, a WordPress upload not derivable from the id, in data-kwik_image beside
  // the title.
  return {
    provider: 'megatv',
    id,
    src: `https://www.megatv.com/embed/?p=${id}`,
    url: post ? `https://www.megatv.com/?p=${post}` : undefined,
    title: attr(element, 'title'),
    // The player is Video.js in fluid mode, and the share dialog boxes it 560 by 315.
    ratio: '16/9',
  }
}

// Mega TV's player iframe, megatv.com/embed/?p={id}.
export const megatvEmbedResolver = createUrlEmbedResolver(megatvHosts, megatvResolveEmbed)
