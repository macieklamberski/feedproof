import { startsWithAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, jsonAttr } from '../../utils/dom.js'

// Paragraph ships every embed as an empty `<div data-type="embedly">` carrying an oEmbed payload
// in `data`, and only its web client fills the div in. `paragraphCiteResolver` turns the `link`
// type into a cite, correctly, and refuses the rest: a video is not a link preview. But the
// carrier is empty, so a refusal used to end with `stripEmptyTags` deleting the whole block.
//
// The payload names the target either way, so the embed is recoverable. A non-link type becomes a
// plain iframe here in the normalize cluster, before the cite and widget passes, so each is
// classified by its url the way any other iframe is. A payload that is absent or malformed names
// nothing beyond the author's own `src`, so that becomes a link and the reference survives.
type EmbedlyPayload = {
  type?: string
  url?: string
  thumbnail_url?: string
}

const isHttpUrl = (value: string | undefined): value is string => {
  return !!value && startsWithAnyOf(value, ['http://', 'https://'])
}

export const convertParagraphEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('div[data-type="embedly"]')) {
    const payload = jsonAttr<EmbedlyPayload>(element, 'data')

    // A payload naming `link`, or naming no type at all, is the cite pass's to claim.
    if (payload && (payload.type === undefined || payload.type === 'link')) {
      continue
    }

    if (payload && isHttpUrl(payload.url)) {
      const iframe = document.createElement('iframe')

      iframe.setAttribute('src', payload.url)

      // convertWidgets prefers a carried poster over a resolver's url-derived guess.
      if (isHttpUrl(payload.thumbnail_url)) {
        iframe.setAttribute('data-thumbnail', payload.thumbnail_url)
      }

      element.replaceWith(iframe)
      continue
    }

    const source = attr(element, 'src')

    if (!payload && isHttpUrl(source)) {
      const link = document.createElement('a')

      link.setAttribute('href', source)
      link.textContent = source
      element.replaceWith(link)
    }
  }
}
