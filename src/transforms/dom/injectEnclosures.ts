import { createEmbedPlaceholder } from '../../common.js'
import type { DomTransform, EmbedResolver, EmbedResolverResult, Enclosure } from '../../types.js'

const isAudioEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'audio' || !!enclosure.type?.startsWith('audio/')
}

const isVideoEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'video' || !!enclosure.type?.startsWith('video/')
}

// Run resolvers against a synthesized iframe carrying the enclosure URL so that
// iframe-shaped resolvers (YouTube etc.) can claim platform-specific enclosures.
const resolveEnclosure = (
  url: string,
  resolvers: ReadonlyArray<EmbedResolver>,
  document: Document,
): EmbedResolverResult | undefined => {
  const probe = document.createElement('iframe')
  probe.setAttribute('src', url)

  for (const resolver of resolvers) {
    if (probe.matches(resolver.selector)) {
      const metadata = resolver.extract(probe)

      if (metadata) {
        return metadata
      }
    }
  }
}

const createNativeMediaElement = (
  document: Document,
  tagName: 'audio' | 'video',
  url: string,
): HTMLElement => {
  const element = document.createElement(tagName)
  element.setAttribute('src', url)
  element.setAttribute('controls', '')
  element.setAttribute('preload', 'none')
  return element
}

export const injectEnclosures: DomTransform = (context) => {
  return (document) => {
    if (!context.enclosures?.length) {
      return
    }

    const html = document.toString()

    for (const enclosure of context.enclosures) {
      if (html.includes(enclosure.url)) {
        continue
      }

      if (!context.resolveUrlFn(enclosure.url, context.baseUrl)) {
        continue
      }

      const resolved = resolveEnclosure(enclosure.url, context.embedResolvers, document)

      if (resolved) {
        const placeholder = createEmbedPlaceholder(document, enclosure.url, resolved)
        document.body.prepend(placeholder)
        continue
      }

      if (isAudioEnclosure(enclosure)) {
        document.body.prepend(createNativeMediaElement(document, 'audio', enclosure.url))
        continue
      }

      if (isVideoEnclosure(enclosure)) {
        document.body.prepend(createNativeMediaElement(document, 'video', enclosure.url))
      }
    }
  }
}
