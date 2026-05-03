import { createEmbedPlaceholder } from '../common.js'
import { soundcloudEmbedHandler } from '../platforms/soundcloud.js'
import { spotifyEmbedHandler } from '../platforms/spotify.js'
import { vimeoEmbedHandler } from '../platforms/vimeo.js'
import { youtubeEmbedHandler } from '../platforms/youtube.js'
import type { DomTransform, EmbedPlatformHandler } from '../types.js'
import { coerceNumber } from '../utils.js'

export const defaultEmbedHandlers: Array<EmbedPlatformHandler> = [
  youtubeEmbedHandler,
  vimeoEmbedHandler,
  spotifyEmbedHandler,
  soundcloudEmbedHandler,
]

export const replaceEmbedsWithPlaceholders: DomTransform = (context) => {
  const handlers = context.embedHandlers ?? defaultEmbedHandlers

  return (document) => {
    if (handlers.length === 0) {
      return
    }

    for (const handler of handlers) {
      for (const element of document.querySelectorAll(handler.selector)) {
        const metadata = handler.extract(element)

        if (!metadata) {
          continue
        }

        const width = coerceNumber(element.getAttribute('width')) ?? metadata.width
        const height = coerceNumber(element.getAttribute('height')) ?? metadata.height

        element.replaceWith(
          createEmbedPlaceholder(document, metadata.src, metadata.type ?? 'iframe', {
            ...metadata,
            width,
            height,
          }),
        )
      }
    }
  }
}
