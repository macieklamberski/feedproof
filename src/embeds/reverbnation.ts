import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const reverbnationHosts = ['reverbnation.com']

const safeIdRegex = /^[A-Za-z]+_\d+$/

const flashPathRegex = /^\/+widgets\/swf\//

const flashIdParams = ['id', 'emailPlaylist', 'twID']

const composeSource = (id: string, search: string): string => {
  return `https://www.reverbnation.com/widget_code/html_widget/${id}${search}`
}

const readWidgetId = (url: URL): string | undefined => {
  const segments = getPathSegments(url)

  return segments[0] === 'widget_code' && segments[1] === 'html_widget' ? segments[2] : undefined
}

const readFlashId = (url: URL): string | undefined => {
  if (!flashPathRegex.test(url.pathname)) {
    return
  }

  for (const name of flashIdParams) {
    const id = url.searchParams.get(name)

    if (id) {
      return id
    }
  }
}

export const reverbnationResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, reverbnationHosts)

  if (!parsed) {
    return
  }

  const widget = readWidgetId(parsed)
  const id = widget ?? readFlashId(parsed)

  if (!id || !safeIdRegex.test(id)) {
    return
  }

  return {
    provider: 'reverbnation',
    id,
    src: composeSource(id, widget ? parsed.search : ''),
  }
}

// ReverbNation's html widget iframe and the Flash players under widgets/swf/ naming the same id.
export const reverbnationEmbedResolver = createUrlEmbedResolver(
  reverbnationHosts,
  reverbnationResolveEmbed,
)
