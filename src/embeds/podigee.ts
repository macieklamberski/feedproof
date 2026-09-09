import { isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { isPlayerJsReady, playerJsPlayRequest, readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'podigee'

const podigeeHosts = ['podigee.io', 'podigee.com', 'podigee-cdn.net']

const showHostRegex = /^(?!www\.)[a-z0-9-]+\.podigee\.io$/i

const safeEpisodeRegex = /^\d+-/

const playerHeight = 145

const composeEmbed = (parsed: URL, src: string): EmbedResolverResult | undefined => {
  const show = parsed.hostname.split('.')[0]
  const episode = parsed.pathname.split('/').find(Boolean)

  if (!show || !episode) {
    return
  }

  return { provider, id: `${show}/${episode}`, src, height: playerHeight }
}

// Podigee's loader script names the player url in data-configuration, and a reader never runs it.
export const podigeeScriptEmbedResolver = createMarkupEmbedResolver(
  'script.podigee-podcast-player[data-configuration]',
  (element) => {
    const configuration = attr(element, 'data-configuration')
    const parsed = parseUrlOnHosts(configuration, podigeeHosts)

    if (!parsed) {
      return
    }

    return composeEmbed(parsed, parsed.href)
  },
)

export const podigeeResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, podigeeHosts)

  if (!parsed || !showHostRegex.test(parsed.hostname)) {
    return
  }

  const [episode, ...rest] = parsed.pathname.split('/').filter(Boolean)

  if (!episode) {
    return
  }

  if (rest[0] === 'embed' && rest.length === 1) {
    return composeEmbed(parsed, parsed.href)
  }

  return safeEpisodeRegex.test(episode)
    ? composeEmbed(parsed, `https://${parsed.hostname}/${episode}/embed`)
    : undefined
}

// An iframe framing a Podigee episode page rather than the player, so the reader gets an article.
export const podigeeIframeEmbedResolver = createUrlEmbedResolver(podigeeHosts, podigeeResolveEmbed)

export const readPodigeeHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.listenTo === 'configurePlayer'
    ? readPixels(data.height)
    : undefined
}

export const podigeeRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
  readHeight: readPodigeeHeight,
}
