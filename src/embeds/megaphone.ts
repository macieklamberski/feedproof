import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { isFileName, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeEpisodeIdRegex = /^[A-Z]+\d+$/i
const safePlaylistIdRegex = /^[A-Z0-9]+$/i

const megaphoneHosts = ['megaphone.fm']

const embedKinds = {
  e: { kind: 'episode', height: 200, safeIdRegex: safeEpisodeIdRegex },
  p: { kind: 'playlist', height: 482, safeIdRegex: safePlaylistIdRegex },
}

export const extractMegaphoneEmbed = (
  link: string,
): { param: string; kind: string; id: string; height: number } | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed || isFileName(parsed.pathname)) {
    return
  }

  for (const [param, { kind, height, safeIdRegex }] of Object.entries(embedKinds)) {
    const id = parsed.searchParams.get(param)

    if (id && safeIdRegex.test(id)) {
      return { param, kind, id, height }
    }
  }
}

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

// Megaphone's player iframe, ?e= for an episode or ?p= for a playlist, some with no height at all.
export const megaphoneEmbedResolver = createUrlEmbedResolver(megaphoneHosts, megaphoneResolveEmbed)
