import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Every id sampled from the corpus is exactly 10 alphanumeric characters. Anything else is
// left to the generic placeholder rather than interpolated into a player url.
const safeMediaIdRegex = /^[a-zA-Z0-9]{10}$/

// The script form names the media as a JSONP callback rather than a page.
const jsonpSuffixRegex = /\.jsonp$/

const wistiaHosts = ['wistia.net', 'wistia.com']

// Three shapes, one id: `/embed/iframe/{id}` is the player, `/embed/medias/{id}.jsonp` the
// script form's payload, and `/medias/{id}` the account page. rebuildWistiaEmbeds normalizes the
// JS facade into the first of those, so a facade resolves here too instead of ending as a
// provider-less placeholder.
export const extractWistiaId = (link: string): string | undefined => {
  const segments = getPathSegments(link)
  const start = segments[0] === 'embed' ? 1 : 0
  const id =
    segments[start] === 'iframe' || segments[start] === 'medias' ? segments[start + 1] : undefined
  const cleaned = id?.replace(jsonpSuffixRegex, '')

  return keepIfMatches(cleaned, safeMediaIdRegex)
}

// No thumbnail and no canonical url: the poster needs Wistia's media JSON hop, and the public
// page is `{account}.wistia.com/medias/{id}` while the embed url carries no account. The
// placeholder therefore names the player, which is what the reader can open.
export const wistiaResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const mediaId = extractWistiaId(url)

  if (!mediaId) {
    return
  }

  return {
    provider: 'wistia',
    id: mediaId,
    src: `https://fast.wistia.net/embed/iframe/${mediaId}`,
  }
}

export const wistiaEmbedResolver = createUrlEmbedResolver(wistiaHosts, wistiaResolveEmbed)
