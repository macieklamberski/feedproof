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

// An iframe carrier titles itself with the episode's name rather than the player's: across 46
// titled frames in a 1/16 corpus sample the commonest value covered 4% of them. The anchor
// carrier below passes no element and states its name in `data-title` instead.
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
// The anchor's own href is not the click target, because it can name the show while the
// resource names an episode, and the id already mints the exact page.
//
// Only `data-title` is read for the name. The anchor's text states it too, inside a localized
// call to action, `Listen to "X" on Spreaker.` beside `Escucha"X" en Spreaker.`, and reading it
// back out means matching quote characters per language against a sample of eight anchors. A
// pair nobody sampled, the CJK brackets among them, would drop the title silently, and any two
// quote characters in the sentence would bind a wrong one, which is worse than none in a field
// a reader draws. The name is not lost either way: Spreaker's oEmbed returns it, and the
// enrichment hook can fill it now that provider and a precise id are tagged here.
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
    const title = attr(element, 'data-title')

    return {
      ...result,
      ...trimObject({ height: stated, title }, Boolean),
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
