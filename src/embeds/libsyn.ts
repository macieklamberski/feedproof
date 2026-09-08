import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parsePixelSize } from '../utils/dom.js'
import { isMediaFile } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^\d+$/

const libsynHosts = ['libsyn.com']

// Libsyn spells its player options as path segments, not a query string:
// `/embed/episode/id/{id}/height/{px}/theme/{name}/thumbnail/{yes|no}/…`.
//
// `show` reads like a kind and is not one: given a real show id it renders the same "Episode
// Does Not Exist" error a nonsense kind does. `destination` is what plays a show's latest
// episode, and it cannot repair a show carrier: the two are different id spaces naming different
// podcasts. Show 45546 is The Feed while destination 45546 belongs to show 26465, and show 20000
// is StarQuest while destination 20000 belongs to show 20290 (api, 2026-08-31). Rewriting the
// kind would mint another show's player, so a show carrier falls through instead.
const embedKinds = ['episode', 'destination']

const readPathOption = (segments: Array<string>, name: string): string | undefined => {
  const index = segments.indexOf(name)

  return index >= 0 ? segments[index + 1] : undefined
}

export const extractLibsynEmbed = (
  link: string,
): { kind: string; id: string; height?: number } | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  // Libsyn serves the episode audio from the same domain as the players, so a media path that also
  // spells the player's segments reads as an episode and the enclosure loses its audio element to
  // a placeholder.
  if (!parsed || isMediaFile(parsed.pathname)) {
    return
  }

  const segments = getPathSegments(parsed)

  if (segments[0] !== 'embed' || !embedKinds.includes(segments[1] ?? '')) {
    return
  }

  const id = readPathOption(segments, 'id')

  if (!id || !safeIdRegex.test(id)) {
    return
  }

  const height = readPathOption(segments, 'height')

  return {
    kind: segments[1] as string,
    id,
    height: parsePixelSize(height),
  }
}

// Two things make this worth a resolver. The player url carries its own height, so the
// placeholder can reserve the right space from the markup alone. And the old player host is
// failing: `html5-player.libsyn.com` answers 500 for older episodes (ids 2233504 and 5508311,
// checked 2026-08-11) while `play.libsyn.com` serves all of them, so minting the modern host
// repairs an embed that no longer loads.
//
// No thumbnail and no canonical url. There is an `oembed.libsyn.com` endpoint, but it does not
// answer for what the markup gives us: `?item_id={id}` returns `No valid media found` and
// `?url={player url}` returns an HTML page, not JSON (both checked 2026-08-11). The
// episode title lives on the player page and artwork needs an authenticated api call.
export const libsynResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractLibsynEmbed(url)

  if (!embed) {
    return
  }

  const height = embed.height ? `height/${embed.height}/` : ''

  return {
    provider: 'libsyn',
    id: `${embed.kind}/${embed.id}`,
    src: `https://play.libsyn.com/embed/${embed.kind}/id/${embed.id}/${height}`,
    height: embed.height,
  }
}

export const libsynEmbedResolver = createUrlEmbedResolver(libsynHosts, libsynResolveEmbed)
