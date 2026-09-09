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

// The lookahead refuses a segment of dots alone: the Flash config and the stranded `&` spelling
// arrive as raw text no `URL` has folded, and `..` would climb out of every path minted from it.
const safeIdentifierRegex = /^(?!\.+$)[\w.-]+$/

const archiveHosts = ['archive.org']

// Not `download`: that route serves the files themselves.
// `stream` is the retired BookReader url, and it 302s to `details/{identifier}?view=theater`.
const itemRoutes = ['embed', 'details', 'stream']

// Some publisher tooling wrote `embed/{identifier}&playlist=1`, an ampersand where the query
// should begin, so the whole tail lands inside the path segment.
const readSegmentParts = (link: string): { head: string; strayParams: string } => {
  const segments = getPathSegments(link)
  const segment = itemRoutes.includes(segments[0] ?? '') ? segments[1] : undefined

  return splitStrayParams(segment ?? '')
}

export const extractArchiveIdentifier = (link: string): string | undefined => {
  return keepIfMatches(readSegmentParts(link).head, safeIdentifierRegex)
}

// `playlist` puts the item's whole file list in the player, `list_height` sizes that list, and
// `start` and `end` name a span within a recording.
const archiveEmbedParams = ['playlist', 'list_height', 'start', 'end']

// Every item has a thumbnail at `archive.org/services/img/{identifier}` and a page at
// `archive.org/details/{identifier}`. The thumbnail service answers 200 for anything, a generic
// placeholder png for an unknown identifier.
const composeEmbedResult = (identifier: string, query = ''): EmbedResolverResult => {
  return {
    provider,
    id: identifier,
    src: `https://archive.org/embed/${identifier}${query}`,
    url: `https://archive.org/details/${identifier}`,
    thumbnail: `https://archive.org/services/img/${identifier}`,
  }
}

// The modern audio player is a controls bar 30 tall at every width, and it fills any width.
const audioPlayerHeight = 30

// `embed/{identifier}` serves audio and video alike. Nothing else the archive renders is 30 tall.
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

  // The parameters that say what plays are carried over; the rest is dropped. Anything the
  // ampersand form stranded in the path is read alongside the real query, since that spelling
  // 404s and rejoining it is what makes those embeds work at all.
  const search = parseUrl(url, placeholderBaseUrl)?.search ?? ''
  const { strayParams } = readSegmentParts(url)
  const query = composeQuery({
    ...pickQueryParams(search, archiveEmbedParams),
    // The `&` spelling 404s, so what it stranded in the path is rejoined as query.
    ...pickQueryParams(strayParams, archiveEmbedParams),
  })

  const result = composeEmbedResult(identifier, query)

  // Height alone: a width beside it reads as a ratio, and the box grows while the bar stays 30.
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
// Both dialects write the file as `archive.org/download/{identifier}/{file}`, on the playlist
// entry for a video and on the clip's `baseUrl` for audio.
const downloadIdentifierRegex = /\/\/(?:[\w-]+\.)*archive\.org\/download\/([^/'"?&]+)\//

// A `url` entry in either config dialect, key bare or quoted.
const configFileRegex = /\burl['"]?\s*:\s*['"]([^'"]+)['"]/g

// The swf is the same for audio and video, so only the files the config names tell them apart.
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

  // The config arrives as the `flashVars` attribute or, on the older player, as a `config` query.
  const config = flashVars(element) ?? parsed.searchParams.get('config')
  const identifier = config?.match(downloadIdentifierRegex)?.[1]

  if (!identifier || !safeIdentifierRegex.test(identifier) || !config) {
    return
  }

  const result = composeEmbedResult(identifier)

  return namesAudioFile(config) ? { ...result, height: audioPlayerHeight } : result
}

// The archive's retired Flowplayer swf, which names its item only in the Flash config.
// An audio carrier declares the 26 pixels of the Flash bar it replaced, a player that is gone.
export const archiveFlashEmbedResolver = createUrlEmbedResolver(
  archiveHosts,
  archiveFlashResolveEmbed,
  { preferResolverSize: true },
)

// Starts playback on the click that loads the player, for video and audio items alike.
export const archiveRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
