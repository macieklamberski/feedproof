import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { audioFileRegex, videoFileRegex } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// An episode id is a letter prefix followed by exactly ten digits. The digit run is the part
// the data supports. The prefix is the publisher's own name and has no length anyone controls,
// so it is left unbounded: capping it rejected real ids, among them `NEXOJORNALLTDA…` and
// `ADSMOVILESPAASL…`, while still admitting a fabricated three-letter id, so the cap cost real
// embeds and caught nothing. A playlist is named by a slug instead, which has no grammar to
// check beyond the character set.
const safeEpisodeIdRegex = /^[A-Z]+\d{10}$/i
const safePlaylistIdRegex = /^[A-Z0-9]+$/i

const megaphoneHosts = ['megaphone.fm']

// The parameter names the kind and the kind decides the size: `?e={id}` is a single episode at
// 200, `?p={id}` a playlist at 482. Getting that wrong is the
// visible failure, a playlist squeezed into a 200px box, which is why the two are separated
// rather than defaulted to the commoner one.
//
// Measured 2026-09-07 in Chrome against `?e=AUDD4761726018` and `?p=NSM7546490835`: the episode
// player is 200 tall at 320, 640 and 1280 wide inside a 1200-tall frame, a fixed height that
// ignores its width; given a 150-tall frame it shrinks to fit, so 200 is what it renders on its
// own and not a floor. The playlist player is 469 tall at 320 and 481 at 640 and 1280, one short
// of 482 at the widths a post column gives it. Both fire only when the carrier states no size,
// since `decideSize` takes the carrier's first.
const embedKinds = {
  e: { kind: 'episode', height: 200, safeIdRegex: safeEpisodeIdRegex },
  p: { kind: 'playlist', height: 482, safeIdRegex: safePlaylistIdRegex },
}

export const extractMegaphoneEmbed = (
  link: string,
): { param: string; kind: string; id: string; height: number } | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  // Megaphone serves the episode audio from the same domain as the players, and parameters on a
  // media url are the publisher's own analytics rather than Megaphone's: NPR writes `?e=` for its
  // story and `?p=` for its programme, and both would otherwise read as ids.
  if (!parsed || audioFileRegex.test(parsed.pathname) || videoFileRegex.test(parsed.pathname)) {
    return
  }

  for (const [param, { kind, height, safeIdRegex }] of Object.entries(embedKinds)) {
    const id = parsed.searchParams.get(param)

    if (id && safeIdRegex.test(id)) {
      return { param, kind, id, height }
    }
  }
}

// No metadata and no thumbnail without an api key, so the height is the substance here, and
// some iframes carry no height at all.
export const megaphoneResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractMegaphoneEmbed(url)

  if (!embed) {
    return
  }

  return {
    provider: 'megaphone',
    id: `${embed.kind}/${embed.id}`,
    src: `https://playlist.megaphone.fm/?${embed.param}=${embed.id}`,
    height: embed.height,
  }
}

export const megaphoneEmbedResolver = createUrlEmbedResolver(megaphoneHosts, megaphoneResolveEmbed)

// No play request. The player speaks player.js and takes its `play`, flipping to its playing
// state, but loaded in Chrome by a click the audio never started from it. Nothing to send until
// it does.
