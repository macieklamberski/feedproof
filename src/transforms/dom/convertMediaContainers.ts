import type { DomTransform, MediaResolverResult } from '../../types.js'
import { playableElements } from '../../utils/dom.js'
import { audioFileRegex, videoFileRegex } from '../../utils/urls.js'

const playableSelector = [...playableElements].join(', ')

// A container that parks its media URL in an attribute and builds the player with JS, so a
// reader shows nothing (Discourse video placeholders, Beaver Builder row backgrounds, the
// Drupal audio field, several WordPress audio players). Mirrors convertLazyImageContainers,
// which does the same for an image: the value has to name a media file, which is what keeps
// a generic attribute like `data-src` from matching something that is not media (the
// manifest exclusion is explained on the regexes themselves).
const findParkedMedia = (element: Element, attributes: Array<string>) => {
  for (const attribute of attributes) {
    const value = element.getAttribute(attribute)?.trim()

    if (!value) {
      continue
    }

    if (videoFileRegex.test(value)) {
      return { tag: 'video', src: value } satisfies MediaResolverResult
    }

    if (audioFileRegex.test(value)) {
      return { tag: 'audio', src: value } satisfies MediaResolverResult
    }
  }
}

// Replaces a container that names its media by an id or a parked URL with the real element.
// Runs before the media passes so the result is dimensioned, proxied and deduplicated like
// any other <video>/<audio>, and well before stripEmptyTags, which would otherwise delete
// the childless container the platform ships.
export const convertMediaContainers: DomTransform = (context) => {
  const { mediaResolvers, mediaSrcAttributes } = context

  return async (document) => {
    for (const resolver of mediaResolvers) {
      for (const element of document.querySelectorAll(resolver.selector)) {
        const result = await resolver.extract(element)

        if (!result) {
          continue
        }

        const media = document.createElement(result.tag)
        media.setAttribute('src', result.src)
        media.setAttribute('controls', '')

        // <audio> has no poster, so it is written only where it renders.
        if (result.poster && result.tag === 'video') {
          media.setAttribute('poster', result.poster)
        }

        element.replaceWith(media)
      }
    }

    for (const element of document.querySelectorAll('div, figure, span, li')) {
      // A container that already wraps something playable is chrome around a real player,
      // and the attribute belongs to that player rather than to a missing element.
      if (element.querySelector(playableSelector)) {
        continue
      }

      const parked = findParkedMedia(element, mediaSrcAttributes)

      if (!parked) {
        continue
      }

      const media = document.createElement(parked.tag)
      media.setAttribute('src', parked.src)
      media.setAttribute('controls', '')

      // The container often holds a caption or a track title, which is content rather than
      // player chrome, so the media goes in front of it instead of replacing it.
      element.prepend(media)
    }
  }
}
