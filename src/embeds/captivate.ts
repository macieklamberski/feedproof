import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const captivateHosts = ['captivate.fm']

// Every specimen states 200, and Captivate publishes no oEmbed, so the height is the whole
// of what this states beyond the provider tag.
const playerHeight = 200

// The kind is matched on its shape rather than against a list of the two Captivate publishes
// today, so a kind added later still reaches the player. Nothing else rests on which kind it is:
// the height is the same for both and the player host answers an identical 1,566-byte shell for
// every path it does not serve (probed 2026-09-07), so a wrong guess renders what refusing would
// have rendered.
const embedKindRegex = /^[a-z]+$/

// A player url is a kind and an id and nothing after them. The episode files sit on the same
// domain one segment deeper, `podcasts.captivate.fm/media/{uuid}/{file}.mp3`, and the url
// resolver is offered every enclosure a feed carries, so the segment count is what keeps a
// playable file from being minted into a dead `player.captivate.fm/media/…` placeholder.
export const extractCaptivateEmbed = (link: string): { kind: string; id: string } | undefined => {
  const segments = getPathSegments(link)
  const [kind, id] = segments

  if (segments.length !== 2 || !kind || !id || !embedKindRegex.test(kind) || !uuidRegex.test(id)) {
    return
  }

  return { kind, id }
}

export const captivateResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const embed = extractCaptivateEmbed(url)

  if (!embed) {
    return
  }

  return {
    provider: 'captivate',
    id: `${embed.kind}/${embed.id}`,
    src: `https://player.captivate.fm/${embed.kind}/${embed.id}`,
    height: playerHeight,
  }
}

export const captivateEmbedResolver = createUrlEmbedResolver(captivateHosts, captivateResolveEmbed)

// The player takes no query to start. Its own embed API posts this action into the frame, and
// the frame posts nothing first, so the request goes on load.
export const captivateRenderHint: EmbedRenderHint = {
  provider: 'captivate',
  requestPlay: { action: 'CP.API.PLAY' },
}
