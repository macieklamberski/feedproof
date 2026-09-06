import type { EmbedResolverResult } from '../types.js'
import { attr, flashVars } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// CNN names a video by the path of its page, `{section}/{yyyy}/{mm}/{dd}/{slug}.cnn`, and every
// player it has shipped since the Flash one carries that path: the swf query's `videoId`, the
// loader script's `vid` (with a `/video/` prefix), the 2014 iframe's hash, and the current
// player's `video`. The `.cnn` suffix is part of the id and is what keeps the other Turner
// properties served from the same CDN (`/v5cache/TBS/`, numeric ids) out of it.
const videoIdRegex = /^(?:[a-z0-9-]+\/)+\d{4}\/\d{2}\/\d{2}\/[\w.-]+\.cnn$/

const cnnHosts = ['cnn.com', 'cnn.io']
const cdnHosts = ['cdn.turner.com']

// The current player is what a video page names in its `embedUrl` and the form publishers pasted
// from 2016 on. Checked live 2026-09-06 with a browser user agent: the page frames without
// framing headers and answers 200 for any id, but the API it loads the video from,
// `fave.api.cnn.io/v1/video?id={id}&customer=cnn&edition=domestic&env=prod`, answers 200 with
// the headline, duration, renditions and posters for a real id and 404 for a fabricated one.
// The page at `cnn.com/videos/{id}` discriminates the same way. Of 15 Flash-era ids read out of
// the corpus, dated 2008 to 2013, the 5 from 2011 on still serve and the older 10 answer 404.
//
// CNN's snippet sizes the player 416 by 234 and the API's posters are 640 by 360, both 16:9. The
// Flash carriers state the old player's box, 416 by 374 with its chrome, so the ratio is
// preferred over the carrier. Not measured in a browser, which refused the player's host.
const playerRatio = '16/9'

const composeEmbed = (id: string): EmbedResolverResult => {
  return {
    provider: 'cnn',
    id,
    src: `https://fave.api.cnn.io/v1/fav/?video=${id}&customer=cnn&edition=domestic&env=prod`,
    url: `https://www.cnn.com/videos/${id}`,
    ratio: playerRatio,
  }
}

// The loader script and the 2014 iframe spell the id with a `/video/` prefix.
const videoPrefixRegex = /^\/?video\//

const resolveVideoId = (value: string | null | undefined): EmbedResolverResult | undefined => {
  const id = value?.replace(videoPrefixRegex, '')

  return id && videoIdRegex.test(id) ? composeEmbed(id) : undefined
}

// The current player, `fave.api.cnn.io/v1/fav/?video={id}`, the 2014 one,
// `cnn.com/video/api/embed.html#/video/{id}`, and the 2008 one,
// `edition.cnn.com/video/savp/evp/?vid=/video/{id}`. Only the first still serves: the second
// loads nothing but jQuery today and the third answers 404, so both move onto the first.
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

export const cnnIframeEmbedResolver = createUrlEmbedResolver(cnnHosts, cnnResolveEmbed, {
  preferResolverSize: true,
})

// The Flash player, `i.cdn.turner.com/cnn/.element/apps/cvp/3.0/swf/{player}.swf?…&videoId={id}`,
// as an `<embed>` or an `<object>`. The id sits in the swf's own query on every specimen, and in
// `flashVars` on none, but the player read both so both are read here.
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

export const cnnFlashEmbedResolver = createUrlEmbedResolver(cdnHosts, cnnFlashResolveEmbed, {
  preferResolverSize: true,
})

// The 2009 share snippet: `i.cdn.turner.com/cnn/.element/js/2.0/video/evp/module.js?loc=dom&vid=
// /video/{id}` beside a `<noscript>` link to CNN Video. The script is gone, so the snippet
// renders the noscript link at best; the video itself is addressed by the id it carries.
export const cnnScriptEmbedResolver = createMarkupEmbedResolver(
  'script[src*="cdn.turner.com/cnn/.element/js/"][src*="/video/evp/module.js"]',
  (element) => {
    const parsed = parseUrlOnHosts(attr(element, 'src'), cdnHosts)

    return resolveVideoId(parsed?.searchParams.get('vid'))
  },
  { preferResolverSize: true },
)
