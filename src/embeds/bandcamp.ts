import { getPathSegments, parseUrl, toMap, trimObject } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, text } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const releaseRegex = /^(album|track)=(\d+)$/
const sizeRegex = /^size=([a-z0-9_]+)$/

// Bandcamp has one `tall` preset whose height depends on the release, hence the two slashed keys.
const presetHeights = toMap({
  venti: 100,
  grande: 100,
  grande2: 355,
  grande3: 415,
  large: 470,
  medium: 120,
  small: 42,
  short: 23,
  'tall/album': 295,
  'tall/track': 270,
  tall2: 450,
})
const releaseKinds = ['album', 'track']
const numericIdRegex = /^\d+$/

const videoPathRegex = /\/videoembed/i

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
  const release = releases.find(([kind]) => kind === 'track') ?? releases[0]

  return release ? `${release[0]}/${release[1]}` : undefined
}

const bandcampHosts = ['bandcamp.com']

const parseFallback = (element: Element): Element | undefined => {
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
  const isVideo = videoPathRegex.test(parsed.pathname) && kind === 'track'
  const preset = getPathSegments(parsed)
    .map((segment) => segment.match(sizeRegex)?.[1])
    .find(Boolean)
  const size = preset ? `size=${preset}/` : ''
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
