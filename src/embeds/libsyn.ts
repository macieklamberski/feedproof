import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parsePixelSize } from '../utils/dom.js'
import { isMediaFile, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

const libsynHosts = ['libsyn.com']

// `show` renders an error and `destination` is another id space, so a show carrier falls through.
const embedKinds = ['episode', 'destination']

// Libsyn spells its player options as path segments, not a query string:
// `/embed/episode/id/{id}/height/{px}/theme/{name}/thumbnail/{yes|no}/…`.
const readPathOption = (segments: Array<string>, name: string): string | undefined => {
  const index = segments.indexOf(name)

  return index >= 0 ? segments[index + 1] : undefined
}

export const extractLibsynEmbed = (
  link: string,
): { kind: string; id: string; height?: number } | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  // An audio file on the player path would otherwise trade its audio element for a placeholder.
  // Libsyn serves the episode audio from the same domain as the players.
  if (!parsed || isMediaFile(parsed.pathname)) {
    return
  }

  const segments = getPathSegments(parsed)

  if (segments[0] !== 'embed' || !embedKinds.includes(segments[1] ?? '')) {
    return
  }

  const id = readPathOption(segments, 'id')

  if (!id || !safeIdRegex.test(id)) {
    return
  }

  const height = readPathOption(segments, 'height')

  return {
    kind: segments[1] as string,
    id,
    height: parsePixelSize(height),
  }
}

export const libsynResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractLibsynEmbed(url)

  if (!embed) {
    return
  }

  const height = embed.height ? `height/${embed.height}/` : ''

  // No thumbnail and no canonical url: `oembed.libsyn.com` answers `No valid media found` to
  // `?item_id={id}` and an HTML page to `?url={player url}`, and artwork needs an authenticated
  // api call.
  return {
    provider: 'libsyn',
    id: `${embed.kind}/${embed.id}`,
    src: `https://play.libsyn.com/embed/${embed.kind}/id/${embed.id}/${height}`,
    height: embed.height,
  }
}

// Libsyn's player iframe, whose old html5-player.libsyn.com host answers 500 for older episodes.
// `play.libsyn.com` serves all of them.
export const libsynEmbedResolver = createUrlEmbedResolver(libsynHosts, libsynResolveEmbed)
