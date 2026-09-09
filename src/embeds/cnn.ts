import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVars } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'cnn'

// The path of the video's page, `{section}/{yyyy}/{mm}/{dd}/{slug}.cnn`.
const videoIdRegex = /^(?:[a-z0-9-]+\/)+\d{4}\/\d{2}\/\d{2}\/[\w.-]+\.cnn$/

const cnnHosts = ['cnn.com', 'cnn.io']
const cdnHosts = ['cdn.turner.com']

const playerRatio = '16/9'

const composeEmbed = (id: string): EmbedResolverResult => {
  return {
    provider,
    id,
    src: `https://fave.api.cnn.io/v1/fav/?video=${id}&customer=cnn&edition=domestic&env=prod`,
    url: `https://www.cnn.com/videos/${id}`,
    ratio: playerRatio,
  }
}

const videoPrefixRegex = /^\/?video\//

const resolveVideoId = (value: string | null | undefined): EmbedResolverResult | undefined => {
  const id = value?.replace(videoPrefixRegex, '')

  return id && videoIdRegex.test(id) ? composeEmbed(id) : undefined
}

export const cnnResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, cnnHosts)

  if (parsed?.pathname === '/v1/fav/') {
    return resolveVideoId(parsed.searchParams.get('video'))
  }

  if (parsed?.pathname === '/video/api/embed.html') {
    return resolveVideoId(parsed.hash.slice(1))
  }

  if (parsed?.pathname === '/video/savp/evp/') {
    return resolveVideoId(parsed.searchParams.get('vid'))
  }
}

// CNN's player iframe: the fave one still serves, the 2014 and 2008 ones load nothing today.
export const cnnIframeEmbedResolver = createUrlEmbedResolver(cnnHosts, cnnResolveEmbed)

const flashPlayerPathRegex = /^\/cnn\/\.element\/apps\/cvp\/.*\.swf$/

export const cnnFlashResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, cdnHosts)

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const stated = new URLSearchParams(flashVars(element) ?? '').get('videoId')

  return resolveVideoId(parsed.searchParams.get('videoId') ?? stated)
}

// CNN's Flash player swf as an <embed> or an <object>, which no browser runs today.
export const cnnFlashEmbedResolver = createUrlEmbedResolver(cdnHosts, cnnFlashResolveEmbed, {
  preferResolverSize: true,
})

// CNN's 2009 share snippet: a loader script that is gone, beside a <noscript> link.
export const cnnScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="cdn.turner.com/cnn/.element/js/"][src*="/video/evp/module.js"]',
  (element) => {
    const parsed = parseUrlOnHosts(attr(element, 'src'), cdnHosts)

    return resolveVideoId(parsed?.searchParams.get('vid'))
  },
)

// Only the literal `autostart=true` starts playback: the player reads `1` as false.
export const cnnRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autostart: 'true' },
}
