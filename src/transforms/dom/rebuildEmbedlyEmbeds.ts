import type { DomTransform } from '../../types.js'
import { isUrlShaped } from '../../utils/urls.js'

// Embedly's media widget wraps a third-party embed:
// `<iframe src="cdn.embedly.com/widgets/media.html?src=<inner>&image=<poster>&url=<canonical>&schema=<provider>">`.
// The real embed URL and its poster are both in the wrapper's own query. Unwrap to the inner
// iframe so it flows to the provider transforms downstream (a Datawrapper inner becomes a static
// image, a YouTube inner is placeholdered), carrying the poster as `data-thumbnail` — which
// convertWidgets prefers over a resolver's URL-derived guess.
export const rebuildEmbedlyEmbeds: DomTransform = () => (document) => {
  const iframes = document.querySelectorAll('iframe[src*="cdn.embedly.com/widgets/media.html"]')

  for (const iframe of iframes) {
    // URLSearchParams reads (and percent-decodes) the query without throwing on a malformed src,
    // so no full URL parse is needed — the protocol-relative `//cdn.embedly.com` form works too.
    const params = new URLSearchParams(iframe.getAttribute('src')?.split('?')[1] ?? '')
    const inner = params.get('src')

    if (!inner || !isUrlShaped(inner)) {
      continue
    }

    const rebuilt = document.createElement('iframe')
    rebuilt.setAttribute('src', inner)

    const poster = params.get('image')

    if (poster && isUrlShaped(poster)) {
      rebuilt.setAttribute('data-thumbnail', poster)
    }

    iframe.replaceWith(rebuilt)
  }
}
