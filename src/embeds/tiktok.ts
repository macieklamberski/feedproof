import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, keepIfMatches, parsePixelSize, text, textNode } from '../utils/dom.js'
import * as styles from '../utils/styles.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { atUsername, createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const tiktokHosts = ['tiktok.com']

// A handle is the character set TikTok allows at signup. The signup form's 24-character ceiling
// is a rule about who can pick a name, not about what the namespace holds.
const safeHandleRegex = /^[a-zA-Z0-9_.]+$/
const safeVideoIdRegex = /^\d+$/

// Every player url TikTok has issued frames the clip by its numeric id: `/embed/{id}` and
// `/embed/v2/{id}` from the oEmbed loader's eras, `/player/v1/{id}` from the current player.
// All three still serve (probed 2026-08-15; both embed paths answer 400 on a fabricated id).
const playerPathRegex = /^\/(?:embed(?:\/v2)?|player\/v1)\/(\d+)\/?$/

// A watch url names the clip's owner and the clip: `/@handle/video/{id}`. Sanitized copies
// sometimes keep only the `/video/{id}` half, so the handle is optional.
const watchPathRegex = /^(?:\/@([a-zA-Z0-9_.]+))?\/video\/(\d+)\/?$/

// Not a 9/16 ratio: the frame stays 738 tall at any width, and the ratio asks 1778 at 1000.
// The clip is letterboxed inside a frame whose header, caption, sound row and action rail set
// the height. TikTok's own oEmbed answers 739 for the same clip.
const playerHeight = 738

type Clip = { handle?: string; videoId?: string }

const readWatchUrl = (url: string | undefined): Clip => {
  const parsed = parseUrlOnHosts(url, tiktokHosts)

  if (!parsed) {
    return {}
  }

  const [, handle, videoId] = parsed.pathname.match(watchPathRegex) ?? []

  return { handle, videoId }
}

const clipSize = (element: Element): { width?: number; height: number } => {
  const { width, height } = hydratedSize(element)

  return height ? { width, height } : { height: playerHeight }
}

// A blockquote declares only `max-width` and `min-width`, never a height. Where a CMS stored the
// page after `embed.js` ran, the hydrated iframe keeps the height it rendered at in its inline
// style.
const hydratedSize = (element: Element): { width?: number; height?: number } => {
  // The stored iframe is matched by the same player paths the direct carrier resolver claims,
  // so a hydrated copy keeps its measurement whichever player url the CMS wrote.
  const frame = find(element, 'iframe[src]', (iframe) => {
    const parsed = parseUrlOnHosts(attr(iframe, 'src'), tiktokHosts)

    return Boolean(parsed && playerPathRegex.test(parsed.pathname))
  })
  const height = parsePixelSize(styles.pixels(frame, 'height'))

  if (!height) {
    return {}
  }

  // The iframe is `width: 100%` inside the blockquote's own `max-width`, so that box is the
  // width the height was measured against.
  const width = parsePixelSize(styles.pixels(element, 'max-width'))

  return width ? { width, height } : {}
}

const resolveClip = (element: Element): EmbedResolverResult | undefined => {
  const declared = attr(element, 'data-video-id')
  const cite = attr(element, 'cite')
  const cited = readWatchUrl(cite)

  let linked: Clip = {}

  for (const anchor of element.querySelectorAll('a[href]')) {
    const clip = readWatchUrl(attr(anchor, 'href'))

    if (clip.videoId) {
      linked = clip
      break
    }
  }

  // Sanitizers empty or strip `data-video-id` while leaving the cite or a caption link intact.
  const declaredId = keepIfMatches(declared, safeVideoIdRegex)
  const videoId = declaredId ?? cited.videoId ?? linked.videoId

  if (!videoId) {
    return
  }

  const author = text(
    find(element, 'section a', (anchor) => text(anchor)?.startsWith('@') === true),
  )
  const caption = find(element, 'section p', (paragraph) => {
    const value = text(paragraph)

    return Boolean(value && value !== author && !value.startsWith('♬'))
  })

  const authorHandle = author?.slice(1)
  const handle = cited.handle ?? linked.handle ?? keepIfMatches(authorHandle, safeHandleRegex)

  // The watch page is the path the id already spells, so it is mintable from the same two halves
  // wherever a handle survives: a blockquote whose only source is a body anchor names both. The
  // cite comes first where it still names the clip, since that is the url the publisher wrote.
  const watchPath = handle ? `@${handle}/video/${videoId}` : undefined

  return {
    provider: 'tiktok',
    // TikTok's oEmbed endpoint takes the watch url, which needs the handle beside the video id.
    id: watchPath ?? videoId,
    src: `https://www.tiktok.com/embed/v2/${videoId}`,
    // A sanitized cite is truncated to the bare host, which links nothing worth keeping.
    url: cited.videoId ? cite : watchPath && `https://www.tiktok.com/${watchPath}`,
    description: text(caption),
    author,
    ...clipSize(element),
  }
}

// A profile url and nothing else: `/@handle`, with no video segment after it.
const profilePathRegex = /^\/@([a-zA-Z0-9_.]+)\/?$/

// The account a blockquote names, from `data-unique-id` where the creator widget declares it,
// otherwise from the profile anchor. The half-encoded shape keeps no data attributes at all,
// so that anchor is the only place the account survives.
const readHandle = (element: Element): string | undefined => {
  const declared = attr(element, 'data-unique-id')

  if (declared && safeHandleRegex.test(declared)) {
    return declared
  }

  for (const anchor of element.querySelectorAll('a[href]')) {
    const parsed = parseUrlOnHosts(attr(anchor, 'href'), tiktokHosts)

    if (parsed) {
      const handle = parsed.pathname.match(profilePathRegex)?.[1]

      if (handle) {
        return handle
      }
    }
  }
}

const resolveAccount = (element: Element): EmbedResolverResult | undefined => {
  const handle = readHandle(element)

  if (!handle) {
    return
  }

  const cite = attr(element, 'cite')
  const isCitedProfile = Boolean(cite && parseUrlOnHosts(cite, tiktokHosts))

  return {
    provider: 'tiktok',
    id: atUsername(handle),
    src: `https://www.tiktok.com/embed/@${handle}`,
    url: isCitedProfile ? cite : `https://www.tiktok.com/@${handle}`,
    author: atUsername(handle),
    description: textNode(element),
  }
}

// TikTok's oEmbed blockquote: caption and hashtag anchors that only embed.js turns into a player.
export const tiktokBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.tiktok-embed',
  (element) => resolveClip(element) ?? resolveAccount(element),
  // A blockquote that states a box states the snippet's landscape one, 560x400 in the wild, on a
  // player taller than it is wide.
  { preferResolverSize: true },
)

// A pasted TikTok player iframe, or a frame of the watch page, which refuses framing.
export const tiktokIframeEmbedResolver = createUrlEmbedResolver(
  tiktokHosts,
  (src) => {
    const parsed = parseUrl(src, placeholderBaseUrl)
    const playerId = parsed?.pathname.match(playerPathRegex)?.[1]

    if (playerId) {
      return {
        provider: 'tiktok',
        id: playerId,
        src,
        height: playerHeight,
      }
    }

    const { handle, videoId } = readWatchUrl(src)

    if (!videoId) {
      return
    }

    return {
      provider: 'tiktok',
      id: handle ? `@${handle}/video/${videoId}` : videoId,
      src: `https://www.tiktok.com/embed/v2/${videoId}`,
      url: src,
      height: playerHeight,
    }
  },
  // The pasted snippets state a landscape box, 560x400 in the wild, on a player taller than wide.
  { preferResolverSize: true },
)
