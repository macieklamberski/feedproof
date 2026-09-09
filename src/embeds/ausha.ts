import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const aushaHost = 'ausha.co'

// No length: every id is twelve characters today, and a bound would refuse the next id space.
const safeIdRegex = /^[A-Za-z0-9]+$/

// The v3 player is a fixed height on a fluid width: 220, and 501 with `display=vertical`.
const playerHeight = 220
const verticalHeight = 501

// The v2 widget on the other host has no one height. Its 33 frames state 400 (11), 495 (8),
// 200 (8), 250, 470 and 201, because `playlist` and `mode=latest` change what it holds. Every one
// of them declares a height, so there is nothing here the carrier does not already say.
const widgetHosts = ['widget.ausha.co']
const playerHosts = ['player.ausha.co']

export const aushaResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, aushaHost)

  if (!parsed) {
    return
  }

  const isPlayer = playerHosts.includes(parsed.hostname)
  const isWidget = widgetHosts.includes(parsed.hostname)
  const segments = getPathSegments(parsed)

  // Both hosts serve their player from the root, spelled either bare or as `index.html`.
  if ((!isPlayer && !isWidget) || (segments.length > 0 && segments[0] !== 'index.html')) {
    return
  }

  // An episode and its show are often named together, and the episode is the finer of the two.
  const podcast = parsed.searchParams.get('podcastId') ?? ''
  const show = parsed.searchParams.get('showId') ?? ''
  const named = [
    ['podcast', podcast],
    ['show', show],
  ].find(([, value]) => safeIdRegex.test(value as string))

  if (!named) {
    return
  }

  const [kind, id] = named

  const vertical = parsed.searchParams.get('display') === 'vertical'

  return {
    provider: 'ausha',
    // `api.ausha.co/v1/podcasts/{id}` is key-free and answers with the episode's title, show,
    // publication date, description and audio url, and 404s on a fabricated id. There is no
    // matching route for a show, so the kind says which of the two an enricher is holding.
    id: `${kind}/${id}`,
    src: url,
    ...(isPlayer && { height: vertical ? verticalHeight : playerHeight }),
  }
}

// Ausha's v3 player iframe and the v2 widget, both naming the episode or show in the query.
export const aushaEmbedResolver = createUrlEmbedResolver([aushaHost], aushaResolveEmbed)
