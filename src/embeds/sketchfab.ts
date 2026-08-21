import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A model uid is 32 hex characters, and it also ends the slugged page url
// (`/3d-models/{slug}-{uid}`), which is how a pasted page link is read.
const safeUidRegex = /^[0-9a-f]{32}$/i
const sluggedUidRegex = /([0-9a-f]{32})$/i

const sketchfabHosts = ['sketchfab.com']

// The viewer is `sketchfab.com/models/{uid}/embed`, in 168 corpus feeds, and it is what the
// two retired spellings redirect to: `/embed/{uid}` for the viewer and `/show/{uid}` for the
// page. The page itself lives at `/3d-models/{slug}-{uid}`. The slug is not derivable from
// the uid, so the minted url is the unslugged `/models/{uid}`, which the site redirects to it.
// Checked live 2026-08-16: the viewer answers 200 for a real uid and 404 for an invented one.
//
// The thumbnail sits under a per-model hash that the uid does not yield, so it is left to
// enrichment. `sketchfab.com/oembed?url=…` answers with it and the title, with no key.
const readModelUid = (parsed: URL): string | undefined => {
  const [route, second, third] = getPathSegments(parsed)

  if (route === 'models' && (third === undefined || third === 'embed')) {
    return keepIfMatches(second, safeUidRegex)
  }

  if (route === 'embed' || route === 'show') {
    return keepIfMatches(second, safeUidRegex)
  }

  if (route === '3d-models') {
    return second?.match(sluggedUidRegex)?.[1]
  }
}

// The share snippet writes the model's title on the iframe. The oEmbed one writes it empty.
const sketchfabResolveEmbed = (link: string, element: Element): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, 'https://example.com')
  const uid = parsed ? readModelUid(parsed) : undefined

  if (!uid) {
    return
  }

  const title = attr(element, 'title')

  return {
    provider: 'sketchfab',
    id: uid,
    src: `https://sketchfab.com/models/${uid}/embed`,
    url: `https://sketchfab.com/models/${uid}`,
    title,
  }
}

export const sketchfabEmbedResolver = createUrlEmbedResolver(sketchfabHosts, sketchfabResolveEmbed)
