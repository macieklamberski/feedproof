import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'donorbox'

const donorboxHosts = ['donorbox.org']

// A campaign slug as Donorbox writes it: one run of word characters and hyphens.
const slugRegex = /^[\w-]+$/

// 900 is what the later steps need, where the first step measures 733.
// Donorbox's own snippet reserves 900, and the form does not grow with its container.
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
    provider,
    id: slug,
    // The publisher's query picks the default interval, amount and meter.
    src: url,
    url: `https://donorbox.org/${slug}`,
    height: formHeight,
  }
}

// Donorbox's donation form iframe, sized by a loader script that feeds strip.
export const donorboxEmbedResolver = createUrlEmbedResolver(donorboxHosts, donorboxResolveEmbed)

// The form posts its rendered height unasked, as `{ from: 'dbox', src, height }`, and answers a
// posted `{ action: 'please-resize-me' }` with the same message.
export const readDonorboxHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.from === 'dbox' ? readPixels(data.height) : undefined
}

export const donorboxRenderHint: EmbedRenderHint = {
  provider,
  // Spelled out: a `www.` src 301s to the apex, so every message arrives from here.
  origin: 'https://donorbox.org',
  requestHeight: { action: 'please-resize-me' },
  readHeight: readDonorboxHeight,
}
