import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { isRecord, readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const podigeeHosts = ['podigee.io', 'podigee.com', 'podigee-cdn.net']

// A show is a subdomain of podigee.io and nothing else. The CDN hosts in `podigeeHosts` above
// serve the player's own assets and, more importantly, the episode audio: an enclosure at
// `audio.podigee-cdn.net/{n}-{hash}.mp3` would otherwise read as an episode and be replaced by
// a placeholder pointing at a url that does not exist, losing the audio element a reader could
// have played. The url carrier is therefore narrower than the script carrier's host list.
const showHostRegex = /^(?!www\.)[a-z0-9-]+\.podigee\.io$/i

// An episode is always numbered, which separates it from the two other paths a show serves:
// `/feed` and the show root. Every episode segment carries the number and neither of the other
// two does. A url already ending in `/embed` names the player outright and needs no such guess.
const safeEpisodeRegex = /^\d+-/

// The show is the subdomain and the episode the first path segment, which together make a
// stable id without parsing the query.
const composeEmbed = (parsed: URL, src: string): EmbedResolverResult | undefined => {
  const show = parsed.hostname.split('.')[0]
  const episode = parsed.pathname.split('/').find(Boolean)

  if (!show || !episode) {
    return
  }

  return { provider: 'podigee', id: `${show}/${episode}`, src }
}

// Podigee ships a generic loader script whose `data-configuration` is the player url itself,
// so the embed is recoverable without executing anything. Most feeds carry it in that form.
// The rest point the attribute at an inline config object (`data-configuration="podigee"` or
// `="playerConfiguration"`), where the data lives in a script body this resolver deliberately
// does not read: those keep the generic treatment.
export const podigeeEmbedResolver = createMarkupEmbedResolver(
  'script.podigee-podcast-player[data-configuration]',
  (element) => {
    const configuration = attr(element, 'data-configuration')
    const parsed = parseUrlOnHosts(configuration, podigeeHosts)

    // Only a real player url counts, which the host check is enough to decide: the inline-config
    // spellings are not urls, so they resolve against the placeholder host and fail it.
    if (!parsed) {
      return
    }

    return composeEmbed(parsed, parsed.href)
  },
)

// A carrier framing the episode page rather than the player, which is what a publisher pastes
// from the address bar. The page is the show's own episode page, so left unclaimed the reader
// frames an article rather than getting audio. Appending `/embed` names the player: checked live
// 2026-08-31, it answers 302 to `player.podigee-cdn.net/podcast-player/podigee-podcast-player.html`
// while an invented episode or an invented show answers 404, so the endpoint discriminates.
//
// The page itself only 301s to canonicalize the slug, on the same host. A show that has set a
// custom domain redirects again to it, which is that show's configuration and not the platform's
// behaviour, so it says nothing about what the page is.
export const podigeeResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, podigeeHosts)

  if (!parsed || !showHostRegex.test(parsed.hostname)) {
    return
  }

  const [episode, ...rest] = parsed.pathname.split('/').filter(Boolean)

  if (!episode) {
    return
  }

  // A carrier already framing the player is left as the publisher wrote it. Rebuilding the src
  // would drop `context=external`, which Podigee's own redirect carries. `embed` has to be the
  // last segment: with anything after it the show serves its website page, not the player.
  if (rest[0] === 'embed' && rest.length === 1) {
    return composeEmbed(parsed, parsed.href)
  }

  return safeEpisodeRegex.test(episode)
    ? composeEmbed(parsed, `https://${parsed.hostname}/${episode}/embed`)
    : undefined
}

export const podigeeIframeEmbedResolver = createUrlEmbedResolver(podigeeHosts, podigeeResolveEmbed)

// The player reports its height under a `configurePlayer` message, 0 before it has rendered
// and the real value after, which is what Podigee's own embed script sets the iframe to. The
// frame is served from the show's own subdomain, so it has no origin to name here and the
// reader matches the frame's own.
export const readPodigeeHeight = (data: unknown): number | undefined => {
  return isRecord(data) && data.listenTo === 'configurePlayer' ? readPixels(data.height) : undefined
}

export const podigeeRenderHint: EmbedRenderHint = {
  provider: 'podigee',
  readHeight: readPodigeeHeight,
}
