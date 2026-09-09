import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'kaltura'

const safeEntryIdRegex = /^\d+_[a-z0-9]+$/
const partnerPathRegex = /^\/p\/(\d+)\//

const kalturaHost = 'kaltura.com'

const saasHosts = new Set(['kaltura.com', 'www.kaltura.com', 'cdnapi.kaltura.com'])

const scriptOnlyParams = ['autoembed', 'playerId', 'cache_st', 'width', 'height']

const boilerplateTitle = 'Kaltura Player'

type Entry = {
  partner: string
  entryId: string
  parsed: URL
}

const readEntry = (url: string | undefined): Entry | undefined => {
  const parsed = parseUrlOnHosts(url, kalturaHost)
  const partner = parsed?.pathname.match(partnerPathRegex)?.[1]
  const entryId = keepIfMatches(parsed?.searchParams.get('entry_id'), safeEntryIdRegex)

  return parsed && partner && entryId ? { partner, entryId, parsed } : undefined
}

const composeEmbed = ({ partner, entryId, parsed }: Entry, src: string): EmbedResolverResult => {
  const thumbnailHost = saasHosts.has(parsed.hostname) ? 'cdnapisec.kaltura.com' : parsed.hostname

  return {
    provider,
    id: `${partner}/${entryId}`,
    src,
    thumbnail: `https://${thumbnailHost}/p/${partner}/thumbnail/entry_id/${entryId}/width/640`,
  }
}

export const kalturaResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const entry = readEntry(url)

  if (!entry) {
    return
  }

  const result = composeEmbed(entry, url)
  const title = attr(element, 'title')

  return title && title !== boilerplateTitle ? { ...result, title } : result
}

// Kaltura's embedIframeJs and embedPlaykitJs iframes, which render and only lack a poster.
export const kalturaIframeEmbedResolver = createUrlEmbedResolver([kalturaHost], kalturaResolveEmbed)

// Kaltura's auto-embed script, which writes the iframe into an empty div at load time.
export const kalturaScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="kaltura.com/p/"]',
  (element) => {
    const entry = readEntry(attr(element, 'src'))

    if (entry?.parsed.searchParams.get('autoembed') !== 'true') {
      return
    }

    const src = new URL(entry.parsed)
    const width = parsePixelSize(src.searchParams.get('width'))
    const height = parsePixelSize(src.searchParams.get('height'))

    for (const name of scriptOnlyParams) {
      src.searchParams.delete(name)
    }

    src.searchParams.set('iframeembed', 'true')

    const result = composeEmbed(entry, src.toString())

    return width && height ? { ...result, width, height } : result
  },
)

export const kalturaRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { 'flashvars[autoPlay]': 'true' },
}
