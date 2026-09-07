import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Letters and digits, which is all the player path takes: a hyphen marks a slug and a dot a
// file, and no route here serves either as a player. The length is not checked, since a wrong id
// fails the same whether it is minted or passed through, and a bound refuses the next id space.
const safeMediaIdRegex = /^[a-zA-Z0-9]+$/

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
const playerRoutes: Record<string, string | undefined> = {
  iframe: 'iframe',
  medias: 'iframe',
  channel: 'channel',
  channels: 'channel',
  playlists: 'playlists',
}

export const extractWistiaEmbed = (link: string): { route: string; id: string } | undefined => {
  const segments = getPathSegments(link)
  const start = segments[0] === 'embed' ? 1 : 0
  const route = playerRoutes[segments[start] ?? '']
  const id = keepIfMatches(segments[start + 1]?.replace(jsonpSuffixRegex, ''), safeMediaIdRegex)

  return route && id ? { route, id } : undefined
}

// No thumbnail and no canonical url: the poster needs Wistia's media JSON hop, and the public
// page is `{account}.wistia.com/medias/{id}` while the embed url carries no account. The
// placeholder therefore names the player, which is what the reader can open.
export const wistiaResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractWistiaEmbed(url)

  if (!embed) {
    return
  }

  // A media keeps the bare id it has always carried. The other two qualify it, because the three
  // share one id grammar and enrichment receives the provider and the id alone.
  return {
    provider: 'wistia',
    id: embed.route === 'iframe' ? embed.id : `${embed.route}/${embed.id}`,
    src: `https://fast.wistia.net/embed/${embed.route}/${embed.id}`,
  }
}

export const wistiaEmbedResolver = createUrlEmbedResolver(wistiaHosts, wistiaResolveEmbed)

// Starts playback on the click that loads the player: the iframe copies every query entry into
// its embed options. Never `silentAutoPlay=true`, which forces a muted start.
export const wistiaRenderHint: EmbedRenderHint = {
  provider: 'wistia',
  autoplayParams: { autoPlay: 'true' },
}
