import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVar } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'cnn'

// The path of the video's page, `{section}/{yyyy}/{mm}/{dd}/{slug}.cnn`. The suffix keeps the
// other Turner properties on the same CDN out.
// Every player since the Flash one carries it, and the other Turner properties use numeric ids.
const videoIdRegex = /^(?:[a-z0-9-]+\/)+\d{4}\/\d{2}\/\d{2}\/[\w.-]+\.cnn$/

// The three segments in front of the slug date the video. A path states a day and not a moment,
// so `date` carries the calendar day alone, and a month or a day outside the calendar leaves it
// unstated.
const videoDateRegex = /\/(\d{4})\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/[^/]+$/

const readDate = (id: string): string | undefined => {
  const parts = id.match(videoDateRegex)

  return parts ? `${parts[1]}-${parts[2]}-${parts[3]}` : undefined
}

const cnnHosts = ['cnn.com', 'cnn.io']
const cdnHosts = ['cdn.turner.com']

// Safe only while the id shape refuses the `me{40 hex}` ids that name CNN's portrait clips.
// The fave shell is a `padding-bottom: 56.25%` box, and ids of this form have 16:9 renditions.
const playerRatio = '16/9'

// The player answers 200 for any id, but `fave.api.cnn.io/v1/video?id={id}&customer=cnn` answers
// with the headline, duration, renditions and posters for a real id and 404 for a fabricated one,
// and `cnn.com/videos/{id}` discriminates the same way.
const composeEmbed = (id: string): EmbedResolverResult => {
  return {
    provider,
    id,
    src: `https://fave.api.cnn.io/v1/fav/?video=${id}&customer=cnn&edition=domestic&env=prod`,
    url: `https://www.cnn.com/videos/${id}`,
    ratio: playerRatio,
    date: readDate(id),
  }
}

// The loader script and the 2014 iframe spell the id with a `/video/` prefix.
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

  return resolveVideoId(parsed.searchParams.get('videoId') ?? flashVar(element, 'videoId'))
}

// CNN's Flash player swf as an <embed> or an <object>, which no browser runs today.
// The swf carriers state the 416 by 374 box the old chrome made, not the clip's shape.
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
// The shell reads it as `autostart === 'true'` in `fave.api.cnn.io/js/lib/components/common.js`.
export const cnnRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autostart: 'true' },
}
