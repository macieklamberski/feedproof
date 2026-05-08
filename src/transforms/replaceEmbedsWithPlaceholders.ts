import { createEmbedPlaceholder } from '../common.js'
import { youtubeEmbedHandler } from '../embeds/youtube.js'
import type { DomTransform, EmbedHandler } from '../types.js'
import { coerceNumber } from '../utils.js'

export const defaultEmbedHandlers: Array<EmbedHandler> = [youtubeEmbedHandler]

export const replaceEmbedsWithPlaceholders: DomTransform = (context) => {
  const handlers = context.embedHandlers ?? defaultEmbedHandlers

  return (document) => {
    if (handlers.length === 0) {
      return
    }

    for (const handler of handlers) {
      const elements = document.querySelectorAll(handler.selector)

      for (const element of elements) {
        const metadata = handler.extract(element)

        if (!metadata) {
          continue
        }

        const width = coerceNumber(element.getAttribute('width')) ?? metadata.width
        const height = coerceNumber(element.getAttribute('height')) ?? metadata.height

        const placeholder = createEmbedPlaceholder(
          document,
          metadata.src,
          metadata.type ?? 'iframe',
          { ...metadata, width, height },
        )

        element.replaceWith(placeholder)
      }
    }
  }
}
