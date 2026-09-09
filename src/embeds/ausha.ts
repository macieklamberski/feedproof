import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const aushaHost = 'ausha.co'

const safeIdRegex = /^[A-Za-z0-9]+$/

const playerHeight = 220
const verticalHeight = 501

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

  if ((!isPlayer && !isWidget) || (segments.length > 0 && segments[0] !== 'index.html')) {
    return
  }

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
    id: `${kind}/${id}`,
    src: url,
    ...(isPlayer && { height: vertical ? verticalHeight : playerHeight }),
  }
}

// Ausha's v3 player iframe and the v2 widget, both naming the episode or show in the query.
export const aushaEmbedResolver = createUrlEmbedResolver([aushaHost], aushaResolveEmbed)
