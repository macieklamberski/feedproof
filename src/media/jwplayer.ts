import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'

// JW Player's script embed carries the media id in its src (`/players/{media}-{player}.js`)
// beside an empty `botr_` div, so a reader shows nothing. The media id alone resolves to a
// progressive file with no key (verified 2026-08-01 on corpus ids: 5 of 7 gave 206
// video/mp4; the misses were a suspended account and a restricted asset, which today render
// nothing anyway). The iframe form of the same embed (`/players/{media}-{player}.html`) is a
// working player page and stays with the embed resolver.
const jwplayerHostRegex = /(^|\.)jwplayer\.com$/
const playerScriptRegex = /^\/players\/([A-Za-z0-9]{8})-[A-Za-z0-9]+\.js$/

const composeSourceUrl = (mediaId: string): string => {
  return `https://cdn.jwplayer.com/videos/${mediaId}.mp4`
}

export const jwplayerMediaResolver: MediaResolver = {
  selector: 'script[src*="jwplayer.com/players/"]',
  extract: (element): MediaResolverResult | undefined => {
    const source = attr(element, 'src')

    if (!source) {
      return
    }

    const url = URL.parse(source, 'https://example.com')

    if (!url || !jwplayerHostRegex.test(url.hostname)) {
      return
    }

    const mediaId = url.pathname.match(playerScriptRegex)?.[1]

    if (!mediaId) {
      return
    }

    return { tag: 'video', src: composeSourceUrl(mediaId) }
  },
}
