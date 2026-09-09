import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { decodeSegment } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const safeUrnRegex = /^urn:li:[a-zA-Z]+:\d+$/

const linkedinHosts = ['linkedin.com']

const linkedinResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const [route, section, action, urn] = getPathSegments(link)

  if (route !== 'embed' || section !== 'feed' || action !== 'update') {
    return
  }

  const postUrn = keepIfMatches(decodeSegment(urn), safeUrnRegex)

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

// LinkedIn's post iframe, linkedin.com/embed/feed/update/{urn}, the platform's only embed form.
export const linkedinEmbedResolver = createUrlEmbedResolver(linkedinHosts, linkedinResolveEmbed)
