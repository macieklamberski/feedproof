import { getPathSegments, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import {
  createIframeEmbedResolver,
  embedCarrierSelector,
  readCarrierUrl,
} from '../utils/widgets.js'

// Brightcove's in-page embed is a bare `<video-js>` custom element that the loader script
// turns into a player, so a reader shows nothing at all: the element is empty and survives
// as an unknown tag. The player page is mintable from its attributes. The account id is
// usually on the element, but some plugins leave it only in the loader script's URL
// (`players.brightcove.net/{account}/…`), so that is the fallback. Brightcove has no public
// watch page, so the placeholder carries no `url` and anchors to the player src.
const accountScriptRegex = /players\.brightcove\.net\/(\d+)\//

export const brightcoveVideoJsEmbedResolver: EmbedResolver = {
  selector: 'video-js[data-video-id]',
  extract: (element): EmbedResolverResult | undefined => {
    const videoId = attr(element, 'data-video-id')

    if (!videoId) {
      return
    }

    const loader = element.ownerDocument.querySelector('script[src*="players.brightcove.net"]')
    const account =
      attr(element, 'data-account') ?? attr(loader, 'src')?.match(accountScriptRegex)?.[1]

    if (!account) {
      return
    }

    const player = attr(element, 'data-player') ?? 'default'
    const embed = attr(element, 'data-embed') ?? 'default'

    return {
      provider: 'brightcove',
      id: videoId,
      src: `https://players.brightcove.net/${account}/${player}_${embed}/index.html?videoId=${videoId}`,
    }
  },
}

// The Flash player split the same two ids across two places: the account sits in the url as
// `publisherID`, and the video id in `flashVars`, either on the carrier itself or in a
// sibling `<param>`. The federated player id in the path is not a modern player id, so the
// minted url takes the account's default player, which is verified live: this shape answers
// 200 while a bogus account 404s.
const federatedPathRegex = /\/services\/viewer\/federated_/
const brightcoveIdRegex = /^\d{5,}$/

const readFlashVars = (element: Element): URLSearchParams | undefined => {
  const own = attr(element, 'flashvars')

  if (own) {
    return new URLSearchParams(own)
  }

  const params = Array.from(element.parentElement?.querySelectorAll('param') ?? [])
  const flashVars = params.find((param) => attr(param, 'name')?.toLowerCase() === 'flashvars')

  return flashVars ? new URLSearchParams(attr(flashVars, 'value') ?? '') : undefined
}

export const brightcoveFlashEmbedResolver: EmbedResolver = {
  selector: embedCarrierSelector,
  extract: (element): EmbedResolverResult | undefined => {
    const parsed = parseUrl(readCarrierUrl(element), 'https://example.com')

    if (
      !parsed ||
      (!isHostOf(parsed, 'brightcove.com') && !isSubdomainOf(parsed, 'brightcove.com')) ||
      !federatedPathRegex.test(parsed.pathname)
    ) {
      return
    }

    const flashVars = readFlashVars(element)
    // A few embeds put the whole flashVars set in the url query instead.
    const videoId = flashVars?.get('@videoPlayer') ?? parsed.searchParams.get('@videoPlayer')
    const account = parsed.searchParams.get('publisherID') ?? flashVars?.get('publisherID')

    // A reference id (`ref:my-video`) names the video for the account's own API rather than
    // the player, so anything but a numeric id is left to the generic placeholder.
    if (
      !videoId ||
      !account ||
      !brightcoveIdRegex.test(videoId) ||
      !brightcoveIdRegex.test(account)
    ) {
      return
    }

    return {
      provider: 'brightcove',
      id: videoId,
      src: `https://players.brightcove.net/${account}/default_default/index.html?videoId=${videoId}`,
    }
  },
}

// The player page as an ordinary iframe, `players.brightcove.net/{account}/{player}_{embed}
// /index.html?videoId={id}`. It is the most common Brightcove carrier in the corpus at 243
// feeds, more than the `<video-js>` element, and until now it fell through to the generic
// placeholder with no provider and no id.
//
// The account and video id are read back out rather than the url passed through whole, because
// the pair is what an enricher would key on later, and because a player url carrying neither is
// not a video worth naming.
const playerPathRegex = /^([^_]+)_(.+)$/

export const brightcoveResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url, 'https://example.com')

  if (!parsed || !parsed.hostname.startsWith('players.')) {
    return
  }

  const [account, player] = getPathSegments(parsed)
  const videoId = parsed.searchParams.get('videoId')

  if (!account || !player || !videoId) {
    return
  }

  // `{player}_{embed}` is one segment holding two ids; a segment shaped otherwise is not a
  // player path.
  if (!brightcoveIdRegex.test(account) || !playerPathRegex.test(player)) {
    return
  }

  // A reference id names the video for the account's own api rather than the player, the same
  // exclusion the Flash form makes.
  if (!brightcoveIdRegex.test(videoId)) {
    return
  }

  return {
    provider: 'brightcove',
    id: videoId,
    src: `https://players.brightcove.net/${account}/${player}/index.html?videoId=${videoId}`,
  }
}

export const brightcoveIframeEmbedResolver = createIframeEmbedResolver(
  ['brightcove.net'],
  brightcoveResolveEmbed,
)
