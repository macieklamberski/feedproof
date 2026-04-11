import { createEmbedPlaceholder } from '../common.js'
import type { DomTransform, Enclosure } from '../types.js'

const isAudioEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'audio' || !!enclosure.type?.startsWith('audio/')
}

const isVideoEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'video' || !!enclosure.type?.startsWith('video/')
}

export const injectEnclosureEmbedPlaceholders: DomTransform = ({ enclosures, resolveEmbed }) => {
  return (document) => {
    if (!enclosures?.length) {
      return
    }

    const html = document.toString()

    for (const enclosure of enclosures) {
      if (html.includes(enclosure.url)) {
        continue
      }

      const resolved = resolveEmbed?.(enclosure.url)

      // Skip enclosures that no resolver recognizes and aren't audio/video by type/medium.
      if (!resolved && !isAudioEnclosure(enclosure) && !isVideoEnclosure(enclosure)) {
        continue
      }

      const type = resolved?.type ?? (isAudioEnclosure(enclosure) ? 'audio' : 'video')
      const placeholder = createEmbedPlaceholder(document, enclosure.url, type, resolved)

      document.body.prepend(placeholder)
    }
  }
}
