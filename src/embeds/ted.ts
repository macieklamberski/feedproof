import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { keepIfMatches } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// Talk slugs are the speaker and title joined by underscores, e.g. `ethan_zuckerman`.
const safeSlugRegex = /^[a-z0-9_]+$/i
const htmlSuffixRegex = /\.html$/

const tedHosts = ['ted.com']

// `embed.ted.com/talks/{slug}.html`, and a localized variant that inserts the language:
// `embed.ted.com/talks/lang/{lang}/{slug}.html`. The slug is the talk's canonical id on
// ted.com, so a watch url follows from it without a lookup.
export const extractTedTalk = (link: string): string | undefined => {
  const segments = getPathSegments(link)

  if (segments[0] !== 'talks') {
    return
  }

  const slug = (segments[1] === 'lang' ? segments[3] : segments[1])?.replace(htmlSuffixRegex, '')

  return keepIfMatches(slug, safeSlugRegex)
}

// Feeds carry a short slug (`ethan_zuckerman`) and TED redirects it to the full one
// (`ethan_zuckerman_listening_to_global_voices`), which cannot be derived offline, so one
// redirect is unavoidable. `/embed/{slug}` reaches the canonical player in a single hop while
// the `/talks/` path in the markup takes two, both checked 2026-08-11.
//
// The canonical talk page is derivable from the slug, which is what a reader gets to click.
// The thumbnail is not derivable: TED's oEmbed returns `thumbnail_url` (verified live in the
// platform research) but it is a lookup, so it belongs to the enrichment hook, which needs
// exactly the provider and id tagged here.
export const tedResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const slug = extractTedTalk(url)

  if (!slug) {
    return
  }

  return {
    provider: 'ted',
    id: slug,
    src: `https://embed.ted.com/embed/${slug}`,
    url: `https://www.ted.com/talks/${slug}`,
  }
}

export const tedEmbedResolver = createUrlEmbedResolver(tedHosts, tedResolveEmbed)
