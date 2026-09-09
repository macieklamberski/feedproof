import { isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { isPlayerJsReady, playerJsPlayRequest, readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'podigee'

const podigeeHosts = ['podigee.io', 'podigee.com', 'podigee-cdn.net']

// A show is a subdomain of podigee.io, and podigee-cdn.net serves the player's assets and the
// episode audio.
const showHostRegex = /^(?!www\.)[a-z0-9-]+\.podigee\.io$/i

// An episode is always numbered, which separates it from the two other paths a show serves:
// `/feed` and the show root. Every episode segment carries the number and neither of the other
// two does. A url already ending in `/embed` names the player outright and needs no such guess.
const safeEpisodeRegex = /^\d+-/

// Fluid in width and fixed in height: 145 at 400 and 900 pixels wide (2026-09-05), matching
// the 144.8 the player reports once rendered.
const playerHeight = 145

// The show is the subdomain and the episode the first path segment, which together make a
// stable id without parsing the query.
const composeEmbed = (parsed: URL, src: string): EmbedResolverResult | undefined => {
  const show = parsed.hostname.split('.')[0]
  const episode = parsed.pathname.split('/').find(Boolean)

  if (!show || !episode) {
    return
  }

  return { provider, id: `${show}/${episode}`, src, height: playerHeight }
}

// Podigee's loader script names the player url in data-configuration, and a reader never runs it.
// The rest name a global on the embedding page, `data-configuration="podigee"`, so nothing in
// the markup holds the data and those keep the generic treatment.
export const podigeeScriptEmbedResolver = createMarkupEmbedResolver(
  'script.podigee-podcast-player[data-configuration]',
  (element) => {
    const configuration = attr(element, 'data-configuration')
    const parsed = parseUrlOnHosts(configuration, podigeeHosts)

    // Only a real player url counts, which the host check is enough to decide: the inline-config
    // spellings are not urls, so they resolve against the placeholder host and fail it.
    // The inline spellings are data-configuration="podigee" or "playerConfiguration".
    if (!parsed) {
      return
    }

    return composeEmbed(parsed, parsed.href)
  },
)

export const podigeeResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, podigeeHosts)

  // An enclosure on the CDN, {n}-{hash}.mp3, reads as an episode and would lose its audio.
  if (!parsed || !showHostRegex.test(parsed.hostname)) {
    return
  }

  const [episode, ...rest] = parsed.pathname.split('/').filter(Boolean)

  if (!episode) {
    return
  }

  // Rebuilding the src would drop the context=external Podigee's own redirect carries, and embed
  // has to be the last segment: with anything after it the show serves its website page.
  if (rest[0] === 'embed' && rest.length === 1) {
    return composeEmbed(parsed, parsed.href)
  }

  // {episode}/embed answers 302 to player.podigee-cdn.net/podcast-player/podigee-podcast-player
  // .html for a real episode and 404 for an invented one.
  return safeEpisodeRegex.test(episode)
    ? composeEmbed(parsed, `https://${parsed.hostname}/${episode}/embed`)
    : undefined
}

// An iframe framing a Podigee episode page rather than the player, so the reader gets an article.
export const podigeeIframeEmbedResolver = createUrlEmbedResolver(podigeeHosts, podigeeResolveEmbed)

// The player reports its height under a configurePlayer message, 0 before it has rendered and the
// real value after, from the show's own subdomain.
export const readPodigeeHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.listenTo === 'configurePlayer'
    ? readPixels(data.height)
    : undefined
}

// The player takes no query to start and speaks player.js, and Podigee's help says playback waits
// for a click.
export const podigeeRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
  readHeight: readPodigeeHeight,
}
