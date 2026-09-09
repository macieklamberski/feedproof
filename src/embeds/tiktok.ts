import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, keepIfMatches, parsePixelSize, text, textNode } from '../utils/dom.js'
import * as styles from '../utils/styles.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const tiktokHosts = ['tiktok.com']

const safeHandleRegex = /^[a-zA-Z0-9_.]+$/
const safeVideoIdRegex = /^\d+$/

const playerPathRegex = /^\/(?:embed(?:\/v2)?|player\/v1)\/(\d+)\/?$/

const watchPathRegex = /^(?:\/@([a-zA-Z0-9_.]+))?\/video\/(\d+)\/?$/

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

const hydratedSize = (element: Element): { width?: number; height?: number } => {
  const frame = find(element, 'iframe[src]', (iframe) => {
    const parsed = parseUrlOnHosts(attr(iframe, 'src'), tiktokHosts)

    return Boolean(parsed && playerPathRegex.test(parsed.pathname))
  })
  const height = parsePixelSize(styles.pixels(frame, 'height'))

  if (!height) {
    return {}
  }

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

  const watchPath = handle ? `@${handle}/video/${videoId}` : undefined

  return {
    provider: 'tiktok',
    id: watchPath ?? videoId,
    src: `https://www.tiktok.com/embed/v2/${videoId}`,
    url: cited.videoId ? cite : watchPath && `https://www.tiktok.com/${watchPath}`,
    description: text(caption),
    author,
    ...clipSize(element),
  }
}

const profilePathRegex = /^\/@([a-zA-Z0-9_.]+)\/?$/

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
    id: `@${handle}`,
    src: `https://www.tiktok.com/embed/@${handle}`,
    url: isCitedProfile ? cite : `https://www.tiktok.com/@${handle}`,
    author: `@${handle}`,
    description: textNode(element),
  }
}

// TikTok's oEmbed blockquote: caption and hashtag anchors that only embed.js turns into a player.
export const tiktokBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.tiktok-embed',
  (element) => resolveClip(element) ?? resolveAccount(element),
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
  { preferResolverSize: true },
)
