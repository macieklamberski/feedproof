import type { DomTransform } from '../../types.js'

// Replaces a container that names its media by an id with the real element. Runs before the
// media passes so the result is dimensioned, proxied and deduplicated like any other
// <video>/<audio>, and well before stripEmptyTags, which would otherwise delete the
// childless container the platform ships.
export const convertMediaContainers: DomTransform = (context) => {
  const { mediaResolvers } = context

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

        element.replaceWith(media)
      }
    }
  }
}
