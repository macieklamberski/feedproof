import type { DomTransform, MediaResolverResult } from '../../types.js'
import { attr, hasText, playableElements } from '../../utils/dom.js'
import {
  audioFileRegex,
  cleanUrl,
  flashFileRegex,
  resolveOrDropUrl,
  resolveOrKeepUrl,
  videoFileRegex,
} from '../../utils/urls.js'
import {
  createEmbedPlaceholder,
  createMediaElement,
  embedCarrierSelector,
  getEmbedSize,
  isEmbedOrMediaResolver,
  isMediaResult,
  prepareEmbedMetadata,
  readCarrierUrl,
} from '../../utils/widgets.js'

const playableSelector = [...playableElements].join(', ')

const getMediaTag = (url: string): MediaResolverResult['tag'] | undefined => {
  if (videoFileRegex.test(url)) {
    return 'video'
  }

  if (audioFileRegex.test(url)) {
    return 'audio'
  }
}

// A Discourse video placeholder, a Beaver Builder row background, the Drupal audio field and
// several WordPress audio players park the media url in an attribute for JS to build the player.
const findParkedMedia = (
  element: Element,
  attributes: Array<string>,
): MediaResolverResult | undefined => {
  for (const attribute of attributes) {
    const value = attr(element, attribute)

    if (!value) {
      continue
    }

    const tag = getMediaTag(value)

    if (tag) {
      return { tag, src: value }
    }
  }
}

// A Flash <object> is a shell of classid, codebase and <param>s around its carrier, and none of
// those renders. An object holding text or other elements carries a fallback the publisher wrote.
const carrierOrShell = (element: Element): Element => {
  const parent = element.parentElement

  if (parent?.localName !== 'object' || hasText(parent)) {
    return element
  }

  const others = Array.from(parent.children).filter(
    (child) => child !== element && child.localName !== 'param',
  )

  return others.length ? element : parent
}

// A native <audio> or <video> has nowhere of its own to put a human-readable title, so one is hung
// in a <figcaption> beside the player. Ghost's video card already lands inside a figure carrying
// the author's own caption, which is the case the ancestor check leaves alone.
const captionMedia = (
  document: Document,
  media: HTMLElement,
  target: Element,
  title: string | undefined,
): Element => {
  const text = title?.trim()

  if (!text || target.parentElement?.closest('figure')) {
    return media
  }

  const figure = document.createElement('figure')
  const caption = document.createElement('figcaption')

  caption.textContent = text
  figure.append(media, caption)

  return figure
}

// Embed carriers as shipped: third-party iframes, dead Flash objects, media urls parked in data-*.
export const convertWidgets: DomTransform = (context) => {
  const { widgetResolvers, mediaSrcAttributes } = context
  const embedOrMediaResolvers = widgetResolvers.filter(isEmbedOrMediaResolver)

  return async (document) => {
    const queried = new Map<string, Array<Element>>()

    const elementsFor = (selector: string): Array<Element> => {
      const cached = queried.get(selector)

      if (cached) {
        return cached
      }

      const found = Array.from(document.querySelectorAll(selector))
      queried.set(selector, found)

      return found
    }

    // Runs before the tiers below, which replace the iframes the playable guard relies on.
    for (const element of document.querySelectorAll('div, figure, span, li')) {
      // A container that already wraps something playable is chrome around a real player,
      // and the attribute belongs to that player, not to a missing element.
      if (element.querySelector(playableSelector)) {
        continue
      }

      const parked = findParkedMedia(element, mediaSrcAttributes)

      if (!parked) {
        continue
      }

      // resolveOrKeepUrl, unlike the tiers below: dropping the url takes the media out of the item,
      // since no browser reads a data-* url and the container renders nothing on its own.
      const resolved = resolveOrKeepUrl(parked.src, context)
      const cleaned = cleanUrl(resolved, context)

      // The container often holds a caption or a track title beside the parked url.
      element.prepend(createMediaElement(document, { tag: parked.tag, src: cleaned }))
    }

    for (const resolver of embedOrMediaResolvers) {
      for (const element of elementsFor(resolver.selector)) {
        // Legacy Flash pairs an `<object>` with a nested `<embed>` and a url-keyed resolver
        // matches both. Replacing the outer one detaches the inner, which is still in this
        // snapshot.
        if (!element.parentNode) {
          continue
        }

        const metadata = await resolver.extract(element)

        if (!metadata) {
          continue
        }

        const src = resolveOrDropUrl(metadata.src, context)

        if (!src) {
          continue
        }

        if (isMediaResult(metadata)) {
          const poster = resolveOrKeepUrl(metadata.poster, context)
          const mediaElement = createMediaElement(document, { ...metadata, src, poster })
          const target = carrierOrShell(element)

          target.replaceWith(captionMedia(document, mediaElement, target, metadata.title))
          continue
        }

        const carriedThumbnail = attr(element, 'data-thumbnail')

        const prepared = prepareEmbedMetadata(
          { ...metadata, thumbnail: carriedThumbnail ?? metadata.thumbnail },
          context,
        )
        const placeholder = createEmbedPlaceholder(document, { ...prepared, src })

        carrierOrShell(element).replaceWith(placeholder)
      }
    }

    // Whatever no resolver claimed. A resolver may have replaced an element that is still in
    // the snapshot, including the inner half of an <object>/<embed> pair, so a detached one
    // is already handled.
    for (const element of elementsFor(embedCarrierSelector)) {
      if (!element.parentNode) {
        continue
      }

      const src = readCarrierUrl(element)

      // resolveUrlFn rejects `about:blank`.
      const resolved = resolveOrDropUrl(src, context)
      // This src is the publisher's own URL, not one minted from a parsed id, so it arrives
      // with whatever tracking params they pasted.
      const cleaned = cleanUrl(resolved, context)

      if (!cleaned) {
        continue
      }

      // A .swf carrier stays: a placeholder reads as resolved and drops the object's fallback.
      // No browser runs one since 2021, and a browser then shows the object's fallback children.
      if (flashFileRegex.test(cleaned)) {
        continue
      }

      // A carrier framing a bare media file plays as the element instead: the reader gets a
      // native player, and the src flows through the media passes downstream.
      const mediaTag = getMediaTag(cleaned)

      if (mediaTag) {
        const mediaElement = createMediaElement(document, { tag: mediaTag, src: cleaned })

        carrierOrShell(element).replaceWith(mediaElement)
        continue
      }

      const placeholder = createEmbedPlaceholder(document, {
        src: cleaned,
        ...getEmbedSize(element),
      })

      carrierOrShell(element).replaceWith(placeholder)
    }
  }
}
