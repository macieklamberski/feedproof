import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'kaltura'

// An entry id is a namespace counter, an underscore and lowercase letters or digits,
// `1_w0bwzism`. The shape is what makes it safe to mint into the thumbnail path. Neither half
// carries a width, because that would refuse the next id space.
const safeEntryIdRegex = /^\d+_[a-z0-9]+$/
const partnerPathRegex = /^\/p\/(\d+)\//

const kalturaHost = 'kaltura.com'

// The SaaS hosts all serve the thumbnail route from `cdnapisec.kaltura.com`; a regional API
// host (`api.ca.kaltura.com`) serves it only itself, so the carrier's host is kept there.
const saasHosts = new Set(['kaltura.com', 'www.kaltura.com', 'cdnapi.kaltura.com'])

// The parameters the auto-embed script takes for itself: the div it writes into and the box it
// gives the iframe. The player options in `flashvars[…]` travel with the rebuilt url.
const scriptOnlyParams = ['autoembed', 'playerId', 'cache_st', 'width', 'height']

// The label a generated Kaltura iframe carries in place of the video's name.
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
  // A regional host serves its thumbnails itself, so the carrier's host is kept there.
  const thumbnailHost = saasHosts.has(parsed.hostname) ? 'cdnapisec.kaltura.com' : parsed.hostname

  return {
    provider,
    // Title and metadata sit behind a session key.
    id: `${partner}/${entryId}`,
    src,
    // The poster answers 200 `image/jpeg` for a real entry, 404 for an invented or a deleted one.
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
// The Flash-era `index.php/kwidget/…` and `extwidget/embedIframe/…` routes have lost their
// player libraries, and the entry alone does not mint a working player.
export const kalturaIframeEmbedResolver = createUrlEmbedResolver([kalturaHost], kalturaResolveEmbed)

// Kaltura's auto-embed script, which writes the iframe into an empty div at load time. Feeds strip
// the script, and the emptied div dies as an empty tag with the video.
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

    // The same url with `iframeembed=true` for `autoembed=true` is the iframe the script writes.
    src.searchParams.set('iframeembed', 'true')

    const result = composeEmbed(entry, src.toString())

    return width && height ? { ...result, width, height } : result
  },
)

export const kalturaRenderHint: EmbedRenderHint = {
  provider,
  // The player reads its options from the `flashvars[...]` namespace, not a bare `autoPlay`.
  // Out of a url the key reads `flashvars%5BautoPlay%5D`.
  autoplayParams: { 'flashvars[autoPlay]': 'true' },
}
