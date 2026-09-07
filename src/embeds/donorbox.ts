import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const donorboxHosts = ['donorbox.org']

// A campaign slug as Donorbox writes it: one run of word characters and hyphens.
const slugRegex = /^[\w-]+$/

// The form does not grow with its container: measured 750 tall at 250 wide and 733 at 500 and
// 1000 on 2026-09-03, on the first of its steps. Donorbox's own snippet reserves 900, which is
// what the later steps need, and its loader script resizes the frame from there.
const formHeight = 900

// Only `/embed/{slug}` is a form. The campaign page sits at `/{slug}` and is what the
// placeholder links to; the blog and event routes name nothing embeddable.
export const donorboxResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, donorboxHosts)

  if (!parsed) {
    return
  }

  const [kind, slug, ...rest] = getPathSegments(parsed)

  if (kind !== 'embed' || !slug || rest.length > 0 || !slugRegex.test(slug)) {
    return
  }

  return {
    provider: 'donorbox',
    id: slug,
    // The publisher's query picks the default interval, amount and meter, so the url travels
    // whole rather than rebuilt from the slug.
    src: url,
    url: `https://donorbox.org/${slug}`,
    height: formHeight,
  }
}

export const donorboxEmbedResolver = createUrlEmbedResolver(donorboxHosts, donorboxResolveEmbed)
