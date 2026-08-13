import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

// Identifiers are the archive's own slug: letters, digits, dot, underscore and hyphen.
const safeIdentifierRegex = /^[\w.-]+$/

const archiveHosts = ['archive.org']

// The Internet Archive embeds an item as `archive.org/embed/{identifier}`, in 1,530 corpus
// feeds. The iframe renders on its own, so what this adds is the poster: every item has a
// thumbnail at `archive.org/services/img/{identifier}`, derivable from the identifier with no
// network call, which is the whole of the class 1 case. It also has a real page to open, at
// `archive.org/details/{identifier}`.
//
// Checked live 2026-08-13 with a browser user agent, which matters here: the earlier attempt
// used curl's default and read the service as unavailable. A real identifier answers 200
// image/jpeg and its details page 200, while an invented one answers 404 for both embed and
// details. The thumbnail service is the exception, answering 200 for anything: an unknown
// identifier gets a generic 2,212-byte png rather than an error, so a poster that turns out
// to be the placeholder is the one failure this cannot rule out.
export const extractArchiveIdentifier = (link: string): string | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const identifier = segments[0] === 'embed' || segments[0] === 'details' ? segments[1] : undefined

  if (identifier && safeIdentifierRegex.test(identifier)) {
    return identifier
  }
}

export const archiveResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const identifier = extractArchiveIdentifier(url)

  if (!identifier) {
    return
  }

  // The query carries what the publisher chose to embed, a track within a playlist or a start
  // offset, so it goes through rather than being rebuilt away.
  const query = parseUrl(url, 'https://example.com')?.search ?? ''

  return {
    provider: 'archive',
    id: identifier,
    src: `https://archive.org/embed/${identifier}${query}`,
    url: `https://archive.org/details/${identifier}`,
    thumbnail: `https://archive.org/services/img/${identifier}`,
  }
}

export const archiveEmbedResolver = createIframeEmbedResolver(archiveHosts, archiveResolveEmbed)
