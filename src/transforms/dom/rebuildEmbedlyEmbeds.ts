import type { DomTransform } from '../../types.js'
import { attr, jsonAttr } from '../../utils/dom.js'
import { isUrlShaped } from '../../utils/urls.js'
import { createIframe } from '../../utils/widgets.js'

// Embedly wraps a third-party embed in two carriers, and both name the real target and its poster
// without a fetch. The rendered one is a wrapper iframe whose own query holds them:
// `<iframe src="cdn.embedly.com/widgets/media.html?src=<inner>&image=<poster>&url=<canonical>">`.
// The unrendered one is an empty `<div data-type="embedly">` carrying an oEmbed payload in `data`,
// which only the publishing platform's own client fills in.
//
// Both unwrap to a plain iframe so the provider transforms below handle them instead of an Embedly
// shell: a Datawrapper inner becomes a static image, a YouTube inner is placeholdered. The poster
// rides along as `data-thumbnail`, which convertWidgets prefers over a resolver's url-derived
// guess.
const embedlyCarrierSelector = [
  'iframe[src*="cdn.embedly.com/widgets/media.html"]',
  'div[data-type="embedly"]',
].join(', ')

type EmbedlyPayload = {
  type?: string
  url?: string
  thumbnail_url?: string
}

const isUsableUrl = (value: string | null | undefined): value is string => {
  return !!value && isUrlShaped(value)
}

const composeIframe = (document: Document, source: string, poster?: string): Element => {
  const iframe = createIframe(document, source)

  if (poster) {
    iframe.setAttribute('data-thumbnail', poster)
  }

  return iframe
}

export const rebuildEmbedlyEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll(embedlyCarrierSelector)) {
    if (element.localName === 'iframe') {
      // URLSearchParams reads (and percent-decodes) the query without throwing on a malformed src,
      // so no full URL parse is needed: the protocol-relative `//cdn.embedly.com` form works too.
      const params = new URLSearchParams(attr(element, 'src')?.split('?')[1] ?? '')
      const inner = params.get('src')

      if (!isUsableUrl(inner)) {
        continue
      }

      const poster = params.get('image')

      element.replaceWith(composeIframe(document, inner, isUsableUrl(poster) ? poster : undefined))
      continue
    }

    const payload = jsonAttr<EmbedlyPayload>(element, 'data')

    // A payload naming `link`, or naming no type at all, is the cite pass's to claim: a link
    // preview is a cite, and turning it into an iframe would take it away from that resolver.
    if (payload && (payload.type === undefined || payload.type === 'link')) {
      continue
    }

    if (payload && isUsableUrl(payload.url)) {
      element.replaceWith(
        composeIframe(
          document,
          payload.url,
          isUsableUrl(payload.thumbnail_url) ? payload.thumbnail_url : undefined,
        ),
      )
      continue
    }

    const source = attr(element, 'src')

    if (!payload && isUsableUrl(source)) {
      const link = document.createElement('a')

      link.setAttribute('href', source)
      link.textContent = source
      element.replaceWith(link)
    }
  }
}
