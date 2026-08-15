import { getPathSegments, isHostOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const flourishHosts = ['flo.uri.sh', 'public.flourish.studio']

// Flourish publishes two resource kinds under one url grammar: a `visualisation` is a single
// chart and a `story` is a narrated sequence of them. Both are live and both discriminate, a
// real id answering 200 and a fabricated one 403 on either path (probed 2026-08-15), so the
// resource segment is carried rather than assumed.
const flourishResources = ['visualisation', 'story']

const safeIdRegex = /^\d+$/

// The div names its chart by a relative `{resource}/{id}` path, at most with a cache-busting
// query. A full URL or any other shape is dropped.
const widgetSrcRegex = /^([a-z]+)\/(\d+)(?:\?.*)?$/

// `flo.uri.sh` is the canonical player: `public.flourish.studio/{resource}/{id}/embed` answers
// with a shim whose only job is to rewrite the location to it. Both hosts are matched on the
// way in and only the canonical one is minted.
//
// The id carries its resource because the two share an id space in the url and not in the
// platform, so a bare number addresses neither endpoint on its own, and `EnrichEmbedFn`
// receives nothing but the provider and the id.
const composeEmbed = (resource: string, id: string): EmbedResolverResult | undefined => {
  if (!flourishResources.includes(resource) || !safeIdRegex.test(id)) {
    return
  }

  return {
    provider: 'flourish',
    id: `${resource}/${id}`,
    src: `https://flo.uri.sh/${resource}/${id}/embed`,
    url: `https://public.flourish.studio/${resource}/${id}/`,
  }
}

// Flourish ships a chart as `<div class="flourish-embed" data-src="{resource}/{id}">` plus an
// SDK script that builds the iframe at runtime, so a reader shows nothing at all. The div
// usually wraps a static thumbnail img (bare or inside a <noscript>); when present it becomes
// the placeholder's thumbnail.
export const flourishWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.flourish-embed[data-src]',
  (element) => {
    const match = attr(element, 'data-src')?.match(widgetSrcRegex)

    if (!match) {
      return
    }

    const result = composeEmbed(match[1], match[2])
    const thumbnail = attr(element.querySelector('img'), 'src')

    if (result && thumbnail) {
      return { ...result, thumbnail }
    }

    return result
  },
)

// The rendered form, which reaches a feed when the publisher pasted the iframe rather than the
// script snippet. The WordPress oEmbed wrapper points at the same url with a `#?secret=`
// fragment appended; that belongs to WordPress's postMessage handshake rather than to the
// player, so the minted url drops it.
export const flourishResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url)

  if (!parsed || !isHostOf(parsed, flourishHosts)) {
    return
  }

  const segments = getPathSegments(parsed)

  return segments[2] === 'embed' ? composeEmbed(segments[0], segments[1]) : undefined
}

export const flourishIframeEmbedResolver = createUrlEmbedResolver(
  flourishHosts,
  flourishResolveEmbed,
)
