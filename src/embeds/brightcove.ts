import type { Nullish } from 'trousse'
import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, flashVars, keepIfMatches, paramValue } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'brightcove'

// Brightcove builds its player page from four ids the in-page embed carries as attributes. The
// account is usually one of them, but some plugins leave it only in the loader script's url, so
// both places are read here instead of by whoever holds the element.
//
// The script lookup spans the whole document, so two players from two accounts would both take
// the first account. In practice the rare feeds carrying a `data-video-id` element with no
// `data-account` ship no loader script at all, so nothing has reached that branch.
//
// Every resolver here states its id as `{account}/{videoId}`. A video id on its own names
// nothing: the playback API is `/playback/v1/accounts/{account}/videos/{video}`, and the
// account is the half that discriminates, since a fabricated one 404s on the player host
// while a wrong video id still serves the same shell.
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

// Every legacy carrier names its player and its video, and almost none of them names the
// account, which is the one id the modern player url needs. The account is in the `playerKey`
// all the same: its middle comma-separated segment is the id as big-endian bytes in a base64
// alphabet using `-`, `_` and either `~` or `.` for `+`, `/` and `=`. Verified live 2026-09-06
// by decoding keys out of corpus flashVars and asking Brightcove's own playback API for the
// video id that sat beside them: five of twenty answered with the video's real title, and every
// fabricated account 404s on the player host.
const readPlayerKeyAccount = (key: Nullish<string>): string | undefined => {
  const encoded = key?.split(',')[1]

  if (!encoded) {
    return
  }

  let bytes: string

  try {
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

  return String(account)
}

// The account and the video id are checked against `brightcoveIdRegex` before they get here, but
// the player and the embed are whatever the element carried, so they are encoded: unescaped,
// `data-player="../../999999/stolen"` names another account's player and `data-player="p?a=1"`
// moves the rest of the path into the query.
const composePlayerUrl = (
  account: string,
  videoId: string,
  player = 'default',
  embed = 'default',
): string => {
  const segment = `${encodeURIComponent(player)}_${encodeURIComponent(embed)}`

  return `https://players.brightcove.net/${account}/${segment}/index.html?videoId=${videoId}`
}

// Brightcove's in-page embed is a bare `<video-js>` that its loader script turns into a player,
// so a reader shows nothing: the element is empty and survives as an unknown tag. The older
// syntax is a `<video class="video-js">` carrying the identical attributes, which renders as an
// empty video element instead: every feed that ships the loader with no `<video-js>` and no
// iframe is that form. Video.js is only the renderer here. The video is Brightcove's,
// named by id, which is why this lives with the rest of Brightcove rather than with the generic
// Video.js rebuild. Brightcove has no public watch page, so the placeholder carries no `url`.
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
    // could have chosen, so the ids have to look like Brightcove's before this mints a
    // Brightcove url from them. Both are long digit strings, the same test the other two
    // resolvers here apply. In practice the inference is safe anyway: nearly every feed
    // carrying this element also ships the `players.brightcove.net` loader script.
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

// The Flash player split the same two ids across two places: the account sits in the url as
// `publisherID`, and the video id in `flashVars`, either on the carrier itself or in a
// sibling `<param>`. The federated player id in the path is not a modern player id, so the
// minted url takes the account's default player, which is verified live: this shape answers
// 200 while a bogus account 404s.
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
  // A few embeds put the whole flashVars set in the url query instead. A reference id
  // (`ref:my-video`) names the video for the account's own API, not the player, so anything but
  // a numeric id is left to the generic placeholder. `videoId` is the older spelling of
  // `@videoPlayer` and is what most of the corpus's Flash carriers actually write.
  const videoId = keepIfMatches(
    params?.get('@videoPlayer') ??
      parsed.searchParams.get('@videoPlayer') ??
      params?.get('videoId') ??
      parsed.searchParams.get('videoId'),
    brightcoveIdRegex,
  )
  const account = keepIfMatches(
    parsed.searchParams.get('publisherID') ??
      params?.get('publisherID') ??
      readPlayerKeyAccount(params?.get('playerKey')),
    brightcoveIdRegex,
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

// The legacy player lives on brightcove.com. The modern one below is on brightcove.net.
export const brightcoveFlashEmbedResolver = createUrlEmbedResolver(
  ['brightcove.com'],
  brightcoveFlashResolveEmbed,
)

// The pre-iframe in-page embed: an `<object class="BrightcoveExperience">` whose whole
// configuration is `<param>` children, upgraded by `admin.brightcove.com/js/
// BrightcoveExperiences.js`. That loader builds its player on `c.brightcove.com` or
// `secure.brightcove.com`, and neither host has a DNS record any more, so the snippet renders
// nothing and always will. It is not even a carrier the census can see: the object states no
// url, and the ids live only in the params. The video is `@videoPlayer` and the account comes
// out of `playerKey`, which is what makes the modern player mintable from markup that names
// no host at all. A snippet carrying a player but no `@videoPlayer` is a channel or playlist
// player, and there is no single video to resolve it to.
export const brightcoveExperienceEmbedResolver = createMarkupEmbedResolver(
  'object.BrightcoveExperience',
  (element) => {
    const videoId = keepIfMatches(paramValue(element, '@videoplayer'), brightcoveIdRegex)
    const account = videoId
      ? keepIfMatches(readPlayerKeyAccount(paramValue(element, 'playerkey')), brightcoveIdRegex)
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

// The player page as an ordinary iframe, `players.brightcove.net/{account}/{player}_{embed}
// /index.html?videoId={id}`. It is the most common Brightcove carrier, more common than the
// `<video-js>` element, and unclaimed it falls through to the generic placeholder with no
// provider and no id.
//
// The account and video id are read back out, not the url passed through whole, because a
// player url carrying neither is not a video worth naming.
const playerPathRegex = /^([^_]+)_(.+)$/

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
  if (!brightcoveIdRegex.test(account) || !playerPathRegex.test(player)) {
    return
  }

  // A reference id names the video for the account's own api, not the player, the same
  // exclusion the Flash form makes.
  if (!brightcoveIdRegex.test(videoId)) {
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
  autoplayParams: { autoplay: 'true' },
}
