import { composeEmbedUrl } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'

type AmpConversion = {
  selector: string
  target: string
  moveChildren?: boolean
}

const conversions: Array<AmpConversion> = [
  { selector: 'amp-img', target: 'img' },
  { selector: 'amp-anim', target: 'img' },
  { selector: 'amp-video', target: 'video', moveChildren: true },
  { selector: 'amp-audio', target: 'audio', moveChildren: true },
  { selector: 'amp-iframe', target: 'iframe' },
]

// AMP custom elements (<amp-img>, <amp-video>, …) render nothing without the AMP
// runtime, and a reader runs no JS — so the media never appears. Convert each to its
// plain HTML equivalent so the normal image/embed transforms downstream can dimension,
// placeholder, and proxy it. <amp-story> is a full-page format, not in-content media,
// and is left alone.
export const convertAmpElements: DomTransform = () => (document) => {
  // <amp-youtube> carries the id in data-videoid; build the embed iframe so the
  // YouTube resolver downstream recovers the id and thumbnail.
  for (const element of document.querySelectorAll('amp-youtube')) {
    const videoId = element.getAttribute('data-videoid')

    if (!videoId) {
      continue
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', composeEmbedUrl(videoId))

    for (const attribute of ['width', 'height']) {
      const value = element.getAttribute(attribute)

      if (value) {
        iframe.setAttribute(attribute, value)
      }
    }

    element.replaceWith(iframe)
  }

  for (const conversion of conversions) {
    for (const element of document.querySelectorAll(conversion.selector)) {
      const replacement = document.createElement(conversion.target)

      // Everything the publisher wrote rides along. AMP's own layout attributes (layout, on,
      // placeholder, …) come with it and mean nothing on a plain element, but picking a subset
      // costs more than it saves: the allow-list silently dropped ordinary HTML like `preload`
      // and `loading`, and it has to grow every time HTML does.
      for (const attribute of Array.from(element.attributes)) {
        replacement.setAttribute(attribute.name, attribute.value)
      }

      // Carry the playable sources over; AMP placeholder/fallback children are dropped.
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
