import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize, text } from '../utils/dom.js'
import { isPlayerJsReady, playerJsPlayRequest } from '../utils/hints.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'spreaker'

const safeIdRegex = /^\d+$/

const spreakerHosts = ['spreaker.com']

// An episode player, or a show player that plays the latest episode.
const embedKinds = { episode_id: 'episode', show_id: 'show' } as const

// The height Spreaker documents in its own embed snippet (`height="200px"`), and the reason
// this resolver earns its place: real iframes carry no height attribute at all, so without it
// a reader reserves nothing. Spreaker's oEmbed also returns title, author and a
// thumbnail, which the enrichment hook can fill once provider and id are tagged here.
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

export const spreakerResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractSpreakerEmbed(url)

  if (!embed) {
    return
  }

  return {
    provider,
    id: `${embed.kind}/${embed.id}`,
    src: `https://widget.spreaker.com/player?${embed.param}=${embed.id}`,
    height: playerHeight,
  }
}

export const spreakerIframeEmbedResolver = createUrlEmbedResolver(
  spreakerHosts,
  spreakerResolveEmbed,
)

// Spreaker's other embed code is an `<a class="spreaker-player">` beside a `widgets.js` loader
// that swaps the anchor for the player at runtime. Feeds that carry the loader mostly hold no
// player iframe anywhere, so what a reader sees is the anchor's fallback text ("Listen to ...
// on Spreaker") and no player at all.
//
// The resource is spelled as a query fragment, not a url, `data-resource="episode_id=42"`,
// so it is read by pasting it onto the player url the iframe form already uses. Where the anchor
// states its own `data-height` that wins over the constant, since the publisher sized this one.
// `data-resource` is required, not merely read. The class alone is styling anyone can copy, and
// the anchor already renders as a working link, so resolving one without the attribute would
// turn an ordinary link into a player on thin evidence. It would also buy nothing: the feeds
// that carry the class without the attribute do not ship the loader script that would have
// made a player of it.
//
// Spreaker's documented snippet leaves the href on `www.spreaker.com` itself, so it is not
// always the episode page. The text around the episode name is localized and inconsistently
// quoted, `Listen to "X" on Spreaker.` beside `Escucha»X" en Spreaker.`, so it is carried whole
// rather than stripped off the name.
export const spreakerAnchorEmbedResolver = createMarkupEmbedResolver(
  'a.spreaker-player[data-resource]',
  (element) => {
    const resource = attr(element, 'data-resource')
    const result = resource
      ? spreakerResolveEmbed(`https://widget.spreaker.com/player?${resource}`)
      : undefined

    if (!result) {
      return
    }

    // The anchor states its own size, e.g. `data-height="200px"`.
    const stated = parsePixelSize(attr(element, 'data-height'))
    const href = attr(element, 'href')
    const url = parseUrlOnHosts(href, spreakerHosts) ? href : undefined
    const title = text(element)

    return {
      ...result,
      ...(stated && { height: stated }),
      ...(url && { url }),
      ...(title && { title }),
    }
  },
)

// The widget guide documents `autoplay=true`, but the player bundle holds no code for it and the
// server-rendered config is identical with and without it. The widget speaks player.js instead.
export const spreakerRenderHint: EmbedRenderHint = {
  provider,
  isReady: isPlayerJsReady,
  requestPlay: playerJsPlayRequest,
}
