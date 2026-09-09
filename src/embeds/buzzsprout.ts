import type { EmbedRenderHint, EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { isPlayerJsReady, playerJsPlayRequest } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'buzzsprout'

const buzzsproutHosts = ['buzzsprout.com']
// /{podcast}/{episode}-{slug}.js, with or without episodes/.
const episodeScriptPathRegex = /^\/(\d+)\/(?:episodes\/)?(\d+)(?:-[^/]*)?\.js$/
const showScriptPathRegex = /^\/(\d+)\.js$/
// /{podcast}/{episode}-{slug} with or without episodes/, the slug dot-free to keep .mp3 out.
const episodePagePathRegex = /^\/(\d+)\/(?:episodes\/)?(\d+)(?:-[^/.]*)?$/

const episodeHeight = 200
const showHeight = 375

const composeEmbed = (podcastId: string, episodeId?: string): EmbedResolverResult => {
  const path = episodeId ? `${podcastId}/${episodeId}` : podcastId

  return {
    provider,
    id: path,
    src: `https://www.buzzsprout.com/${path}?iframe=true`,
    url: `https://www.buzzsprout.com/${path}`,
    height: episodeId ? episodeHeight : showHeight,
  }
}

// Buzzsprout's player iframe, whose title names the episode.
export const buzzsproutResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, buzzsproutHosts)

  if (!parsed) {
    return
  }

  const match = parsed.pathname.match(episodePagePathRegex)

  if (!match) {
    return
  }

  const title = attr(element, 'title')
  const result = composeEmbed(match[1], match[2])

  return title ? { ...result, title } : result
}

export const buzzsproutIframeEmbedResolver: EmbedResolver = createUrlEmbedResolver(
  buzzsproutHosts,
  buzzsproutResolveEmbed,
)

// Buzzsprout's WordPress shortcode: an empty div and a script naming the ids, which no reader runs.
export const buzzsproutScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="buzzsprout.com"]',
  (element) => {
    const url = parseUrlOnHosts(attr(element, 'src'), buzzsproutHosts)

    if (!url) {
      return
    }

    const episode = url.pathname.match(episodeScriptPathRegex)

    if (episode?.[1] && episode[2]) {
      return composeEmbed(episode[1], episode[2])
    }

    const show = url.pathname.match(showScriptPathRegex)

    if (show?.[1]) {
      return composeEmbed(show[1])
    }
  },
)

export const buzzsproutRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
