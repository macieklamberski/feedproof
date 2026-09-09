import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parsePixelSize } from '../utils/dom.js'
import { isMediaFile, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

const libsynHosts = ['libsyn.com']

const embedKinds = ['episode', 'destination']

const readPathOption = (segments: Array<string>, name: string): string | undefined => {
  const index = segments.indexOf(name)

  return index >= 0 ? segments[index + 1] : undefined
}

export const extractLibsynEmbed = (
  link: string,
): { kind: string; id: string; height?: number } | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

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

  return {
    provider: 'libsyn',
    id: `${embed.kind}/${embed.id}`,
    src: `https://play.libsyn.com/embed/${embed.kind}/id/${embed.id}/${height}`,
    height: embed.height,
  }
}

// Libsyn's player iframe, whose old html5-player.libsyn.com host answers 500 for older episodes.
export const libsynEmbedResolver = createUrlEmbedResolver(libsynHosts, libsynResolveEmbed)
