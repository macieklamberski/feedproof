import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'sketchfab'

const safeUidRegex = /^[0-9a-f]{32}$/i
const sluggedUidRegex = /([0-9a-f]{32})$/i

const sketchfabHosts = ['sketchfab.com']

const readModelUid = (parsed: URL): string | undefined => {
  const [route, second, third] = getPathSegments(parsed)

  const isModelRoute = route === 'models' && (third === undefined || third === 'embed')

  if (isModelRoute || route === 'embed' || route === 'show') {
    return keepIfMatches(second, safeUidRegex)
  }

  if (route === '3d-models') {
    return second?.match(sluggedUidRegex)?.[1]
  }
}

const sketchfabResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)
  const uid = parsed ? readModelUid(parsed) : undefined

  if (!uid) {
    return
  }

  return {
    provider,
    id: uid,
    src: `https://sketchfab.com/models/${uid}/embed`,
    url: `https://sketchfab.com/models/${uid}`,
  }
}

// Sketchfab's viewer iframe, /models/{uid}/embed, its retired spellings and a pasted page link.
export const sketchfabEmbedResolver = createUrlEmbedResolver(sketchfabHosts, sketchfabResolveEmbed)

export const sketchfabRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autostart: '1' },
}
