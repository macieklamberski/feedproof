import type { EmbedResolverResult } from '../types.js'
import { attr, keepIfMatches, parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// A Kaltura entry id is a partner-era digit, an underscore and eight letters or digits,
// `1_w0bwzism`. The partner is the number after `/p/` in every player url.
const safeEntryIdRegex = /^[01]_[a-z0-9]{8}$/
const partnerPathRegex = /^\/p\/(\d+)\//

const kalturaHost = 'kaltura.com'

// The SaaS hosts all serve the thumbnail route from `cdnapisec.kaltura.com`; a regional API
// host (`api.ca.kaltura.com`) serves it only itself, so the carrier's host is kept there.
const saasHosts = new Set(['kaltura.com', 'www.kaltura.com', 'cdnapi.kaltura.com'])

// The parameters the auto-embed script takes for itself: the div it writes into and the box it
// gives the iframe. The player options in `flashvars[…]` travel with the rebuilt url.
const scriptOnlyParams = ['autoembed', 'playerId', 'cache_st', 'width', 'height']

// KMS writes this label on every iframe it produces, so it never names the video.
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

// `/p/{partner}/thumbnail/entry_id/{entry}/width/640` is the poster, addressed by the two ids
// the player url already carries: 200 `image/jpeg` for 6 of 8 corpus entries, 404 for an
// invented one and for a deleted one (checked 2026-09-06). Title and metadata sit behind a
// session key, so the composite id is what a future enrichment would have to sign for.
const composeEmbed = ({ partner, entryId, parsed }: Entry, src: string): EmbedResolverResult => {
  const thumbnailHost = saasHosts.has(parsed.hostname) ? 'cdnapisec.kaltura.com' : parsed.hostname

  return {
    provider: 'kaltura',
    id: `${partner}/${entryId}`,
    src,
    thumbnail: `https://${thumbnailHost}/p/${partner}/thumbnail/entry_id/${entryId}/width/640`,
  }
}

// The iframe embed, `embedIframeJs/…?iframeembed=true&entry_id=` and the newer
// `embedPlaykitJs/…`, which both render already and only gain the provider, the id and the
// poster. The Flash-era `index.php/kwidget/…` and `extwidget/embedIframe/…` routes are not
// taken: their player libraries are gone and the entry alone does not mint a working player.
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

export const kalturaIframeEmbedResolver = createUrlEmbedResolver([kalturaHost], kalturaResolveEmbed)

// The auto-embed script, `<div id="kaltura_player_…"><script src="…?autoembed=true&entry_id=…
// &playerId=kaltura_player_…&width=560&height=395">`, writes the iframe into the div at load
// time. The script is stripped and the emptied div with it, so the video is deleted outright.
// The same url with `iframeembed=true` in place of `autoembed=true` is the iframe the script
// would have written (checked 2026-09-06), and the box it names is the one the publisher chose.
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
