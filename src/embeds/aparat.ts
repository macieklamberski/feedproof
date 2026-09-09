import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const aparatHosts = ['aparat.com']
const scriptPathRegex = /^\/embed\/([a-zA-Z0-9]+)$/
const framePathRegex = /^\/video\/video\/embed\/videohash\/([a-zA-Z0-9]+)(?:\/vt\/frame)?\/?$/

// `aparat.com/etc/api/video/videohash/{hash}` answers with the title, the uploader, the duration
// and a poster, with no key. The poster's asset url is signed with a `secret=` parameter.
const composeEmbed = (videoHash: string): EmbedResolverResult => {
  return {
    provider: 'aparat',
    id: videoHash,
    src: `https://www.aparat.com/video/video/embed/videohash/${videoHash}/vt/frame`,
    url: `https://www.aparat.com/v/${videoHash}`,
    // Most iframes that state a size are 16:9, and the script carrier states no size at all.
    ratio: '16/9',
  }
}

const readVideoHash = (url: string | undefined, pathRegex: RegExp): string | undefined => {
  return parseUrlOnHosts(url, aparatHosts)?.pathname.match(pathRegex)?.[1]
}

const aparatResolveEmbed = (link: string, element: Element): EmbedResolverResult | undefined => {
  const videoHash = readVideoHash(link, framePathRegex)

  return videoHash ? { ...composeEmbed(videoHash), title: attr(element, 'title') } : undefined
}

// Aparat's player iframe.
export const aparatIframeEmbedResolver: EmbedResolver = createUrlEmbedResolver(
  aparatHosts,
  aparatResolveEmbed,
)

// Aparat's WordPress-style facade: a script inside an empty div that never runs in a reader.
// Its src is `aparat.com/embed/{hash}`, usually with no companion iframe anywhere in the item.
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
