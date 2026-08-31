import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { audioFileRegex, videoFileRegex } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// An episode id is a letter prefix followed by exactly ten digits. The digit run is the part the
// data supports: it held across all 25,328 distinct ids sampled from the corpus. The prefix is
// the publisher's own name and has no length anyone controls, so it is left unbounded — capping
// it at eleven rejected 4.6% of real ids, among them `NEXOJORNALLTDA…` and `ADSMOVILESPAASL…`,
// while still admitting a fabricated three-letter id, so the cap cost real embeds and caught
// nothing. A playlist is named by a slug instead, which has no grammar to check beyond the
// character set.
const safeEpisodeIdRegex = /^[A-Z]+\d{10}$/i
const safePlaylistIdRegex = /^[A-Z0-9]+$/i

const megaphoneHosts = ['megaphone.fm']

// The parameter names the kind and the kind decides the size, measured across corpus iframes:
// `?e={id}` is a single episode at 200, `?p={id}` a playlist at 480. Getting that wrong is the
// visible failure, a playlist squeezed into a 200px box, which is why the two are separated
// rather than defaulted to the commoner one.
const embedKinds = {
  e: { kind: 'episode', height: 200, safeIdRegex: safeEpisodeIdRegex },
  p: { kind: 'playlist', height: 480, safeIdRegex: safePlaylistIdRegex },
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
// two of the sampled corpus iframes carry no height at all.
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
