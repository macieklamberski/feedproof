import { isAnyOf } from 'trousse'
import type { MediaResolver, MediaResolverResult } from '../types.js'
import { findConfigScript } from '../utils/dom.js'

// Podlove Publisher ships the episode as a `<div class="podlove-web-player">` holding nothing
// but custom elements (`<tab-chapters>`, `<icon>`, `<subscribe-button>`), with a sibling
// `<script>` that builds the player on load. None of it renders in a reader, so the episode is
// lost outright. The script body carries the whole config inline, not a url to fetch,
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

    if (!source) {
      return
    }

    // Both urls travel as the config wrote them. convertWidgets resolves whatever a resolver
    // returns, which is what gives a protocol-relative or feed-relative config the same
    // treatment as one written in markup, and it drops the media when the src resolves to
    // nothing at all.
    return {
      tag: 'audio',
      src: source,
      poster: data.poster ?? data.show?.poster,
    }
  },
}
