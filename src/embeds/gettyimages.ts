import type { EmbedResolverResult } from '../types.js'
import { parsePixelSize } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

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
    id: itemId,
    src: link,
    url: `https://www.gettyimages.com/detail/${itemId}`,
  }
}

// Getty's player iframe, `embed.gettyimages.com/embed/{id}` signed for one publisher in its query.
export const gettyImagesEmbedResolver = createUrlEmbedResolver(
  gettyImagesHosts,
  gettyImagesResolveEmbed,
)

const readConfigValue = (source: string, key: string): string | undefined => {
  return source.match(new RegExp(`\\b${key}\\s*:\\s*'([^']*)'`))?.[1]
}

const readConfigFlag = (source: string, key: string): string | undefined => {
  return source.match(new RegExp(`\\b${key}\\s*:\\s*(true|false)\\b`))?.[1]
}

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

export const composeWidgetEmbedUrl = (config: WidgetConfig): string => {
  const query = new URLSearchParams({
    et: config.et,
    tld: config.tld,
    sig: config.sig,
    caption: config.caption,
  })

  return `https://embed.gettyimages.com/embed/${config.items}?${query}`
}
