import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVars, keepIfMatches } from '../utils/dom.js'
import {
  audioFileRegex,
  composeQuery,
  pickQueryParams,
  placeholderBaseUrl,
  splitStrayParams,
} from '../utils/urls.js'
import { createUrlEmbedResolver, getEmbedSize } from '../utils/widgets.js'

const provider = 'archive'

// The lookahead refuses a segment of dots alone.
const safeIdentifierRegex = /^(?!\.+$)[\w.-]+$/

const archiveHosts = ['archive.org']

const itemRoutes = ['embed', 'details', 'stream']

const readSegmentParts = (link: string): { head: string; strayParams: string } => {
  const segments = getPathSegments(link)
  const segment = itemRoutes.includes(segments[0] ?? '') ? segments[1] : undefined

  return splitStrayParams(segment ?? '')
}

export const extractArchiveIdentifier = (link: string): string | undefined => {
  return keepIfMatches(readSegmentParts(link).head, safeIdentifierRegex)
}

const archiveEmbedParams = ['playlist', 'list_height', 'start', 'end']

const composeEmbedResult = (identifier: string, query = ''): EmbedResolverResult => {
  return {
    provider,
    id: identifier,
    src: `https://archive.org/embed/${identifier}${query}`,
    url: `https://archive.org/details/${identifier}`,
    thumbnail: `https://archive.org/services/img/${identifier}`,
  }
}

const audioPlayerHeight = 30

const declaresAudioPlayer = (element: Element): boolean => {
  return getEmbedSize(element, 0).height === audioPlayerHeight
}

export const archiveResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const identifier = extractArchiveIdentifier(url)

  if (!identifier) {
    return
  }

  const search = parseUrl(url, placeholderBaseUrl)?.search ?? ''
  const { strayParams } = readSegmentParts(url)
  const query = composeQuery({
    ...pickQueryParams(search, archiveEmbedParams),
    ...pickQueryParams(strayParams, archiveEmbedParams),
  })

  const result = composeEmbedResult(identifier, query)

  return element && declaresAudioPlayer(element) ? { ...result, height: audioPlayerHeight } : result
}

// The Internet Archive's player iframe, which renders on its own but names no poster or page link.
export const archiveIframeEmbedResolver = createUrlEmbedResolver(
  archiveHosts,
  archiveResolveEmbed,
  { preferResolverSize: true },
)

const flashPlayerPathRegex = /^\/+flow\//
// The segment after `archive.org/download/` on any subdomain.
const downloadIdentifierRegex = /\/\/(?:[\w-]+\.)*archive\.org\/download\/([^/'"?&]+)\//

// A `url` entry in either config dialect, key bare or quoted.
const configFileRegex = /\burl['"]?\s*:\s*['"]([^'"]+)['"]/g

const namesAudioFile = (config: string): boolean => {
  return Array.from(config.matchAll(configFileRegex), (match) => match[1]).some((file) => {
    return audioFileRegex.test(file)
  })
}

export const archiveFlashResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(src, placeholderBaseUrl)

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const config = flashVars(element) ?? parsed.searchParams.get('config')
  const identifier = config?.match(downloadIdentifierRegex)?.[1]

  if (!identifier || !safeIdentifierRegex.test(identifier) || !config) {
    return
  }

  const result = composeEmbedResult(identifier)

  return namesAudioFile(config) ? { ...result, height: audioPlayerHeight } : result
}

// The archive's retired Flowplayer swf, which names its item only in the Flash config.
export const archiveFlashEmbedResolver = createUrlEmbedResolver(
  archiveHosts,
  archiveFlashResolveEmbed,
  { preferResolverSize: true },
)

export const archiveRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
