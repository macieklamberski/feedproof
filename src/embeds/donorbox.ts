import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'donorbox'

const donorboxHosts = ['donorbox.org']

const slugRegex = /^[\w-]+$/

const formHeight = 900

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
    src: url,
    url: `https://donorbox.org/${slug}`,
    height: formHeight,
  }
}

// Donorbox's donation form iframe, sized by a loader script that feeds strip.
export const donorboxEmbedResolver = createUrlEmbedResolver(donorboxHosts, donorboxResolveEmbed)

export const readDonorboxHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.from === 'dbox' ? readPixels(data.height) : undefined
}

export const donorboxRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://donorbox.org',
  requestHeight: { action: 'please-resize-me' },
  readHeight: readDonorboxHeight,
}
