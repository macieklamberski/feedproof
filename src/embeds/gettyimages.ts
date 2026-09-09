import type { EmbedResolverResult } from '../types.js'
import { parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The asset id Getty calls `items`, and the opaque embed token it calls `et`.
const safeItemIdRegex = /^\d+$/
const embedPathRegex = /^\/embed\/(\d+)\/?$/

const gettyImagesHosts = ['gettyimages.com']

type WidgetConfig = {
  items: string
  et: string
  sig: string
  tld: string
  caption: string
  width?: number
  height?: number
}

const gettyImagesResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(link, gettyImagesHosts)
  const itemId = parsed?.pathname.match(embedPathRegex)?.[1]

  if (!itemId || !safeItemIdRegex.test(itemId)) {
    return
  }

  return {
    provider: 'gettyimages',
    // `embed.gettyimages.com/oembed?url=http://gty.im/{items}` answers title, caption,
    // photographer, collection and a thumbnail with no key, and 404s on an invented id.
    id: itemId,
    // Kept whole: without its `et` and `sig` the player answers 400.
    src: link,
    url: `https://www.gettyimages.com/detail/${itemId}`,
  }
}

// Getty's player iframe, `embed.gettyimages.com/embed/{id}` signed for one publisher in its query.
export const gettyImagesEmbedResolver = createUrlEmbedResolver(
  gettyImagesHosts,
  gettyImagesResolveEmbed,
)

// The config is a JavaScript object literal, not JSON, with unquoted keys and free spacing around
// the values, `caption: true ,`.
const readConfigValue = (source: string, key: string): string | undefined => {
  return source.match(new RegExp(`\\b${key}\\s*:\\s*'([^']*)'`))?.[1]
}

const readConfigFlag = (source: string, key: string): string | undefined => {
  return source.match(new RegExp(`\\b${key}\\s*:\\s*(true|false)\\b`))?.[1]
}

// What `rebuildGettyImagesEmbeds` needs out of a `gie.widgets.load({...})` call. Exported for
// that transform alone: the platform's url shape is spelled here, never in the transform.
// The `gie` widget is an `<a class="gie-single">` beside an inline `<script>` holding the config.
export const readWidgetConfig = (source: string): WidgetConfig | undefined => {
  const items = readConfigValue(source, 'items')
  // The config spells the embed token `id`, and the player url spells it `et`.
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

// The signature is bound to the item: a config's own url answers 200, and the same url carrying
// another specimen's signature 400. Signatures do not appear to expire.
export const composeWidgetEmbedUrl = (config: WidgetConfig): string => {
  const query = new URLSearchParams({
    et: config.et,
    tld: config.tld,
    sig: config.sig,
    caption: config.caption,
  })

  return `https://embed.gettyimages.com/embed/${config.items}?${query}`
}
