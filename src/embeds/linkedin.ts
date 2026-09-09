import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { decodeSegment } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The urn LinkedIn writes into the embed path. Feeds carry `share`, `ugcPost` and `activity`.
const safeUrnRegex = /^urn:li:[a-zA-Z]+:\d+$/

const linkedinHosts = ['linkedin.com']

const linkedinResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const [route, section, action, urn] = getPathSegments(link)

  if (route !== 'embed' || section !== 'feed' || action !== 'update') {
    return
  }

  // Some carriers escape the colons, `urn%3Ali%3Ashare%3A…`, and LinkedIn serves both alike.
  const postUrn = keepIfMatches(decodeSegment(urn), safeUrnRegex)

  if (!postUrn) {
    return
  }

  // No size: the height is the post's, not the player's, and the embed posts its measured height
  // only to LinkedIn's own origins. No title: carriers state the boilerplate "Embedded post" in
  // eight languages.
  return {
    provider: 'linkedin',
    id: postUrn,
    // Kept as written: `collapsed` and `compact` pick the layout the stated height belongs to.
    src: link,
    // The activity urn is assigned server-side, so a share urn cannot be rewritten to it.
    url: `https://www.linkedin.com/feed/update/${postUrn}`,
  }
}

// LinkedIn's post iframe, linkedin.com/embed/feed/update/{urn}, the platform's only embed form.
export const linkedinEmbedResolver = createUrlEmbedResolver(linkedinHosts, linkedinResolveEmbed)
