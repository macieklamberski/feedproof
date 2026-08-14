import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize } from '../utils/dom.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

const spreakerHosts = ['spreaker.com']

// An episode player, or a show player that plays the latest episode.
const embedKinds = { episode_id: 'episode', show_id: 'show' } as const

// The height Spreaker documents in its own embed snippet (`height="200px"`), and the reason
// this resolver earns its place: the corpus iframes carry **no height attribute at all**, so
// without it a reader reserves nothing. Spreaker's oEmbed also returns title, author and a
// thumbnail, which the enrichment hook can fill once provider and id are tagged here.
const playerHeight = 200

export const extractSpreakerEmbed = (
  link: string,
): { kind: string; param: string; id: string } | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed || !parsed.pathname.includes('/player')) {
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
    provider: 'spreaker',
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
// that swaps the anchor for the player at runtime. 73 corpus feeds carry that loader and 63 of
// them have no player iframe anywhere, so what a reader sees is the anchor's fallback text
// ("Listen to ... on Spreaker") and no player at all.
//
// The resource is spelled as a query fragment rather than a url, `data-resource="episode_id=42"`,
// so it is read by pasting it onto the player url the iframe form already uses. Where the anchor
// states its own `data-height` that wins over the constant, since the publisher sized this one.
// `data-resource` is required, not merely read. The class alone is styling anyone can copy, and
// the anchor already renders as a working link, so resolving one without the attribute would
// turn an ordinary link into a player on thin evidence. It would also buy nothing: 4 corpus
// feeds carry the class without the attribute, and none of the 4 ships the loader script that
// would have made a player of it.
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

    return stated ? { ...result, height: stated } : result
  },
)
