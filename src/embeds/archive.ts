import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { flashVars, keepIfMatches } from '../utils/dom.js'
import { audioFileRegex, splitStrayParams } from '../utils/urls.js'
import { createUrlEmbedResolver, getEmbedSize } from '../utils/widgets.js'

// Identifiers are the archive's own slug: letters, digits, dot, underscore and hyphen. The Flash
// config and the stranded `&` spelling reach this as raw text no `URL` has folded, so a segment
// of dots alone is refused too: it would climb out of every path minted from it.
const safeIdentifierRegex = /^(?!\.+$)[\w.-]+$/

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

// The modern audio player is a controls bar and nothing else: measured in a browser at 320, 558
// and 800 pixels wide on 2026-09-06, it is 30 pixels tall at every width. A height that does not
// move with the width is a fixed height, and a bar that fills whatever width it is given states
// no width at all, so the result carries the height alone.
//
// Both branches need it, and only one of them can read the kind from a config. `embed/{identifier}`
// serves audio and video alike, so the iframe branch has nothing in the url to tell them apart.
// What it has is the carrier, and a carrier stating this height is stating the bar: nothing else
// the platform renders is 30 pixels tall. Keeping its width alongside would hand the frontend two
// dimensions, which it reads as a ratio, so the box would grow with the column while the bar
// inside stayed 30 and the rest went blank.
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

  // The query carries what the publisher chose to embed, a track within a playlist or a start
  // offset, so it goes through untouched. Anything the ampersand form stranded in the path
  // rejoins it here.
  const search = parseUrl(url, 'https://example.com')?.search ?? ''
  const { strayParams } = readSegmentParts(url)
  const query = strayParams ? `${search ? `${search}&` : '?'}${strayParams}` : search

  const result = composeEmbedResult(identifier, query)

  return element && declaresAudioPlayer(element) ? { ...result, height: audioPlayerHeight } : result
}

export const archiveIframeEmbedResolver = createUrlEmbedResolver(
  archiveHosts,
  archiveResolveEmbed,
  { preferResolverSize: true },
)

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

// This carrier declares the 26 pixels of the Flash bar it replaced, which is close but describes
// a player that is gone. A video carrier's size still describes the player it gets, and the video
// branch states no size, so `preferResolverSize` leaves it to the carrier.
// The files the config names are what tell the two apart, since the swf is the same. Both
// dialects write them as `url` entries, quoted in either style and with the key bare in the
// older query form.
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
  const parsed = parseUrl(src, 'https://example.com')

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

export const archiveFlashEmbedResolver = createUrlEmbedResolver(
  archiveHosts,
  archiveFlashResolveEmbed,
  { preferResolverSize: true },
)

// Starts playback on the click that loads the player, for video and audio items alike.
export const archiveRenderHint: EmbedRenderHint = {
  provider: 'archive',
  autoplayParams: { autoplay: '1' },
}
