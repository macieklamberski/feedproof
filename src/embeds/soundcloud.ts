import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, jsonAttr, text } from '../utils/dom.js'
import { isFileName, parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'soundcloud'

// api.soundcloud.com/{kind}/{id}, the id optionally spelled as the URN soundcloud:{kind}:{id}.
const referenceRegex =
  /api(?:-v2)?\.soundcloud\.com\/(tracks|playlists|users)\/(?:soundcloud(?::|%3A)\w+(?::|%3A))?(\d+)/i

const widgetPlayerUrl = 'https://w.soundcloud.com/player/'

const composeWidgetUrl = (target: string, secretToken?: string): string => {
  const query: Record<string, string> = { url: target }

  if (secretToken) {
    query.secret_token = secretToken
  }

  return `${widgetPlayerUrl}?${new URLSearchParams(query)}`
}

const userCollectionSegments = new Set([
  'albums',
  'comments',
  'favorites',
  'followers',
  'following',
  'groups',
  'likes',
  'popular-tracks',
  'reposts',
  'spotlight',
  'tracks',
])

const streamPathRegex = /^\/stream\/(\d+)-/

const sitePathSegments = new Set([
  'charts',
  'discover',
  'feed',
  'imprint',
  'messages',
  'notifications',
  'pages',
  'people',
  'search',
  'settings',
  'signin',
  'stations',
  'stream',
  'tags',
  'upload',
  'you',
])

const readPageKind = (segments: Array<string>): string | undefined => {
  if (isFileName(segments[segments.length - 1] ?? '')) {
    return
  }

  if (sitePathSegments.has(segments[0] ?? '')) {
    return
  }

  if (segments.length === 1) {
    return 'users'
  }

  if (segments[1] === 'sets') {
    return 'playlists'
  }

  if (segments.length === 2) {
    return userCollectionSegments.has(segments[1]) ? 'users' : 'tracks'
  }
}

const secretTokenRegex = /^s-[\w-]+$/

const pageHostRegex = /^(?:www\.|m\.)?soundcloud\.com$/

const flashPlayerHostRegex = /^player\./

const shortLinkHostRegex = /^on\./

const visualPlayerHeight = 450
const classicPlayerHeights: Record<string, number | undefined> = {
  tracks: 166,
  playlists: 450,
  users: 450,
}

const soundcloudHosts = ['soundcloud.com']

type SubstackTrackAttributes = {
  title?: string
  description?: string
  thumbnail_url?: string
  author_name?: string
  targetUrl?: string
}

const readSubstackTrack = (element: Element): Partial<EmbedResolverResult> | undefined => {
  const wrapper = element.closest('[data-component-name="SoundcloudToDOM"]')
  const attributes = jsonAttr<SubstackTrackAttributes>(wrapper, 'data-attrs')

  if (!attributes) {
    return
  }

  return trimObject(
    {
      title: attributes.title,
      description: attributes.description,
      thumbnail: attributes.thumbnail_url,
      author: attributes.author_name,
      url: attributes.targetUrl,
    },
    Boolean,
  )
}

// SoundCloud's widget iframe, the dead Flash player and a framed track page answering SAMEORIGIN.
export const soundcloudResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(src, placeholderBaseUrl)
  const params = parsed?.searchParams
  const inner = params?.get('url')
  const reference = inner?.match(referenceRegex)
  const streamTrackId = parsed?.pathname.match(streamPathRegex)?.[1]
  const result: EmbedResolverResult = { provider, src }

  if (reference) {
    result.id = `${reference[1]}/${reference[2]}`
  } else if (streamTrackId) {
    result.id = `tracks/${streamTrackId}`
    result.src = composeWidgetUrl(`https://api.soundcloud.com/tracks/${streamTrackId}`)
  }

  const page =
    reference || streamTrackId ? undefined : parseUrlOnHosts(inner ?? src, soundcloudHosts)
  const shortLink = page && shortLinkHostRegex.test(page.hostname) ? page : undefined
  const pageSegments = page && pageHostRegex.test(page.hostname) ? getPathSegments(page) : []
  const secretToken = pageSegments.find((segment) => secretTokenRegex.test(segment))
  const permalink = pageSegments.filter((segment) => segment !== secretToken)
  const pageKind = readPageKind(permalink)

  if (pageKind) {
    result.url = `https://soundcloud.com/${permalink.join('/')}`

    if (!inner) {
      result.src = composeWidgetUrl(result.url, secretToken)
    }
  } else if (shortLink && !inner) {
    result.src = composeWidgetUrl(shortLink.href)
  }

  if (flashPlayerHostRegex.test(parsed?.hostname ?? '')) {
    if (!inner) {
      return
    }

    result.src = composeWidgetUrl(inner)
  }

  if (!result.id && !pageKind && isFileName(parsed?.pathname ?? '')) {
    return
  }

  const height =
    params?.get('visual') === 'true'
      ? visualPlayerHeight
      : classicPlayerHeights[reference?.[1] ?? (streamTrackId && 'tracks') ?? pageKind ?? '']

  if (height) {
    result.height = height
  }

  const title = attr(element, 'title')

  if (title) {
    result.title = title
  }

  Object.assign(result, readSubstackTrack(element))

  const sibling = element.nextElementSibling
  const anchors = Array.from(sibling?.querySelectorAll('a[href]') ?? []).filter((anchor) => {
    const page = parseUrlOnHosts(attr(anchor, 'href'), soundcloudHosts)

    return page && pageHostRegex.test(page.hostname)
  })

  if (anchors.length === 2) {
    result.author = text(anchors[0])
    result.title = text(anchors[1]) ?? result.title
    result.url = attr(anchors[1], 'href')
    sibling?.remove()
  }

  return result
}

export const soundcloudEmbedResolver = createUrlEmbedResolver(
  soundcloudHosts,
  soundcloudResolveEmbed,
)

export const soundcloudRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { auto_play: 'true' },
}
