import { getPathSegments, isHostOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const flourishHosts = ['flo.uri.sh', 'public.flourish.studio']

// The resource segment is carried, not checked against a list. `visualisation` (a single chart)
// and `story` (a narrated sequence) are the two the corpus holds, 72 and 11 of 83 occurrences
// across 40 feeds, and the endpoint validates the pair: a real id answers 200 and a wrong kind,
// unknown kind or fabricated id all answer 403 (probed 2026-08-15). Enumerating them anyway
// would be the more dangerous choice. The div carrier is an empty element, so a kind this
// resolver refuses is not left as markup: `stripEmptyTags` deletes it and the chart is gone,
// and losing a real chart beats a placeholder that fails to load.
const safeResourceRegex = /^[a-z][a-z-]*$/
const safeIdRegex = /^\d+$/

// `template` is the exception: a real kind on the platform that has no embed form at all.
// `flo.uri.sh/template/{id}/embed` answers 403 for a real template id, and the SDK routes the
// kind to `app.flourish.studio/template/{id}/preview` instead of building an iframe (probed
// 2026-08-16). Carrying it would mint a placeholder that cannot load, which is the one case
// where refusing beats carrying.
const nonEmbeddableResource = 'template'

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
  if (!safeResourceRegex.test(resource) || resource === nonEmbeddableResource) {
    return
  }

  if (!safeIdRegex.test(id)) {
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
// usually wraps a static thumbnail img (bare or inside a <noscript>). When present it becomes
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
// fragment appended. That belongs to WordPress's postMessage handshake, not to the player, so
// the minted url drops it.
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
