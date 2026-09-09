import type { DomTransform } from '../../types.js'

type AmpConversion = {
  selector: string
  target: string
  moveChildren?: boolean
}

// No amp-youtube or other platform element: converting one here shadows that platform's resolver.
// amp-video-iframe stays: its src is any page at all, so there is no resolver it could shadow.
// No amp-story either: it is a full-page format, not in-content media.
const conversions: Array<AmpConversion> = [
  { selector: 'amp-img', target: 'img' },
  { selector: 'amp-anim', target: 'img' },
  { selector: 'amp-video', target: 'video', moveChildren: true },
  { selector: 'amp-audio', target: 'audio', moveChildren: true },
  { selector: 'amp-iframe', target: 'iframe' },
  { selector: 'amp-video-iframe', target: 'iframe' },
]

// AMP media elements like <amp-img> and <amp-video> render nothing without the AMP runtime.
export const convertAmpNativeElements: DomTransform = () => (document) => {
  for (const conversion of conversions) {
    for (const element of document.querySelectorAll(conversion.selector)) {
      const replacement = document.createElement(conversion.target)

      // Copying a subset of attributes drops ordinary HTML like preload and loading.
      // AMP's layout, on and placeholder attributes ride along and mean nothing on a plain element.
      for (const attribute of Array.from(element.attributes)) {
        replacement.setAttribute(attribute.name, attribute.value)
      }

      // Carry the playable sources over. AMP placeholder/fallback children are dropped.
      if (conversion.moveChildren) {
        for (const child of [...element.children]) {
          if (child.localName === 'source' || child.localName === 'track') {
            replacement.appendChild(child)
          }
        }
      }

      element.replaceWith(replacement)
    }
  }
}
