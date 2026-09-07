import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { decodeSegment } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The urn LinkedIn writes into the embed path. Feeds carry `share`, `ugcPost` and `activity`,
// and `article` is unobserved, so the type segment is matched as a word rather than enumerated.
//
// The urn is decoded before matching: a urn written with its colons escaped arrives as
// `urn%3Ali%3Ashare%3A…` and would fail the pattern. LinkedIn serves both spellings, probed
// live 2026-08-31: the escaped one answers 200 with a body byte-identical to the plain one,
// and a urn that names no post answers 404 either way.
const safeUrnRegex = /^urn:li:[a-zA-Z]+:\d+$/

const linkedinHosts = ['linkedin.com']

// LinkedIn is iframe-only: `linkedin.com/embed/feed/update/{urn}`, one path shape. There is no
// blockquote or script form, in feeds or in LinkedIn's own embed flow, so this resolver is the
// whole platform.
//
// Deliberately states no size. Nearly every iframe declares its own width and height, and the
// height is a property of the individual post, not of the player. The embed does measure itself
// and post the height out, but only to LinkedIn's own origins, so a reader never receives it
// and the publisher's stated number is the best source there is.
//
// No title either: carriers overwhelmingly state the boilerplate "Embedded post" in eight
// languages.
//
// `src` keeps the url as the publisher wrote it, because `collapsed` and `compact` select the
// layout the publisher's stated height belongs to. The canonical `url` drops them. Do not try
// to mint the activity urn from a share urn; LinkedIn assigns it server-side and it is not
// computable.
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

export const linkedinEmbedResolver = createUrlEmbedResolver(linkedinHosts, linkedinResolveEmbed)
