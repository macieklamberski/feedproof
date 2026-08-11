import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, text } from '../utils/dom.js'
import { embedCarrierSelector, readCarrierUrl } from '../utils/widgets.js'

// A release is either an album or a single track, and the id is Bandcamp's own numeric one.
const releaseRegex = /^(album|track)=(\d+)$/
const sizeRegex = /^size=([a-z0-9_]+)$/

// The size preset is a path segment and it decides the player's exact pixels, so dropping it
// would hand a publisher who chose `large` a short wide bar instead. Preserved in the minted
// url, and used for the height the markup may not state.
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

export const extractBandcampRelease = (link: string): string | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  for (const segment of getPathSegments(parsed)) {
    const match = segment.match(releaseRegex)

    if (match) {
      return `${match[1]}/${match[2]}`
    }
  }

  for (const kind of releaseKinds) {
    const id = parsed.searchParams.get(kind)

    if (id && numericIdRegex.test(id)) {
      return `${kind}/${id}`
    }
  }
}

// Bandcamp's own embed snippet puts a fallback anchor inside the iframe, and that anchor is
// the only place the release page appears: the player url names the release by number and
// never names the artist's subdomain.
//
// Reading it takes one step, because the two parsers disagree about what an iframe contains.
// Fallback content is raw text per the spec, which is what jsdom produces, while linkedom
// exposes it as child elements — so `querySelector` reaches the anchor in one and not the
// other. `innerHTML` is the view they agree on, and re-parsing it into a throwaway element
// turns it back into a real anchor in both. That also makes the parser the entity decoder,
// so the label arrives as `Sam & Dave – Hold On` rather than its escaped form.
const parseFallback = (element: Element): Element | null => {
  const holder = element.ownerDocument.createElement('div')
  holder.innerHTML = element.innerHTML

  return holder.querySelector('a[href*="bandcamp.com"]')
}
export const bandcampEmbedResolver: EmbedResolver = {
  selector: embedCarrierSelector,
  extract: (element): EmbedResolverResult | undefined => {
    const src = readCarrierUrl(element)
    const parsed = parseUrl(src, 'https://example.com')

    if (!parsed || (!isHostOf(parsed, 'bandcamp.com') && !isSubdomainOf(parsed, 'bandcamp.com'))) {
      return
    }

    const release = extractBandcampRelease(src)

    if (!release) {
      return
    }

    const [kind, id] = release.split('/')
    const isVideo = videoPathRegex.test(parsed.pathname)
    const preset = getPathSegments(parsed)
      .map((segment) => segment.match(sizeRegex)?.[1])
      .find(Boolean)
    const size = preset ? `size=${preset}/` : ''
    const result: EmbedResolverResult = {
      provider: 'bandcamp',
      id: release,
      src: isVideo
        ? `https://bandcamp.com/VideoEmbed?${kind}=${id}`
        : `https://bandcamp.com/EmbeddedPlayer/${kind}=${id}/${size}`,
    }

    const height = preset ? presetHeights[preset] : undefined

    if (height) {
      result.height = height
    }

    const anchor = parseFallback(element)
    const url = attr(anchor, 'href')
    // Bandcamp writes the label as "{title} by {artist}". It is kept whole rather than split
    // on " by ", which appears inside real titles too.
    const title = text(anchor)

    if (url) {
      result.url = url
    }

    if (title) {
      result.title = title
    }

    return result
  },
}
