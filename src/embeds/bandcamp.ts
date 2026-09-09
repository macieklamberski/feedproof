import { getPathSegments, parseUrl, toMap, trimObject } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, text } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A release is either an album or a single track, and the id is Bandcamp's own numeric one.
const releaseRegex = /^(album|track)=(\d+)$/
// The `size=` preset is a path segment that decides the player's exact pixels.
const sizeRegex = /^size=([a-z0-9_]+)$/

// Bandcamp has one `tall` preset whose height depends on the release, hence the two slashed keys.
// No preset tracks its width. The presets with a tracklist stretch to the frame and scroll their
// rows inside it, and the rest lay out to a height of their own and leave the remainder blank.
const presetHeights = toMap({
  venti: 100,
  grande: 100,
  grande2: 355,
  grande3: 415,
  large: 470,
  medium: 120,
  small: 42,
  short: 23,
  // Bandcamp spells both `size=tall`, and an unknown preset such as `tall_album` serves `venti`.
  'tall/album': 295,
  'tall/track': 270,
  tall2: 450,
})
const releaseKinds = ['album', 'track']
const numericIdRegex = /^\d+$/

// The audio player spells its options as path segments (`EmbeddedPlayer/album=123/size=large/`)
// while the video player uses a query string (`VideoEmbed?track=123&bgcol=…`). Both are minted
// back at their shortest working form, verified live 2026-08-11, both 200.
const videoPathRegex = /\/videoembed/i

// A player pointing at a track inside an album names both, and the two orders both occur: the
// modern path writes `album=` first and the legacy `v=2/` path writes `track=` first.
const readReleases = (link: string): Array<[string, string]> => {
  const parsed = parseUrl(link, placeholderBaseUrl)
  const releases: Array<[string, string]> = []

  if (!parsed) {
    return releases
  }

  const claim = (kind: string, id: string) => {
    if (!releases.some(([named]) => named === kind)) {
      releases.push([kind, id])
    }
  }

  for (const segment of getPathSegments(parsed)) {
    const match = segment.match(releaseRegex)

    if (match) {
      claim(match[1], match[2])
    }
  }

  for (const kind of releaseKinds) {
    const id = parsed.searchParams.get(kind)

    if (id && numericIdRegex.test(id)) {
      claim(kind, id)
    }
  }

  return releases
}

export const extractBandcampRelease = (link: string): string | undefined => {
  const releases = readReleases(link)
  // The track, not the first spelled: that gave two tracks off one album the same id.
  // Naming both is what the builder writes when a publisher picks a track off an album page.
  const release = releases.find(([kind]) => kind === 'track') ?? releases[0]

  return release ? `${release[0]}/${release[1]}` : undefined
}

const bandcampHosts = ['bandcamp.com']

const parseFallback = (element: Element): Element | undefined => {
  // Re-parsed because jsdom keeps iframe content as text, where querySelector finds no anchor.
  // linkedom exposes it as child elements, and `innerHTML` is the view the two parsers agree on.
  const holder = element.ownerDocument.createElement('div')
  holder.innerHTML = element.innerHTML

  return Array.from(holder.querySelectorAll('a[href]')).find((anchor) =>
    parseUrlOnHosts(attr(anchor, 'href'), bandcampHosts),
  )
}

export const bandcampResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(src, placeholderBaseUrl)
  const releases = readReleases(src)
  const release = releases.find(([kind]) => kind === 'track') ?? releases[0]

  if (!parsed || !release) {
    return
  }

  const [kind, id] = release
  // The video player names a track and only a track: `VideoEmbed?album={id}` answers 404. A video
  // carrier whose only release is an album falls back to the audio player, which does serve it.
  const isVideo = videoPathRegex.test(parsed.pathname) && kind === 'track'
  const preset = getPathSegments(parsed)
    .map((segment) => segment.match(sizeRegex)?.[1])
    .find(Boolean)
  const size = preset ? `size=${preset}/` : ''
  // Album and track both stay: given the album alone the player opens on the first track.
  const selection = releaseKinds
    .flatMap((wanted) => releases.filter(([named]) => named === wanted))
    .map(([named, value]) => `${named}=${value}/`)
    .join('')
  const isAlbum = releases.some(([named]) => named === 'album')
  const tallKey = isAlbum ? 'tall/album' : 'tall/track'
  const presetKey = preset === 'tall' ? tallKey : preset
  const height = presetHeights.get(presetKey ?? '')
  const anchor = parseFallback(element)
  const url = attr(anchor, 'href')
  // Bandcamp writes the label as `{title} by {artist}`, and " by " appears inside real titles too.
  const title = text(anchor)

  return {
    provider: 'bandcamp',
    id: `${kind}/${id}`,
    src: isVideo
      ? `https://bandcamp.com/VideoEmbed?${kind}=${id}`
      : `https://bandcamp.com/EmbeddedPlayer/${selection}${size}`,
    ...trimObject({ height, url, title }, Boolean),
  }
}

// Bandcamp's player iframe, whose fallback anchor is the only place the release page appears.
export const bandcampEmbedResolver = createUrlEmbedResolver(bandcampHosts, bandcampResolveEmbed)
