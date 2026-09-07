import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, text } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A release is either an album or a single track, and the id is Bandcamp's own numeric one.
const releaseRegex = /^(album|track)=(\d+)$/
const sizeRegex = /^size=([a-z0-9_]+)$/

// The size preset is a path segment and it decides the player's exact pixels, so dropping it
// would hand a publisher who chose `large` a short wide bar instead. Preserved in the minted
// url, and used for the height the markup may not state.
//
// Measured 2026-09-07 in Chrome against album 1578579597 (8 tracks), track 1637967854, each
// preset framed at 350 wide and again at 700, the `tall_*` ones at 150, with the frame first at
// the height below and then at 1200. No preset tracks its width, and only `large` stretches to
// the frame, its tracklist scrolling inside whatever it gets; the rest lay out to a height of
// their own and leave the remainder blank. `medium` 120, `small` 42 and `venti` 100 match to
// the pixel. `grande` paints 100, its controls overlapping a 100-square artwork. `grande2` and
// `grande3` paint 318 and 376 for this album, both tracklist-long, inside 355 and 415. `short`
// paints its play and info row inside 23 and shows a second row when given 42. `tall_album` and
// `tall_track` now serve the same 100-tall bar as `venti`, about 390 wide, clipped at 150 and
// blank below, so 295 and 270 have no rendered counterpart. `tall2` paints 493 for this album
// against 450, the tracklist running past the frame. Left as they are because a size change is a
// behaviour change; they only fire when the carrier states no size, since `decideSize` takes the
// carrier's first.
const presetHeights: Record<string, number> = {
  venti: 100,
  grande: 100,
  grande2: 355,
  grande3: 415,
  large: 470,
  medium: 120,
  small: 42,
  short: 23,
  tall_album: 295,
  tall_track: 270,
  tall2: 450,
}
const releaseKinds = ['album', 'track']
const numericIdRegex = /^\d+$/

// The audio player spells its options as path segments (`EmbeddedPlayer/album=123/size=large/`)
// while the video player uses a query string (`VideoEmbed?track=123&bgcol=…`). Both are minted
// back at their shortest working form, verified live 2026-08-11, both 200.
const videoPathRegex = /\/videoembed/i

// Every release a player url names, in the order it spells them. A player pointing at a track
// inside an album names both, and the two orders both occur: the modern path writes `album=`
// first and the legacy `v=2/` path writes `track=` first. The track segment also moves around
// within the path, so the whole url is read before anything is decided.
const readReleases = (link: string): Array<[string, string]> => {
  const parsed = parseUrl(link, 'https://example.com')
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

// Bandcamp's own embed snippet puts a fallback anchor inside the iframe, and that anchor is
// the only place the release page appears: the player url names the release by number and
// never names the artist's subdomain.
//
// Reading it takes one step, because the two parsers disagree about what an iframe contains.
// Fallback content is raw text per the spec, which is what jsdom produces, while linkedom
// exposes it as child elements, so `querySelector` reaches the anchor in one and not the
// other. `innerHTML` is the view they agree on, and re-parsing it into a throwaway element
// turns it back into a real anchor in both. That also makes the parser the entity decoder,
// so the label arrives decoded, as `Sam & Dave – Hold On`.
const parseFallback = (element: Element): Element | null => {
  const holder = element.ownerDocument.createElement('div')
  holder.innerHTML = element.innerHTML

  return holder.querySelector('a[href*="bandcamp.com"]')
}
const bandcampHosts = ['bandcamp.com']

// The player url is rebuilt from the release rather than kept, but the `size=` preset in the
// publisher's own url is carried across, because the stated height was measured against the
// player that preset selects.
export const bandcampResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(src, 'https://example.com')
  const releases = readReleases(src)
  // A player naming both is a track inside an album, which is what the builder writes when the
  // publisher picks a track from an album page. The track is what they linked, so it names the
  // placeholder. Taking whichever id the url spelled first made the same track come out as the
  // album from one snippet and the track from another, and gave two tracks off one album one id.
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
  // Every release the url named, album before track, which is the order the player writes today.
  // Keeping the track is what makes the player open on it: given the album alone it starts at
  // the first track instead.
  const selection = releaseKinds
    .flatMap((wanted) => releases.filter(([named]) => named === wanted))
    .map(([named, value]) => `${named}=${value}/`)
    .join('')
  const height = preset ? presetHeights[preset] : undefined
  const anchor = parseFallback(element)
  const url = attr(anchor, 'href')
  // Bandcamp writes the label as "{title} by {artist}". It is kept whole instead of split
  // on " by ", which appears inside real titles too.
  const title = text(anchor)

  return {
    provider: 'bandcamp',
    id: `${kind}/${id}`,
    src: isVideo
      ? `https://bandcamp.com/VideoEmbed?${kind}=${id}`
      : `https://bandcamp.com/EmbeddedPlayer/${selection}${size}`,
    ...(height && { height }),
    ...(url && { url }),
    ...(title && { title }),
  }
}

export const bandcampEmbedResolver = createUrlEmbedResolver(bandcampHosts, bandcampResolveEmbed)
