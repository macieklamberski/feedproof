import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize } from '../utils/dom.js'
import { isPlayerJsReady, playerJsPlayRequest } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'spreaker'

const safeIdRegex = /^\d+$/

const spreakerHosts = ['spreaker.com']

// An episode player, or a show player that plays the latest episode.
const embedKinds = { episode_id: 'episode', show_id: 'show' } as const

// The height Spreaker documents in its own embed snippet, `height="200px"`.
const playerHeight = 200

export const extractSpreakerEmbed = (
  link: string,
): { kind: string; param: string; id: string } | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  // The route is `player` on the widget host and `embed/player/{variant}` on the site host,
  // read as a whole segment so a longer name starting with it is not the player route.
  if (!parsed || !getPathSegments(parsed).includes('player')) {
    return
  }

  for (const [param, kind] of Object.entries(embedKinds)) {
    const id = parsed.searchParams.get(param)

    if (id && safeIdRegex.test(id)) {
      return { kind, param, id }
    }
  }
}

// Spreaker's player iframe ships no height attribute, so a reader reserves nothing for it.
// Spreaker's oEmbed returns the title, the author and a thumbnail for the id tagged here.
export const spreakerResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const embed = extractSpreakerEmbed(url)

  if (!embed) {
    return
  }

  const title = attr(element, 'title')

  // Both kinds name a page that takes the bare id and redirects to its canonical slugged form,
  // `/episode/{id}` and `/show/{id}`, so the click target is the resource the player plays.
  return {
    provider,
    id: `${embed.kind}/${embed.id}`,
    src: `https://widget.spreaker.com/player?${embed.param}=${embed.id}`,
    url: `https://www.spreaker.com/${embed.kind}/${embed.id}`,
    height: playerHeight,
    ...trimObject({ title }, Boolean),
  }
}

export const spreakerIframeEmbedResolver = createUrlEmbedResolver(
  spreakerHosts,
  spreakerResolveEmbed,
)

// Spreaker's anchor snippet, which only a widgets.js loader swaps for the player at runtime.
// Feeds carrying the loader mostly hold no player iframe anywhere, so a reader sees the anchor's
// fallback text, "Listen to ... on Spreaker", and no player at all.
export const spreakerAnchorEmbedResolver = createMarkupEmbedResolver(
  // Without data-resource the anchor is an ordinary link: the class is styling anyone can copy.
  // The feeds that carry the class without the attribute do not ship the loader script either.
  'a.spreaker-player[data-resource]',
  (element) => {
    // The resource is spelled as a query fragment, `data-resource="episode_id=42"`. The anchor's
    // own href can name the show while the resource names an episode.
    const resource = attr(element, 'data-resource')
    const result = resource
      ? spreakerResolveEmbed(`https://widget.spreaker.com/player?${resource}`)
      : undefined

    if (!result) {
      return
    }

    // The anchor states its own size, e.g. `data-height="200px"`.
    const stated = parsePixelSize(attr(element, 'data-height'))
    // The anchor text is a localized call to action around the title, not the title itself, and
    // the quote characters wrapping the title differ per language.
    const title = attr(element, 'data-title')

    return {
      ...result,
      ...trimObject({ height: stated, title }, Boolean),
    }
  },
)

// The documented autoplay=true does nothing: the player bundle holds no code for it.
export const spreakerRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
