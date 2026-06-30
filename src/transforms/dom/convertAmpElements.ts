import type { DomTransform } from '../../types.js'

type AmpConversion = {
  selector: string
  target: string
  attributes: Array<string>
  moveChildren?: boolean
}

const youtubeIdRegex = /^[\w-]{11}$/

// Attributes carried onto the replacement element. AMP layout attributes (layout, on,
// placeholder, fallback, …) are intentionally dropped.
const imageAttributes = ['src', 'srcset', 'sizes', 'alt', 'width', 'height']
const videoAttributes = ['src', 'poster', 'width', 'height', 'controls', 'loop', 'muted']
const audioAttributes = ['src', 'controls', 'loop']
const iframeAttributes = ['src', 'width', 'height', 'allowfullscreen', 'frameborder', 'title']

const conversions: Array<AmpConversion> = [
  { selector: 'amp-img', target: 'img', attributes: imageAttributes },
  { selector: 'amp-anim', target: 'img', attributes: imageAttributes },
  { selector: 'amp-video', target: 'video', attributes: videoAttributes, moveChildren: true },
  { selector: 'amp-audio', target: 'audio', attributes: audioAttributes, moveChildren: true },
  { selector: 'amp-iframe', target: 'iframe', attributes: iframeAttributes },
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

    if (!videoId || !youtubeIdRegex.test(videoId)) {
      continue
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}`)

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

      for (const attribute of conversion.attributes) {
        const value = element.getAttribute(attribute)

        if (value !== null) {
          replacement.setAttribute(attribute, value)
        }
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
