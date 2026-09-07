import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const aushaHost = 'ausha.co'

// Letters and digits in both cases, with no separator, since the id goes into the `kind/id` key.
// Not the twelve characters every id has today: a wrong id fails the same whether it is minted
// or passed through, and a bound would refuse the next id space.
const safeIdRegex = /^[A-Za-z0-9]+$/

// The v3 player is a fixed height on a fluid width: measured in Chrome at 1200 and 400 pixels
// wide it is 220 both times, and 501 both times with `display=vertical`. The corpus agrees on the
// first, with 174 of its 263 player frames stating 220 and none of them stating a width, and
// disagrees on the second, where 15 frames say 420. A frame that declares a height keeps it, so
// the numbers here are for the 74 player frames that declare none.
const playerHeight = 220
const verticalHeight = 501

// The v2 widget on the other host has no one height. Its 33 frames state 400 (11), 495 (8),
// 200 (8), 250, 470 and 201, because `playlist` and `mode=latest` change what it holds. Every one
// of them declares a height, so there is nothing here the carrier does not already say.
const widgetHosts = ['widget.ausha.co']
const playerHosts = ['player.ausha.co']

// The player reports its rendered height only to a frame whose url names a `playerId`, which it
// echoes back so a page holding several players can tell their messages apart. Without it the
// frame sends nothing but its companion-script check (probed 2026-09-07). Minting one changes a
// url the publisher wrote, and it is the narrowest change that reaches the report: any value works.
const playerName = 'feedsweep'

export const aushaResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, aushaHost)

  if (!parsed) {
    return
  }

  const isPlayer = playerHosts.includes(parsed.hostname)
  const isWidget = widgetHosts.includes(parsed.hostname)
  const segments = getPathSegments(parsed)

  // Both hosts serve their player from the root, spelled either bare or as `index.html`.
  if ((!isPlayer && !isWidget) || (segments.length > 0 && segments[0] !== 'index.html')) {
    return
  }

  // An episode and its show are often named together, and the episode is the finer of the two.
  const podcast = parsed.searchParams.get('podcastId') ?? ''
  const show = parsed.searchParams.get('showId') ?? ''
  const named = [
    ['podcast', podcast],
    ['show', show],
  ].find(([, value]) => safeIdRegex.test(value as string))

  if (!named) {
    return
  }

  const [kind, id] = named

  const vertical = parsed.searchParams.get('display') === 'vertical'
  let src = url

  if (isPlayer && !parsed.searchParams.has('playerId')) {
    parsed.searchParams.set('playerId', playerName)
    src = parsed.href
  }

  return {
    provider: 'ausha',
    // `api.ausha.co/v1/podcasts/{id}` is key-free and answers with the episode's title, show,
    // publication date, description and audio url, and 404s on a fabricated id. There is no
    // matching route for a show, so the kind says which of the two an enricher is holding.
    id: `${kind}/${id}`,
    src,
    ...(isPlayer && { height: vertical ? verticalHeight : playerHeight }),
  }
}

export const aushaEmbedResolver = createUrlEmbedResolver([aushaHost], aushaResolveEmbed)

// The heights above stay as the fallback. The first `resize-player-iframe` of a run carries 0,
// which `readPixels` refuses, so a reader draws the stated box until a later message arrives, and
// `display=vertical` sent no resize at all in twenty seconds (2026-09-07).
export const readAushaHeight = (data: unknown): number | undefined => {
  if (!isPlainObject(data) || data.source !== 'ausha-player' || !isPlainObject(data.payload)) {
    return
  }

  return readPixels(data.payload.playerHeight)
}

export const aushaRenderHint: EmbedRenderHint = {
  provider: 'ausha',
  readHeight: readAushaHeight,
}
