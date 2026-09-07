import { parseUrl } from 'trousse'
import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'

// The Times answers oEmbed with an iframe of its own article card, `/svc/oembed/html/?url=…`,
// and that is what a pasted article link becomes on WordPress and on anything else that asks.
// The card is a headline, byline, date and summary linking to the article, so it is a link card
// and not a player. Left to the embed pass it would come out as a click-to-load frame; read
// here, the article url and the title the snippet states on the iframe make a cite offline.
const cardHosts = ['nytimes.com']
const cardPath = '/svc/oembed/html/'

export const nytimesCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: `iframe[src*="nytimes.com${cardPath}"]`,
  extract: (element) => {
    const card = parseUrlOnHosts(attr(element, 'src'), cardHosts)

    if (card?.pathname !== cardPath) {
      return
    }

    // The article url is taken as the publisher wrote it. It names no route, nothing is composed
    // from it, and the card answers 404 for a url off the paper (checked 2026-09-07), so holding
    // it to the Times' own hosts would only turn a card the reader could still follow into a
    // frame that renders nothing.
    const article = parseUrl(card.searchParams.get('url') ?? '')

    return buildCite({
      provider: 'nytimes',
      url: article?.href,
      title: attr(element, 'title'),
    })
  },
}
