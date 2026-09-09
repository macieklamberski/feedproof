import type { Nullish } from 'trousse'
import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVars, keepIfMatches, paramValue } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'brightcove'

const safeIdRegex = /^\d+$/
const brightcoveIdRegex = /^\d{5,}$/
const accountScriptSelector = 'script[src*="players.brightcove.net"]'
const accountScriptRegex = /players\.brightcove\.net\/(\d+)\//

const readPlayerAccount = (element: Element): string | undefined => {
  const stated = attr(element, 'data-account')

  if (stated) {
    return stated
  }

  const loader = element.ownerDocument.querySelector(accountScriptSelector)

  return attr(loader, 'src')?.match(accountScriptRegex)?.[1]
}

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

  return keepIfMatches(String(account), brightcoveIdRegex)
}

const composePlayerUrl = (
  account: string,
  videoId: string,
  player = 'default',
  embed = 'default',
): string => {
  const segment = `${encodeURIComponent(player)}_${encodeURIComponent(embed)}`

  return `https://players.brightcove.net/${account}/${segment}/index.html?videoId=${videoId}`
}

// Brightcove's in-page embed: a bare <video-js> or video element only its loader script fills.
export const brightcoveVideoJsEmbedResolver = createMarkupEmbedResolver(
  'video-js[data-video-id], video[data-video-id]',
  (element) => {
    if (element.querySelector('source') || attr(element, 'src')) {
      return
    }

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
export const brightcoveFlashEmbedResolver = createUrlEmbedResolver(
  ['brightcove.com'],
  brightcoveFlashResolveEmbed,
)

// The BrightcoveExperience object, configured by <param>s, whose loader host no longer resolves.
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

  if (!safeIdRegex.test(account) || !playerPathRegex.test(player)) {
    return
  }

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

export const brightcoveRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: 'true' },
}
