import { getPathSegments } from 'trousse'
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

// Each route mapped to the player route it rebuilds onto. A channel and a playlist are separate
// players, and the media route cannot stand in for either: `/embed/iframe/{id}` given an id it
// cannot serve answers 200 with a bare `{"error":true,"iframe":true}` body, so the status code
// says nothing and a channel id fails there exactly as an unknown one does.
// `channels` is the account host's spelling: `{account}.wistia.com/channels/{id}` is the channel's
// own page, login-gated even for a public channel, so rebuilding it onto the public player repairs
// a frame that would otherwise show a login screen. A channel has no vanity slug anywhere in the
// url space: the segment is the same hashed id every route shares, which is what lets one id
// grammar stand guard for all of them.
const playerRoutes = new Map(
  Object.entries({
    iframe: 'iframe',
    medias: 'iframe',
    channel: 'channel',
    channels: 'channel',
    playlists: 'playlists',
  }),
)

// The player url every caller that recovers an id has to build, on the route `playerRoutes`
// names.
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

  // The public page is `{account}.wistia.com/medias/{id}`, and only the un-prefixed route reaches
  // it: the player hosts serve every account and 404 on `/medias/{id}` (checked live 2026-09-07).
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

export const wistiaEmbedResolver = createUrlEmbedResolver(wistiaHosts, wistiaResolveEmbed)

// Starts playback on the click that loads the player: the iframe copies every query entry into
// its embed options. Never `silentAutoPlay=true`, which forces a muted start.
export const wistiaRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoPlay: 'true' },
}
