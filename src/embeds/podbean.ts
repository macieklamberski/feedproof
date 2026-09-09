import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { isPlayerJsReady, playerJsPlayRequest } from '../utils/hints.js'
import { isMediaFile, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'podbean'

// The `-pb` suffix is real: the v2 player appends it to its own ids.
const safeIdRegex = /^[a-z0-9]+-[a-z0-9]+(?:-pb)?$/i

const podbeanHosts = ['podbean.com']

const defaultPlayerHeight = 150

export const extractPodbeanId = (link: string): string | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed || isMediaFile(parsed.pathname)) {
    return
  }

  const segments = getPathSegments(parsed)
  const id =
    segments[0] === 'media' && segments[1] === 'player'
      ? segments[2]
      : (parsed.searchParams.get('i') ?? undefined)

  return keepIfMatches(id, safeIdRegex)
}

export const podbeanResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const id = extractPodbeanId(url)

  if (!id) {
    return
  }

  const stated = parseUrl(url, placeholderBaseUrl)?.searchParams.get('size')
  const height = parsePixelSize(stated) ?? defaultPlayerHeight
  const title = attr(element, 'title')

  return {
    provider,
    id,
    src: `https://www.podbean.com/player-v2/?i=${id}`,
    height,
    ...trimObject({ title }, Boolean),
  }
}

// The legacy podbean.com/media/player/{id} iframe, sized for a player Podbean no longer serves.
export const podbeanEmbedResolver = createUrlEmbedResolver(podbeanHosts, podbeanResolveEmbed)

export const podbeanRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
