import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The urn LinkedIn writes into the embed path. Three types occur in the corpus, `share` in 263
// feeds, `ugcPost` in 233 and `activity` in 12, and `article` is unobserved across two corpus
// generations, so the type segment is matched as a word rather than enumerated.
const safeUrnRegex = /^urn:li:[a-zA-Z]+:\d{6,32}$/

const linkedinHosts = ['linkedin.com']

// LinkedIn is iframe-only: `linkedin.com/embed/feed/update/{urn}`, in 443 corpus feeds and one
// path shape. There is no blockquote or script form, confirmed against the inline-script census
// and LinkedIn's own embed flow, so this resolver is the whole platform.
//
// Deliberately states no size. 685 of 695 corpus iframes declare their own width and height, and
// at LinkedIn's default width of 504 the height spans 264 to 2098 across 302 distinct values:
// it is a property of the individual post, not of the player. The embed does measure itself and
// post the height out, but only to LinkedIn's own origins, so a reader never receives it and the
// publisher's stated number is the best source there is. See _corpus/linkedin.md.
//
// No title either: 655 of 657 carriers state the boilerplate "Embedded post" in eight languages.
//
// `src` keeps the url as the publisher wrote it, because `collapsed` and `compact` select the
// layout their height was measured against. The canonical `url` drops them. Do not try to mint
// the activity urn from a share urn; LinkedIn assigns it server-side and it is not computable.
const linkedinResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const [route, section, action, urn] = getPathSegments(link)

  if (route !== 'embed' || section !== 'feed' || action !== 'update') {
    return
  }

  const postUrn = keepIfMatches(urn, safeUrnRegex)

  if (!postUrn) {
    return
  }

  return {
    provider: 'linkedin',
    id: postUrn,
    src: link,
    url: `https://www.linkedin.com/feed/update/${postUrn}`,
  }
}

export const linkedinEmbedResolver = createUrlEmbedResolver(linkedinHosts, linkedinResolveEmbed)
