import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { readPixels } from '../utils/hints.js'
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

// The form posts its rendered height unasked, as `{ from: 'dbox', src, height }`, and answers a
// posted `{ action: 'please-resize-me' }` with the same message, so a reader that misses the first
// one can ask for it. Verified in a browser on 2026-09-07: a form at 640 wide reported 572 and
// settled at 573, against the 900 stated above.
//
// The origin is spelled out rather than left to the frame's own. The src is the publisher's url
// whole and this resolver takes subdomains, so a carrier written against `www.donorbox.org`, which
// 301s to the apex, would have a src saying `www` while every message arrives from the apex.
export const readDonorboxHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.from === 'dbox' ? readPixels(data.height) : undefined
}

export const donorboxRenderHint: EmbedRenderHint = {
  provider: 'donorbox',
  origin: 'https://donorbox.org',
  requestHeight: { action: 'please-resize-me' },
  readHeight: readDonorboxHeight,
}
