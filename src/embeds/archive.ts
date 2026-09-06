import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVars, keepIfMatches } from '../utils/dom.js'
import { splitStrayParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Identifiers are the archive's own slug: letters, digits, dot, underscore and hyphen.
const safeIdentifierRegex = /^[\w.-]+$/

const archiveHosts = ['archive.org']

// The Internet Archive embeds an item as `archive.org/embed/{identifier}`. The iframe renders
// on its own, so what this adds is the poster: every item has a
// thumbnail at `archive.org/services/img/{identifier}`, filled from the identifier alone with no
// network call, which is what earns a resolver over the generic iframe placeholder. It also has a
// real page to open, at `archive.org/details/{identifier}`.
//
// Checked live 2026-08-13 with a browser user agent, which matters here: the earlier attempt
// used curl's default and read the service as unavailable. A real identifier answers 200
// image/jpeg and its details page 200, while an invented one answers 404 for both embed and
// details. The thumbnail service is the exception, answering 200 for anything: an unknown
// identifier gets a generic placeholder png, not an error, so a poster that turns out
// to be the placeholder is the one failure this cannot rule out.
// Some publisher tooling wrote `embed/{identifier}&playlist=1`, an ampersand where the query
// should begin, so the whole tail lands inside the path segment. Feeds carry it with
// `playlist=1` and `autoplay=1`, and with the ampersand entity-encoded. Against a live item the
// `&` spelling answers 404 and the `?` spelling answers 200.
// The three routes that name an item in their second segment. `stream` is the retired
// BookReader url and it still resolves: `archive.org/stream/{identifier}` 302s to
// `details/{identifier}?view=theater` for a real item and 404s for an invented one, and the
// same identifier answers 200 on `embed` (2026-09-06), so it is the modern player's item under
// an old name. `download` is deliberately absent: that route serves the files themselves.
const itemRoutes = ['embed', 'details', 'stream']

const readSegmentParts = (link: string): { head: string; strayParams: string } => {
  const segments = getPathSegments(link)
  const segment = itemRoutes.includes(segments[0] ?? '') ? segments[1] : undefined

  return splitStrayParams(segment ?? '')
}

export const extractArchiveIdentifier = (link: string): string | undefined => {
  return keepIfMatches(readSegmentParts(link).head, safeIdentifierRegex)
}

const composeEmbedResult = (identifier: string, query = ''): EmbedResolverResult => {
  return {
    provider: 'archive',
    id: identifier,
    src: `https://archive.org/embed/${identifier}${query}`,
    url: `https://archive.org/details/${identifier}`,
    thumbnail: `https://archive.org/services/img/${identifier}`,
  }
}

export const archiveResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const identifier = extractArchiveIdentifier(url)

  if (!identifier) {
    return
  }

  // The query carries what the publisher chose to embed, a track within a playlist or a start
  // offset, so it goes through untouched. Anything the ampersand form stranded in the path
  // rejoins it here.
  const search = parseUrl(url, 'https://example.com')?.search ?? ''
  const { strayParams } = readSegmentParts(url)
  const query = strayParams ? `${search ? `${search}&` : '?'}${strayParams}` : search

  return composeEmbedResult(identifier, query)
}

export const archiveIframeEmbedResolver = createUrlEmbedResolver(archiveHosts, archiveResolveEmbed)

// The Flash player names no item in its url: the `src` is only the Flowplayer swf under
// `/flow/`, so the item sits in the player's config instead, which arrives as the `flashvars`
// attribute or, on the player that predates it, as a `config` query parameter on the swf.
// Both dialects write the file as `archive.org/download/{identifier}/{file}`, on the playlist
// entry for a video and on the clip's `baseUrl` for audio, so the identifier is the segment
// after `download/`.
//
// Checked live 2026-08-13: identifiers read this way answer 200 on both `embed` and `details`,
// so the Flash player and the modern one name an item the same way. Two of the nine tried are
// gone from the archive entirely, which no reading of the markup could have told apart.
//
// A config can point the archive's player at a file somebody else hosts, so the identifier is
// read from the download host rather than from whichever url the config happens to carry.
const flashPlayerPathRegex = /^\/+flow\//
const downloadIdentifierRegex = /\/\/(?:[\w-]+\.)*archive\.org\/download\/([^/'"?&]+)\//

export const archiveFlashResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(src, 'https://example.com')

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const config = flashVars(element) ?? parsed.searchParams.get('config')
  const identifier = config?.match(downloadIdentifierRegex)?.[1]

  if (!identifier || !safeIdentifierRegex.test(identifier)) {
    return
  }

  return composeEmbedResult(identifier)
}

export const archiveFlashEmbedResolver = createUrlEmbedResolver(
  archiveHosts,
  archiveFlashResolveEmbed,
)

// Starts playback on the click that loads the player, for video and audio items alike.
export const archiveRenderHint: EmbedRenderHint = {
  provider: 'archive',
  autoplayParams: { autoplay: '1' },
}
