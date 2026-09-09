import { getPathSegments, toMap } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'wistia'

// Letters and digits, which is all the player path takes: a hyphen marks a slug and a dot a
// file, and no route here serves either as a player. The length is not checked, since a wrong id
// fails the same whether it is minted or passed through, and a bound refuses the next id space.
export const safeMediaIdRegex = /^[a-zA-Z0-9]+$/

// The script form names the media through a JSONP callback, with no page in the url.
const jsonpSuffixRegex = /\.jsonp$/

const wistiaHosts = ['wistia.net', 'wistia.com']

// Both spellings ship: channel on the player host and channels on the account host.
// A channel has no vanity slug anywhere in the url space: the segment is the same hashed id every
// route shares.
const playerRoutes = toMap({
  iframe: 'iframe',
  medias: 'iframe',
  channel: 'channel',
  channels: 'channel',
  playlists: 'playlists',
})

// The iframe route answers 200 with an error body for a channel id, so the route has to match.
// The body is a bare `{"error":true,"iframe":true}`, so the status code says nothing.
export const composeEmbedUrl = (route: string, mediaId: string): string => {
  return `https://fast.wistia.net/embed/${route}/${mediaId}`
}

export const extractWistiaEmbed = (
  link: string,
): { route: string; id: string; page?: string } | undefined => {
  const segments = getPathSegments(link)
  const start = segments[0] === 'embed' ? 1 : 0
  const named = segments[start] ?? ''
  const route = playerRoutes.get(named)
  const id = keepIfMatches(segments[start + 1]?.replace(jsonpSuffixRegex, ''), safeMediaIdRegex)

  if (!route || !id) {
    return
  }

  // Only the account host serves /medias/{id}: the player hosts 404 on it.
  const host = segments[0] === 'medias' ? parseUrlOnHosts(link, wistiaHosts)?.hostname : undefined

  return { route, id, page: host ? `https://${host}/medias/${id}` : undefined }
}

// The media a `src` names, for the carriers the factory never sees: a `<script>` and an `<iframe>`
// are matched on a substring of their path, so the host is the only thing telling Wistia's own
// `/embed/medias/{id}` from a foreign path that spells it.
export const readSrcMediaId = (src: string | undefined): string | undefined => {
  const url = parseUrlOnHosts(src, wistiaHosts)

  return url ? extractWistiaEmbed(url.href)?.id : undefined
}

// No thumbnail: the poster needs Wistia's media JSON hop.
export const wistiaResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const embed = extractWistiaEmbed(url)

  if (!embed) {
    return
  }

  // A media keeps the bare id it has always carried. The other two qualify it, because the three
  // share one id grammar and enrichment receives the provider and the id alone.
  return {
    provider,
    id: embed.route === 'iframe' ? embed.id : `${embed.route}/${embed.id}`,
    src: composeEmbedUrl(embed.route, embed.id),
    url: embed.page,
    // Wistia's own snippet writes the media's name here with the word `Video` appended.
    title: element ? attr(element, 'title') : undefined,
  }
}

// A Wistia media, channel or playlist player iframe, or a frame of the login-gated channel page.
export const wistiaEmbedResolver = createUrlEmbedResolver(wistiaHosts, wistiaResolveEmbed)

// Starts playback on the click that loads the player: the iframe copies every query entry into
// its embed options. Never `silentAutoPlay=true`, which forces a muted start.
export const wistiaRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoPlay: 'true' },
}
