import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

const safeIdRegex = /^[A-Z0-9]+$/i

const megaphoneHosts = ['megaphone.fm']

// The parameter names the kind and the kind decides the size, measured across corpus iframes:
// `?e={id}` is a single episode at 200, `?p={id}` a playlist at 480. Getting that wrong is the
// visible failure — a playlist squeezed into a 200px box — which is why the two are separated
// rather than defaulted to the commoner one.
const embedKinds = { e: { kind: 'episode', height: 200 }, p: { kind: 'playlist', height: 480 } }

export const extractMegaphoneEmbed = (
  link: string,
): { param: string; kind: string; id: string; height: number } | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed) {
    return
  }

  for (const [param, { kind, height }] of Object.entries(embedKinds)) {
    const id = parsed.searchParams.get(param)

    if (id && safeIdRegex.test(id)) {
      return { param, kind, id, height }
    }
  }
}

// No metadata and no thumbnail without an api key, so the height is the substance here — and
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

export const megaphoneEmbedResolver = createIframeEmbedResolver(
  megaphoneHosts,
  megaphoneResolveEmbed,
)
