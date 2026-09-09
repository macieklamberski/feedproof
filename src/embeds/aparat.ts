import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const aparatHosts = ['aparat.com']
const scriptPathRegex = /^\/embed\/([a-zA-Z0-9]+)$/
const framePathRegex = /^\/video\/video\/embed\/videohash\/([a-zA-Z0-9]+)(?:\/vt\/frame)?\/?$/

const composeEmbed = (videoHash: string): EmbedResolverResult => {
  return {
    provider: 'aparat',
    id: videoHash,
    src: `https://www.aparat.com/video/video/embed/videohash/${videoHash}/vt/frame`,
    url: `https://www.aparat.com/v/${videoHash}`,
    ratio: '16/9',
  }
}

const readVideoHash = (url: string | undefined, pathRegex: RegExp): string | undefined => {
  return parseUrlOnHosts(url, aparatHosts)?.pathname.match(pathRegex)?.[1]
}

const aparatResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const videoHash = readVideoHash(link, framePathRegex)

  return videoHash ? composeEmbed(videoHash) : undefined
}

// Aparat's player iframe.
export const aparatIframeEmbedResolver: EmbedResolver = createUrlEmbedResolver(
  aparatHosts,
  aparatResolveEmbed,
)

// Aparat's WordPress-style facade: a script inside an empty div that never runs in a reader.
export const aparatScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="aparat.com/embed/"]',
  (element) => {
    const videoHash = readVideoHash(attr(element, 'src'), scriptPathRegex)

    return videoHash ? composeEmbed(videoHash) : undefined
  },
)
