import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'sketchfab'

// A model uid is 32 hex characters, and it also ends the slugged page url
// (`/3d-models/{slug}-{uid}`), which is how a pasted page link is read.
const safeUidRegex = /^[0-9a-f]{32}$/i
const sluggedUidRegex = /([0-9a-f]{32})$/i

const sketchfabHosts = ['sketchfab.com']

const readModelUid = (parsed: URL): string | undefined => {
  const [route, second, third] = getPathSegments(parsed)

  const isModelRoute = route === 'models' && (third === undefined || third === 'embed')

  // The viewer is `/models/{uid}/embed`, which the retired `/embed/{uid}` and `/show/{uid}`
  // redirect to.
  if (isModelRoute || route === 'embed' || route === 'show') {
    return keepIfMatches(second, safeUidRegex)
  }

  if (route === '3d-models') {
    return second?.match(sluggedUidRegex)?.[1]
  }
}

// The carrier's title is not read: most state the snippet's own label, A 3D model, not the name.
// The thumbnail sits under a per-model hash that the uid does not yield, and
// `sketchfab.com/oembed?url=…` answers with it and the title, with no key.
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
    // The slug is not derivable from the uid, and the site redirects the unslugged `/models/{uid}`
    // to the `/3d-models/{slug}-{uid}` page.
    url: `https://sketchfab.com/models/${uid}`,
  }
}

// Sketchfab's viewer iframe, /models/{uid}/embed, its retired spellings and a pasted page link.
export const sketchfabEmbedResolver = createUrlEmbedResolver(sketchfabHosts, sketchfabResolveEmbed)

// Starts the viewer on the click that loads it; there is no audio to hold back.
export const sketchfabRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autostart: '1' },
}
