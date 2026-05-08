import { createEmbedPlaceholder } from '../common.js'
import type { DomTransform, EmbedHandler, EmbedResolverResult, Enclosure } from '../types.js'

const isAudioEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'audio' || !!enclosure.type?.startsWith('audio/')
}

const isVideoEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'video' || !!enclosure.type?.startsWith('video/')
}

// Run handlers against a synthesized iframe carrying the enclosure URL so that
// iframe-shaped handlers (YouTube etc.) can claim platform-specific enclosures.
const resolveEnclosure = (
  url: string,
  handlers: ReadonlyArray<EmbedHandler>,
  document: Document,
): EmbedResolverResult | undefined => {
  const probe = document.createElement('iframe')
  probe.setAttribute('src', url)

  for (const handler of handlers) {
    if (probe.matches(handler.selector)) {
      const metadata = handler.extract(probe)

      if (metadata) {
        return metadata
      }
    }
  }
}

export const injectEnclosureEmbedPlaceholders: DomTransform = (context) => {
  const handlers = context.embedHandlers ?? []

  return (document) => {
    if (!context.enclosures?.length) {
      return
    }

    const html = document.toString()

    for (const enclosure of context.enclosures) {
      if (html.includes(enclosure.url)) {
        continue
      }

      const resolved = resolveEnclosure(enclosure.url, handlers, document)

      if (!resolved && !isAudioEnclosure(enclosure) && !isVideoEnclosure(enclosure)) {
        continue
      }

      const type = resolved?.type ?? (isAudioEnclosure(enclosure) ? 'audio' : 'video')
      const placeholder = createEmbedPlaceholder(document, enclosure.url, type, resolved)

      document.body.prepend(placeholder)
    }
  }
}
