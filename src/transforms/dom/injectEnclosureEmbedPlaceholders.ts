import { createEmbedPlaceholder } from '../../common.js'
import { defaultResolveUrlFn } from '../../defaults.js'
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

export const injectEnclosureEmbedPlaceholders: DomTransform = (context) => {
  const resolvers = context.embedResolvers ?? []
  const resolveUrlFn = context.resolveUrlFn ?? defaultResolveUrlFn

  return (document) => {
    if (!context.enclosures?.length) {
      return
    }

    const html = document.toString()

    for (const enclosure of context.enclosures) {
      if (html.includes(enclosure.url)) {
        continue
      }

      if (!resolveUrlFn(enclosure.url, context.baseUrl)) {
        continue
      }

      const resolved = resolveEnclosure(enclosure.url, resolvers, document)

      if (!resolved && !isAudioEnclosure(enclosure) && !isVideoEnclosure(enclosure)) {
        continue
      }

      const type = resolved?.type ?? (isAudioEnclosure(enclosure) ? 'audio' : 'video')
      const placeholder = createEmbedPlaceholder(document, enclosure.url, type, resolved)

      document.body.prepend(placeholder)
    }
  }
}
