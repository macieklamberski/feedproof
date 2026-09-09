import type { DomTransform } from '../../types.js'
import { attr, jsonAttr } from '../../utils/dom.js'
import { isUrlShaped } from '../../utils/urls.js'
import { createIframe } from '../../utils/widgets.js'

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

// Embedly ships an embed as a wrapper iframe or as an empty div only the publishing client fills.
export const rebuildEmbedlyEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll(embedlyCarrierSelector)) {
    if (element.localName === 'iframe') {
      // The wrapper's query holds the embed as src, its poster as image and the canonical as url.
      // A full URL parse throws on the protocol-relative //cdn.embedly.com form.
      const params = new URLSearchParams(attr(element, 'src')?.split('?')[1] ?? '')
      const inner = params.get('src')

      if (!isUsableUrl(inner)) {
        continue
      }

      const poster = params.get('image')

      element.replaceWith(composeIframe(document, inner, isUsableUrl(poster) ? poster : undefined))
      continue
    }

    // The div's data attribute carries an oEmbed payload.
    const payload = jsonAttr<EmbedlyPayload>(element, 'data')

    // A link payload, or one with no type, is a cite the cite pass claims.
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
