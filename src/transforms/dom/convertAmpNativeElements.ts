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
// native HTML equivalent so the normal image/embed transforms downstream can dimension,
// placeholder, and proxy it. <amp-story> is a full-page format, not in-content media,
// and is left alone.
//
// The set stops at AMP elements with a native equivalent, where the provider is unknown or
// beside the point. An AMP element naming a platform (<amp-youtube>, <amp-jwplayer>,
// <amp-gist>, …) belongs to that platform's own resolver or transform, which reads its
// attributes and mints the placeholder directly. That boundary is load-bearing rather than
// tidy: this transform runs in the normalize cluster ahead of convertWidgets, so an
// amp-{platform} element handled here would rewrite the markup before the platform's own
// selector ever sees it, and shadow the resolver silently.
export const convertAmpNativeElements: DomTransform = () => (document) => {
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
