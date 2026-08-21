import type { EmbedResolverResult } from '../types.js'
import { parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The asset id Getty calls `items`, and the opaque embed token it calls `et`.
const safeItemIdRegex = /^\d{6,16}$/
const embedPathRegex = /^\/embed\/(\d+)\/?$/

const gettyImagesHost = 'gettyimages.com'

// Getty ships an embed two ways. 136 corpus feeds carry the player iframe, which renders on its
// own. The other 285 carry the `gie` widget: an `<a class="gie-single">` naming the photo page,
// an inline `<script>` holding the whole configuration, and a loader script. The widget never
// runs in a reader, so those feeds show a bare "Embed from Getty Images" link where the photo
// should be. That is a partial loss rather than a silent one, which is why this ranks below the
// carriers that vanish outright.
//
// The configuration is enough to rebuild the working player offline, verified live 2026-08-21:
// the url composed from a corpus specimen's own config answers 200, and the same url carrying a
// signature lifted from a different specimen answers 400. The signature is bound to the item, so
// the 200 means the photo and not a shell that greets anything. A specimen signature for a photo
// shot in October 2015 still answered 200, so these do not appear to expire.
//
// `embed.gettyimages.com/oembed?url=http://gty.im/{items}` answers title, caption, photographer,
// collection and a thumbnail with no key, and 404s on an invented id, so the enrichment key here
// has a real endpoint behind it. The thumbnail is signed, so it stays enrich-time.
type WidgetConfig = {
  items: string
  et: string
  sig: string
  tld: string
  caption: string
  width?: number
  height?: number
}

const composeEmbed = (itemId: string): EmbedResolverResult => {
  return {
    provider: 'gettyimages',
    id: itemId,
    src: `https://embed.gettyimages.com/embed/${itemId}`,
    url: `https://www.gettyimages.com/detail/${itemId}`,
  }
}

const gettyImagesResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(link, gettyImagesHost)
  const itemId = parsed?.pathname.match(embedPathRegex)?.[1]

  if (!itemId || !safeItemIdRegex.test(itemId)) {
    return
  }

  // The signature and the token select this publisher's rendering of the photo, so the carrier's
  // own query is kept whole rather than rebuilt: without them the player answers 400.
  return { ...composeEmbed(itemId), src: link }
}

export const gettyImagesEmbedResolver = createUrlEmbedResolver(
  [gettyImagesHost],
  gettyImagesResolveEmbed,
)

// Reads one key out of the widget config. The config is a JavaScript object literal rather than
// JSON, with unquoted keys and free spacing around the values (`caption: true ,`), so each field
// is read on its own instead of being parsed whole.
const readConfigValue = (source: string, key: string): string | undefined => {
  return source.match(new RegExp(`\\b${key}\\s*:\\s*'([^']*)'`))?.[1]
}

const readConfigFlag = (source: string, key: string): string | undefined => {
  return source.match(new RegExp(`\\b${key}\\s*:\\s*(true|false)\\b`))?.[1]
}

// What `rebuildGettyImagesEmbeds` needs out of a `gie.widgets.load({...})` call. Exported for
// that transform alone: the platform's url shape is spelled here, never in the transform.
export const readWidgetConfig = (source: string): WidgetConfig | undefined => {
  const items = readConfigValue(source, 'items')
  const et = readConfigValue(source, 'id')
  const sig = readConfigValue(source, 'sig')

  if (!items || !safeItemIdRegex.test(items) || !et || !sig) {
    return
  }

  return {
    items,
    et,
    sig,
    tld: readConfigValue(source, 'tld') ?? 'com',
    caption: readConfigFlag(source, 'caption') ?? 'false',
    width: parsePixelSize(readConfigValue(source, 'w')),
    height: parsePixelSize(readConfigValue(source, 'h')),
  }
}

export const composeWidgetEmbedUrl = (config: WidgetConfig): string => {
  const query = new URLSearchParams({
    et: config.et,
    tld: config.tld,
    sig: config.sig,
    caption: config.caption,
  })

  return `https://embed.gettyimages.com/embed/${config.items}?${query}`
}
