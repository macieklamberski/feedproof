import type { Nullish } from 'trousse'
import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVars, keepIfMatches, paramValue } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'brightcove'

const safeIdRegex = /^\d+$/
// The minimum length is the only check on the id: `AQ~~` decodes to the number 1.
// A real Brightcove id runs to ten digits and more.
const brightcoveIdRegex = /^\d{5,}$/
const accountScriptSelector = 'script[src*="players.brightcove.net"]'
const accountScriptRegex = /players\.brightcove\.net\/(\d+)\//

// Some plugins leave the account out of `data-account` and only in the loader script's url.
const readPlayerAccount = (element: Element): string | undefined => {
  const stated = attr(element, 'data-account')

  if (stated) {
    return stated
  }

  const loader = element.ownerDocument.querySelector(accountScriptSelector)

  return attr(loader, 'src')?.match(accountScriptRegex)?.[1]
}

// The account is in the `playerKey`: its middle comma-separated segment is the id as big-endian
// bytes in a base64 alphabet using `-`, `_` and either `~` or `.` for `+`, `/` and `=`.
const readPlayerKeyAccount = (key: Nullish<string>): string | undefined => {
  const encoded = key?.split(',')[1]

  if (!encoded) {
    return
  }

  let bytes: string

  try {
    // The key's base64 pads with either `~` or `.`.
    bytes = atob(
      encoded.replaceAll('-', '+').replaceAll('_', '/').replaceAll('~', '=').replaceAll('.', '='),
    )
  } catch {
    return
  }

  let account = 0n

  for (const byte of bytes) {
    account = account * 256n + BigInt(byte.charCodeAt(0))
  }

  // Any base64 that decodes at all yields a number here, so the floor is what separates a real
  // account from a segment that is not one: `AQ~~` decodes to the single byte 1.
  return keepIfMatches(String(account), brightcoveIdRegex)
}

// The playback API is `/playback/v1/accounts/{account}/videos/{video}`, so a video id alone names
// nothing. A fabricated account 404s on the player host, and a wrong video id still serves a shell.
const composePlayerUrl = (
  account: string,
  videoId: string,
  player = 'default',
  embed = 'default',
): string => {
  // Unescaped, `data-player="../../999999/stolen"` names another account's player.
  const segment = `${encodeURIComponent(player)}_${encodeURIComponent(embed)}`

  return `https://players.brightcove.net/${account}/${segment}/index.html?videoId=${videoId}`
}

// Brightcove's in-page embed: a bare <video-js> or video element only its loader script fills.
// Brightcove has no public watch page.
export const brightcoveVideoJsEmbedResolver = createMarkupEmbedResolver(
  'video-js[data-video-id], video[data-video-id]',
  (element) => {
    // The older syntax puts the same attributes on a `<video class="video-js">`. Empty, it
    // renders as a blank video element, so the episode is lost the same way. One carrying a
    // real file is a working video and stays one: the placeholder would be a downgrade.
    if (element.querySelector('source') || attr(element, 'src')) {
      return
    }

    // Video.js is a library anyone can use, and `data-video-id` is not a name only Brightcove
    // could have chosen, so the id shape is all this carrier has to go on. The inference is safe
    // in practice too: nearly every feed carrying the element also ships the loader script.
    const videoId = keepIfMatches(attr(element, 'data-video-id'), brightcoveIdRegex)
    const account = videoId
      ? keepIfMatches(readPlayerAccount(element), brightcoveIdRegex)
      : undefined

    if (!videoId || !account) {
      return
    }

    return {
      provider,
      id: `${account}/${videoId}`,
      src: composePlayerUrl(
        account,
        videoId,
        attr(element, 'data-player'),
        attr(element, 'data-embed'),
      ),
    }
  },
)

const federatedPathRegex = /\/services\/viewer\/federated_/

// The account sits in the url as `publisherID` and the video id in `flashVars`. The federated
// player id in the path is not a modern player id.
const brightcoveFlashResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(src, placeholderBaseUrl)

  if (!parsed || !federatedPathRegex.test(parsed.pathname)) {
    return
  }

  const config = flashVars(element)
  const params = config ? new URLSearchParams(config) : undefined
  // `videoId` is the older spelling of `@videoPlayer`, and a few embeds put the flashVars set in
  // the url query.
  const videoId = keepIfMatches(
    params?.get('@videoPlayer') ??
      parsed.searchParams.get('@videoPlayer') ??
      params?.get('videoId') ??
      parsed.searchParams.get('videoId'),
    safeIdRegex,
  )
  const account = keepIfMatches(
    parsed.searchParams.get('publisherID') ??
      params?.get('publisherID') ??
      readPlayerKeyAccount(params?.get('playerKey')),
    safeIdRegex,
  )

  if (!videoId || !account) {
    return
  }

  return {
    provider,
    id: `${account}/${videoId}`,
    src: composePlayerUrl(account, videoId),
  }
}

// The Flash-era federated player on c.brightcove.com, whose hosts no longer resolve.
// The legacy player lives on brightcove.com and the modern one on brightcove.net.
export const brightcoveFlashEmbedResolver = createUrlEmbedResolver(
  ['brightcove.com'],
  brightcoveFlashResolveEmbed,
)

// The BrightcoveExperience object, configured by <param>s, whose loader host no longer resolves.
// A snippet carrying a player but no `@videoPlayer` is a channel or playlist player.
export const brightcoveExperienceEmbedResolver = createMarkupEmbedResolver(
  'object.BrightcoveExperience',
  (element) => {
    const videoId = keepIfMatches(paramValue(element, '@videoplayer'), safeIdRegex)
    const account = videoId
      ? keepIfMatches(readPlayerKeyAccount(paramValue(element, 'playerkey')), safeIdRegex)
      : undefined

    if (!videoId || !account) {
      return
    }

    return {
      provider,
      id: `${account}/${videoId}`,
      src: composePlayerUrl(account, videoId),
    }
  },
)

// A {player}_{embed} segment.
const playerPathRegex = /^([^_]+)_(.+)$/

// The players.brightcove.net player page as an ordinary iframe.
export const brightcoveResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url, placeholderBaseUrl)

  if (!parsed?.hostname.startsWith('players.')) {
    return
  }

  const [account, player] = getPathSegments(parsed)
  const videoId = parsed.searchParams.get('videoId')

  if (!account || !player || !videoId) {
    return
  }

  // `{player}_{embed}` is one segment holding two ids. A segment shaped otherwise is not a
  // player path.
  if (!safeIdRegex.test(account) || !playerPathRegex.test(player)) {
    return
  }

  // A reference id names the video for the account's own api, not the player, the same
  // exclusion the Flash form makes.
  if (!safeIdRegex.test(videoId)) {
    return
  }

  return {
    provider,
    id: `${account}/${videoId}`,
    src: `https://players.brightcove.net/${account}/${player}/index.html?videoId=${videoId}`,
  }
}

export const brightcoveIframeEmbedResolver = createUrlEmbedResolver(
  ['brightcove.net'],
  brightcoveResolveEmbed,
)

// Starts playback on the click that loads the player, which sets `playsinline` on its own.
// Never `autoplay=muted` or `autoplay=any`, which mute.
export const brightcoveRenderHint: EmbedRenderHint = {
  provider,
  // Never `muted` or `any`, which mute.
  autoplayParams: { autoplay: 'true' },
}
