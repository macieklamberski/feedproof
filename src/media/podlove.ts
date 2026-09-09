import { isAnyOf } from 'trousse'
import type { MediaResolver, MediaResolverResult } from '../types.js'
import { findConfigScript } from '../utils/dom.js'

// The script inlines the config as podlovePlayerCache.add([{data: {audio: [{url, mimeType}]}}]).
// The other spelling, podlovePlayer('#el', 'https://…/wp-json/…'), inlines no config.
const configRegex = /podlovePlayerCache\.add\(\s*(\[[\s\S]*?\])\s*\)/

// Podlove offers the same episode in several formats and the order is the publisher's, not a
// ranking. Safari plays neither ogg nor opus, so a config that lists those first would hand
// some readers a file they cannot play while an mp3 sat second in the same array.
const preferredMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4']

// The config also carries episode and show posters, which an <audio> has no attribute for.
type PodloveConfig = Array<{
  data?: {
    audio?: Array<{ url?: string; mimeType?: string }>
    title?: string
  }
}>

const parseConfig = (script: Element): PodloveConfig | undefined => {
  const raw = script.textContent?.match(configRegex)?.[1]

  if (!raw) {
    return
  }

  try {
    return JSON.parse(raw)
  } catch {}
}

// Podlove Publisher ships an episode as custom elements a sibling script builds into a player.
export const podloveMediaResolver: MediaResolver = {
  kind: 'media',
  selector: 'div.podlove-web-player',
  extract: (element): MediaResolverResult | undefined => {
    const script = findConfigScript(element)
    const config = script ? parseConfig(script) : undefined
    const data = config?.[0]?.data

    if (!data) {
      return
    }

    const files = data.audio?.filter(
      (audio): audio is { url: string; mimeType: string } =>
        audio.url !== undefined && audio.mimeType?.startsWith('audio/') === true,
    )
    // The config's order is the publisher's, not a ranking, and Safari plays neither ogg nor opus.
    const file = files?.find((audio) => isAnyOf(audio.mimeType, preferredMimeTypes)) ?? files?.[0]
    const source = file?.url

    if (!source) {
      return
    }

    return {
      tag: 'audio',
      src: source,
      title: data.title,
    }
  },
}
