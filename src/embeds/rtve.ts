import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, flashVars } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// `irtve.es` is the older spelling of the same broadcaster's asset domain and carries the
// Flash player under the same path.
const rtveHosts = ['rtve.es', 'irtve.es']

type Kind = 'audio' | 'video'

const safeAssetIdRegex = /^\d{4,12}$/

// The Flash player names its asset as `{id}_es_{audios|videos}`, in the swf query on the v2
// player and in the flashvars on the 4.x one. The language segment varies with the site's
// locale and says nothing about the asset.
const flashAssetRegex = /^(\d{4,12})_[a-z]{2}_(audios|videos)$/

const flashPlayerPathRegex = /^\/swf\/.*\.swf$/i

// The modern player is `rtve.es/drmn/embed/{audio|video}/{id}/`. Checked live 2026-09-06 with a
// browser user agent: nine Flash-era asset ids from the corpus, dated 2008 to 2014, each answer
// 200 with the player and its title, and a fabricated id answers 404. Audio and video are two
// id spaces with one grammar, so the id carries the kind, which `rtve.es/api/{videos|audios}/
// {id}.json` needs to look the asset up. The poster and the short page url are per kind too:
// `img.rtve.es/v/{id}/` and `/v/{id}/` answer for a video id, `/a/{id}/` for an audio id, and
// each 404s for the other kind and for an invented id. No poster route exists for audio.
//
// The player has no shape of its own. It fills whatever box it gets, measured at 500 and 1000
// pixels wide and again in a portrait viewport, so neither a ratio nor a fixed height is
// measurable and the box is the caller's. The `100/57.6` below is not a measurement: it is the
// arithmetic of RTVE's own share snippet, which pads a wrapper to 64% of its width and sets the
// frame to 90% of that. It stands only where the carrier declares nothing, which is 59 of the
// 71 iframe feeds in the census, since those size the frame through that wrapper. Where a
// carrier does state a box it wins, because the Flash video carriers state 425x239 in 42 of 47
// feeds and that is 16:9 to within 0.03%. Audio states no size at all and the carrier's bar
// stands.
const composeEmbed = (kind: Kind, id: string): EmbedResolverResult => {
  const result: EmbedResolverResult = {
    provider: 'rtve',
    id: `${kind}/${id}`,
    src: `https://www.rtve.es/drmn/embed/${kind}/${id}/`,
    url: `https://www.rtve.es/${kind === 'video' ? 'v' : 'a'}/${id}/`,
  }

  if (kind === 'video') {
    result.thumbnail = `https://img.rtve.es/v/${id}/`
    result.ratio = '100/57.6'
  }

  return result
}

export const rtveResolveEmbed = (
  link: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(link, rtveHosts)

  if (!parsed) {
    return
  }

  const [drmn, embed, kind, id] = getPathSegments(parsed)

  if (drmn !== 'drmn' || embed !== 'embed' || (kind !== 'audio' && kind !== 'video')) {
    return
  }

  if (!id || !safeAssetIdRegex.test(id)) {
    return
  }

  // RTVE's snippet writes the asset's title into `name` rather than `title`.
  const title = attr(element, 'title') ?? attr(element, 'name')

  return { ...composeEmbed(kind, id), title }
}

export const rtveIframeEmbedResolver = createUrlEmbedResolver(rtveHosts, rtveResolveEmbed)

export const rtveFlashResolveEmbed = (
  link: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const asset =
    parsed.searchParams.get('assetID') ??
    new URLSearchParams(flashVars(element) ?? '').get('assetID')
  const match = asset?.match(flashAssetRegex)

  if (!match) {
    return
  }

  // The 4.x snippet writes the asset's page link as the object's fallback, named after it.
  const title = element?.closest('object')?.querySelector(':scope > a')?.textContent?.trim()

  return { ...composeEmbed(match[2] === 'audios' ? 'audio' : 'video', match[1]), title }
}

export const rtveFlashEmbedResolver = createUrlEmbedResolver(rtveHosts, rtveFlashResolveEmbed)
