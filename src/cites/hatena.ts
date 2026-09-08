import { parseUrl } from 'trousse'
import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'

// Hatena Blog renders a pasted link as an iframe pointing at its card renderer, followed by
// a `<cite>` holding the real link. Both sit inside one paragraph, and the paragraph is what
// this matches: matching the iframe alone would convert the card but leave the citation behind
// as a stray domain link, and hand the card to the generic embed path, which emits a placeholder
// pointing at the card renderer rather than a viewable embed.
//
// Replacing the whole paragraph drops any prose the author wrote beside the card. That case is
// rare, and kept anyway.
//
// The class alone does not decide, because it is not dependable: `embed-card` is the common
// spelling, and the rest ship `hatenablogcard`, `wp-embedded-content`, a theme's own class, or
// nothing at all. An iframe elsewhere carrying the class is someone else's player, and claiming
// it would mint a cite from that player's own `url=` query and delete the player with the
// paragraph.
//
// Two shapes are a card, and the renderer host names only the first. A blog also serves the card
// from its own host, `{blog}.hatenablog.com/embed/{entry}`, which a custom domain does too, so no
// host list reaches it. What identifies that one is the citation Hatena writes beside it naming
// the same host: the blog is citing its own entry. A foreign player carries no such citation, or
// carries one pointing somewhere else, so the pair is what separates them rather than the class.
//
// An iframe stating no src is refused, and loses only the upgrade, since the paragraph and its
// citation link then survive as written.
const cardHost = 'hatenablog-parts.com'

const cardIframeSelector = [
  'iframe.embed-card',
  'iframe.hatenablogcard',
  `iframe[src*="${cardHost}/embed"]`,
].join(', ')

const cardParagraphSelector = cardIframeSelector
  .split(', ')
  .map((selector) => `p:has(> ${selector})`)
  .join(', ')

// The blog serving its own card, which the citation beside it names on the same host. Both are
// parsed against one placeholder base so a relative pair is compared on the page's own terms.
const isSelfHosted = (source: string, citationHref: string | undefined): boolean => {
  const citation = citationHref ? parseUrl(citationHref, placeholderBaseUrl) : undefined

  return citation !== undefined && parseUrl(source, placeholderBaseUrl)?.host === citation.host
}

export const hatenaCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: cardParagraphSelector,
  extract: (element) => {
    const iframe = find(element, cardIframeSelector)
    const source = attr(iframe, 'src')

    if (!source) {
      return
    }

    const citationLink = find(element, 'cite.hatena-citation a')
    const citationHref = attr(citationLink, 'href')
    const cardUrl = parseUrlOnHosts(source, cardHost)

    if (!cardUrl && !isSelfHosted(source, citationHref)) {
      return
    }

    return buildCite({
      provider: 'hatena',
      // The citation's href comes first: it is the plain target, so it needs no decoding.
      url: citationHref ?? cardUrl?.searchParams.get('url'),
      title: attr(iframe, 'title'),
      publisher: text(citationLink),
    })
  },
}
