import { isAnyOf } from 'trousse'
import type { MediaResolver, MediaResolverResult } from '../types.js'

// Podlove Publisher ships the episode as a `<div class="podlove-web-player">` holding nothing
// but custom elements (`<tab-chapters>`, `<icon>`, `<subscribe-button>`), with a sibling
// `<script>` that builds the player on load. None of it renders in a reader, so the episode is
// lost outright. The script body carries the whole config inline rather than a url to fetch,
// which is what makes this recoverable without a network hop:
//
//   podlovePlayerCache.add([{"url":"…","data":{"audio":[{"url":"…mp3","mimeType":"audio/mpeg"}],
//                                              "poster":"…","title":"…","chapters":[…]}}])
//
// The other spelling, `podlovePlayer('#el', 'https://…/wp-json/…')`, names a config endpoint
// with no inlined data. That one needs a fetch and is deliberately left to the generic pass.
const configRegex = /podlovePlayerCache\.add\(\s*(\[[\s\S]*?\])\s*\)/

// Podlove offers the same episode in several formats and the order is the publisher's, not a
// ranking. Safari plays neither ogg nor opus, so a config that lists those first would hand
// some readers a file they cannot play while an mp3 sat second in the same array.
const preferredMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4']

type PodloveConfig = Array<{
  data?: {
    audio?: Array<{ url?: string; mimeType?: string }>
    poster?: string
    show?: { poster?: string }
  }
}>

// The script sits beside the player. Where an item holds several episodes each player has its
// own script, so the id is what ties the two together when they are not adjacent.
const findConfigScript = (element: Element): Element | undefined => {
  const sibling = element.nextElementSibling

  if (sibling?.localName === 'script') {
    return sibling
  }

  if (!element.id) {
    return
  }

  for (const script of element.parentElement?.querySelectorAll('script') ?? []) {
    if (script.textContent?.includes(element.id)) {
      return script
    }
  }
}

const parseConfig = (script: Element): PodloveConfig | undefined => {
  const raw = script.textContent?.match(configRegex)?.[1]

  if (!raw) {
    return
  }

  try {
    return JSON.parse(raw)
  } catch {}
}

export const podloveMediaResolver: MediaResolver = {
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
    const file = files?.find((audio) => isAnyOf(audio.mimeType, preferredMimeTypes)) ?? files?.[0]
    const source = file?.url

    // The config is interpolated straight into the element, so anything that is not an
    // absolute url is dropped rather than emitted.
    if (!source?.startsWith('http')) {
      return
    }

    const poster = data.poster ?? data.show?.poster

    return {
      tag: 'audio',
      src: source,
      ...(poster?.startsWith('http') ? { poster } : {}),
    }
  },
}
