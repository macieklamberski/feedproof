import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const megatvHosts = ['megatv.com']

const safeEmbedIdRegex = /^\d+$/

// The 2020 is a fixed prefix the player plugin writes, not the year.
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

  const post = id.match(prefixedPostIdRegex)?.[1]

  return {
    provider: 'megatv',
    id,
    src: `https://www.megatv.com/embed/?p=${id}`,
    url: post ? `https://www.megatv.com/?p=${post}` : undefined,
    title: attr(element, 'title'),
    ratio: '16/9',
  }
}

// Mega TV's player iframe, megatv.com/embed/?p={id}.
export const megatvEmbedResolver = createUrlEmbedResolver(megatvHosts, megatvResolveEmbed)
