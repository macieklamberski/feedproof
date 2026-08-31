import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// A video hash is a short run of letters and digits, five or seven characters in the wild, so
// the range is held open a little past both.
const safeVideoHashRegex = /^[a-zA-Z0-9]{5,10}$/

const aparatHost = 'aparat.com'
const scriptPathRegex = /^\/embed\/([a-zA-Z0-9]+)$/
const framePathRegex = /^\/video\/video\/embed\/videohash\/([a-zA-Z0-9]+)(?:\/vt\/frame)?\/?$/

// Aparat is Iran's video platform and it embeds two ways. The dominant one is a WordPress-style
// facade, a `<script src="aparat.com/embed/{hash}">` inside an empty div, usually with no
// companion iframe anywhere. That script never runs in a reader and the div dies as an empty
// tag, so today the video is deleted outright rather than degraded: the pipeline turns the
// whole block into nothing. The other carrier is the player iframe itself.
//
// Both name the same player, so both resolve to the same placeholder.
//
// Checked live 2026-08-21: `etc/api/video/videohash/{hash}` answers 200 for a real hash and a
// clean 404 for an invented one, with no key. It carries the title, the uploader, the duration
// and a poster, so the enrichment key this resolver mints has a real endpoint behind it. The
// poster is left to enrichment because its asset url is signed with a `secret=` parameter.
const composeEmbed = (videoHash: string): EmbedResolverResult => {
  return {
    provider: 'aparat',
    id: videoHash,
    src: `https://www.aparat.com/video/video/embed/videohash/${videoHash}/vt/frame`,
    url: `https://www.aparat.com/v/${videoHash}`,
    // Most iframes that state a size are 16:9, so this is the platform's shape rather than a
    // measurement of one player. It matters most on the script carrier, which states no size
    // at all and is the more common carrier.
    ratio: '16/9',
  }
}

const readVideoHash = (url: string | undefined, pathRegex: RegExp): string | undefined => {
  const parsed = parseUrlOnHosts(url, aparatHost)
  const videoHash = parsed?.pathname.match(pathRegex)?.[1]

  return videoHash && safeVideoHashRegex.test(videoHash) ? videoHash : undefined
}

const aparatResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const videoHash = readVideoHash(link, framePathRegex)

  return videoHash ? composeEmbed(videoHash) : undefined
}

export const aparatIframeEmbedResolver: EmbedResolver = createUrlEmbedResolver(
  [aparatHost],
  aparatResolveEmbed,
)

export const aparatScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="aparat.com/embed/"]',
  (element) => {
    // The selector guarantees the host substring is in the src, so only the host and the path
    // shape can reject here. The `data[rnddiv]` and `data[responsive]` query the facade carries
    // name the div the script would have written into, and say nothing about the video.
    const videoHash = readVideoHash(attr(element, 'src'), scriptPathRegex)

    return videoHash ? composeEmbed(videoHash) : undefined
  },
)
