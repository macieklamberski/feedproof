import { startsWithAnyOf } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, jsonAttr } from '../../utils/dom.js'
import { isUrlShaped } from '../../utils/urls.js'

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

// The div is empty, so what a refusal costs here is the whole block: `stripEmptyTags` deletes it
// and the embed is gone. A link is minted from the author's own `src` as the last resort, and a
// link to nowhere is worse than none, so this one demands a real scheme rather than the loose
// url shape the wrapper's own query is trusted with.
const isHttpUrl = (value: string | undefined): value is string => {
  return !!value && startsWithAnyOf(value, ['http://', 'https://'])
}

const composeFrame = (document: Document, source: string, poster?: string): Element => {
  const frame = document.createElement('iframe')

  frame.setAttribute('src', source)

  if (poster) {
    frame.setAttribute('data-thumbnail', poster)
  }

  return frame
}

export const rebuildEmbedlyEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll(embedlyCarrierSelector)) {
    if (element.localName === 'iframe') {
      // URLSearchParams reads (and percent-decodes) the query without throwing on a malformed src,
      // so no full URL parse is needed — the protocol-relative `//cdn.embedly.com` form works too.
      const params = new URLSearchParams(attr(element, 'src')?.split('?')[1] ?? '')
      const inner = params.get('src')

      if (!inner || !isUrlShaped(inner)) {
        continue
      }

      const poster = params.get('image')

      element.replaceWith(
        composeFrame(document, inner, poster && isUrlShaped(poster) ? poster : undefined),
      )
      continue
    }

    const payload = jsonAttr<EmbedlyPayload>(element, 'data')

    // A payload naming `link`, or naming no type at all, is the cite pass's to claim: a link
    // preview is a cite, and turning it into a frame would take it away from that resolver.
    if (payload && (payload.type === undefined || payload.type === 'link')) {
      continue
    }

    if (payload && isHttpUrl(payload.url)) {
      element.replaceWith(
        composeFrame(
          document,
          payload.url,
          isHttpUrl(payload.thumbnail_url) ? payload.thumbnail_url : undefined,
        ),
      )
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
