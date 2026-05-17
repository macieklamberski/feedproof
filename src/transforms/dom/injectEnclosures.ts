import { createEmbedPlaceholder } from '../../common.js'
import type {
  DomTransform,
  EmbedResolver,
  EmbedResolverResult,
  Enclosure,
  TransformContext,
} from '../../types.js'

const isAudioEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'audio' || !!enclosure.type?.startsWith('audio/')
}

const isVideoEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'video' || !!enclosure.type?.startsWith('video/')
}

// Run resolvers against a synthesized iframe carrying the enclosure URL so that
// iframe-shaped resolvers (YouTube etc.) can claim platform-specific enclosures.
const resolveEnclosure = async (
  url: string,
  resolvers: ReadonlyArray<EmbedResolver>,
  document: Document,
): Promise<EmbedResolverResult | undefined> => {
  const probe = document.createElement('iframe')
  probe.setAttribute('src', url)

  for (const resolver of resolvers) {
    if (probe.matches(resolver.selector)) {
      const metadata = await resolver.extract(probe)

      if (metadata) {
        return metadata
      }
    }
  }
}

// TODO: render Enclosure `title` and `description` somehow. Neither <audio> nor <video>
// have a native caption slot, and the chosen approach (figure/figcaption wrapper,
// aria-label, data-* attributes, etc.) needs a separate design pass.
const createNativeMediaElement = (
  document: Document,
  tagName: 'audio' | 'video',
  enclosure: Enclosure,
  context: TransformContext,
): HTMLElement => {
  const element = document.createElement(tagName)
  element.setAttribute('src', enclosure.url)
  element.setAttribute('controls', '')
  element.setAttribute('preload', 'none')

  if (tagName === 'video') {
    if (enclosure.width) {
      element.setAttribute('width', String(enclosure.width))
    }

    if (enclosure.height) {
      element.setAttribute('height', String(enclosure.height))
    }

    const poster = enclosure.thumbnails?.[0]?.url
    if (poster && context.resolveUrlFn(poster, context.baseUrl)) {
      element.setAttribute('poster', poster)
    }
  }

  return element
}

export const injectEnclosures: DomTransform = (context) => {
  return async (document) => {
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

      const resolved = await resolveEnclosure(enclosure.url, context.embedResolvers, document)

      if (resolved) {
        const placeholder = createEmbedPlaceholder(document, enclosure.url, resolved)
        document.body.prepend(placeholder)
        continue
      }

      if (isAudioEnclosure(enclosure)) {
        document.body.prepend(createNativeMediaElement(document, 'audio', enclosure, context))
        continue
      }

      if (isVideoEnclosure(enclosure)) {
        document.body.prepend(createNativeMediaElement(document, 'video', enclosure, context))
      }
    }
  }
}
