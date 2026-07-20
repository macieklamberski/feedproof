import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// WordPress core turns a pasted link to another WordPress post into two siblings: a
// blockquote holding the real url and title, and an iframe pointing at the target's
// `/embed/#?secret=…` renderer. Only the blockquote carries usable content — the iframe
// src is an internal handshake url that renders nothing outside WordPress's postMessage
// bridge — so the blockquote is what this matches. The iframe is dropped as non-content.
//
// The anchor sits directly in the blockquote on some installs and inside a `<p>` on
// others, so it is found by descendant rather than by child.
export const wordpressCiteResolver: CiteResolver = {
  selector: 'blockquote.wp-embedded-content',
  extract: (element) => {
    const link = find(element, 'a[href]')

    return buildCite({
      provider: 'wordpress',
      url: attr(link, 'href'),
      title: text(link),
    })
  },
}
