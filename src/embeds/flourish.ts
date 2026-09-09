import { getPathSegments, isHostOf, isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'flourish'

// `flo.uri.sh` is the canonical player. `public.flourish.studio/{resource}/{id}/embed` answers
// with a shim whose only job is to rewrite the location to it.
const flourishHosts = ['flo.uri.sh', 'public.flourish.studio']

// Any resource, not a list: a kind refused here is deleted as an empty div, chart and all.
// `visualisation` and `story` are the two kinds feeds carry, and the endpoint validates the pair:
// a real id answers 200 and a wrong kind, an unknown kind or a fabricated id all answer 403.
const safeResourceRegex = /^[a-z][a-z-]*$/
const safeIdRegex = /^\d+$/

// `template` has no embed form: its `/embed` answers 403 for a real id.
const nonEmbeddableResource = 'template'

// The div names its chart by a relative `{resource}/{id}` path, at most with a cache-busting
// query. A full URL or any other shape is dropped.
const widgetSrcRegex = /^([a-z]+)\/(\d+)(?:\?.*)?$/

const composeEmbed = (resource: string, id: string): EmbedResolverResult | undefined => {
  if (!safeResourceRegex.test(resource) || resource === nonEmbeddableResource) {
    return
  }

  if (!safeIdRegex.test(id)) {
    return
  }

  return {
    provider,
    // Kinds share an id space in the url, not in the platform, so a bare number addresses nothing.
    id: `${resource}/${id}`,
    src: `https://flo.uri.sh/${resource}/${id}/embed`,
    url: `https://public.flourish.studio/${resource}/${id}/`,
  }
}

// Flourish ships a chart as an empty div its SDK script builds into an iframe at runtime.
export const flourishWidgetEmbedResolver = createMarkupEmbedResolver(
  'div.flourish-embed[data-src]',
  (element) => {
    const match = attr(element, 'data-src')?.match(widgetSrcRegex)

    if (!match) {
      return
    }

    const result = composeEmbed(match[1], match[2])
    // The div usually wraps a static thumbnail img, bare or inside a <noscript>.
    const thumbnail = attr(element.querySelector('img'), 'src')

    if (result && thumbnail) {
      return { ...result, thumbnail }
    }

    return result
  },
)

// The pasted player iframe, the form that reaches a feed when the publisher skipped the script.
// The WordPress oEmbed wrapper points at the same url with a `#?secret=` fragment appended.
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

// The chart posts its rendered height unasked, as a JSON string and not an object. The value
// settles over several messages and can be fractional, 400 and then 324.0625 on one chart.
export const readFlourishHeight = (data: unknown): number | undefined => {
  if (typeof data !== 'string') {
    return
  }

  try {
    const message: unknown = JSON.parse(data)

    if (isPlainObject(message) && message.sender === 'Flourish') {
      return readPixels(message.height)
    }
  } catch {}
}

// No `autoplayParams`: a story's `#play-on-load` is a fragment, not a query parameter.
export const flourishRenderHint: EmbedRenderHint = {
  provider,
  // Kept off the minted src: under `auto=1` the chart clips its axis labels and credit line.
  // `auto=1` switches the height reporting on, and without it the frame posts nothing at all.
  params: { auto: '1' },
  readHeight: readFlourishHeight,
}
