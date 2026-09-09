import { isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, jsonAttr, parsePixelSize, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'instagram'

const instagramHosts = ['instagram.com', 'instagr.am']

const nonShortcodeSegments = new Set(['audio'])

const sitePathSegments = new Set([
  'about',
  'accounts',
  'api',
  'challenge',
  'developer',
  'direct',
  'explore',
  'legal',
  'share',
  'stories',
  'web',
])

const postPathRegex = /^\/(?:([A-Za-z0-9_.]+)\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/
const safeShortcodeRegex = /^[A-Za-z0-9_-]+$/

type Post = { kind: string; shortcode: string }

const readPostUrl = (value: string | undefined): Post | undefined => {
  const parsed = parseUrlOnHosts(value, instagramHosts)

  if (!parsed) {
    return
  }

  const match = parsed.pathname.match(postPathRegex)

  if (!match) {
    return
  }

  if (match[1] && sitePathSegments.has(match[1])) {
    return
  }

  if (nonShortcodeSegments.has(match[3])) {
    return
  }

  return { kind: match[2] === 'reels' ? 'reel' : match[2], shortcode: match[3] }
}

const composeEmbed = (
  post: Post,
  captioned: boolean,
  extra?: Partial<EmbedResolverResult>,
): EmbedResolverResult => {
  const path = `${post.kind}/${post.shortcode}`

  return {
    provider,
    id: path,
    src: `https://www.instagram.com/${path}/embed/${captioned ? 'captioned/' : ''}`,
    url: `https://www.instagram.com/${path}/`,
    ...extra,
  }
}

const wrapperSelector = 'figure[data-provider="instagram"]'

const decodeAttribute = (value: string | undefined): string | undefined => {
  if (!value) {
    return
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const readWrapper = (
  element: Element,
): { post?: Post; size: { width?: number; height?: number } } => {
  const figure = element.closest(wrapperSelector)

  if (!figure) {
    return { size: {} }
  }

  const width = parsePixelSize(attr(figure, 'data-orig-width'))
  const height = parsePixelSize(attr(figure, 'data-orig-height'))

  return {
    post: readPostUrl(decodeAttribute(attr(figure, 'data-url'))),
    size: width && height ? { width, height } : {},
  }
}

const findPost = (element: Element): Post | undefined => {
  const declared = readPostUrl(attr(element, 'data-instgrm-permalink'))

  if (declared) {
    return declared
  }

  for (const anchor of element.querySelectorAll('a[href]')) {
    const post = readPostUrl(attr(anchor, 'href'))

    if (post) {
      return post
    }
  }
}

const profilePathRegex = /^\/([A-Za-z0-9_.]{1,30})\/?$/
const bylineHandleRegex = /\(@([A-Za-z0-9_.]{1,30})\)/
const bareHandleRegex = /@([A-Za-z0-9_.]{1,30})/

const readProfileHandle = (element: Element): string | undefined => {
  for (const anchor of element.querySelectorAll('a[href]')) {
    const parsed = parseUrlOnHosts(attr(anchor, 'href'), instagramHosts)

    if (!parsed) {
      continue
    }

    const handle = parsed.pathname.match(profilePathRegex)?.[1]

    if (handle) {
      return handle
    }
  }
}

const findByline = (element: Element): Element | undefined => {
  return find(element, 'p', (paragraph) => {
    return Boolean(find(paragraph, 'time') ?? readProfileHandle(paragraph))
  })
}

const readContent = (element: Element): Partial<EmbedResolverResult> => {
  const byline = findByline(element)
  const caption = byline ? find(element, 'p', (paragraph) => paragraph !== byline) : undefined
  const time = find(element, 'time')
  const quoted = text(element)
  const handle =
    readProfileHandle(element) ??
    quoted?.match(bylineHandleRegex)?.[1] ??
    (caption ? undefined : quoted?.match(bareHandleRegex)?.[1])

  return {
    description: text(caption),
    author: handle ? `@${handle}` : undefined,
    date: attr(time, 'datetime') ?? text(time),
  }
}

// Instagram's share dialog ships a post as a blockquote skeleton only its `embed.js` loader fills.
export const instagramBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.instagram-media, blockquote[data-instgrm-permalink]',
  (element): EmbedResolverResult | undefined => {
    const wrapper = readWrapper(element)
    const post = findPost(element) ?? wrapper.post

    if (!post) {
      return
    }

    return composeEmbed(post, element.hasAttribute('data-instgrm-captioned'), {
      ...readContent(element),
      ...wrapper.size,
    })
  },
)

// AMP's `<amp-instagram>` names the post in an attribute and stays empty with no AMP runtime.
export const instagramAmpEmbedResolver = createMarkupEmbedResolver(
  'amp-instagram[data-shortcode], amp-instagram[shortcode]',
  (element): EmbedResolverResult | undefined => {
    const shortcode = attr(element, 'data-shortcode') ?? attr(element, 'shortcode')

    if (!shortcode || !safeShortcodeRegex.test(shortcode)) {
      return
    }

    return composeEmbed({ kind: 'p', shortcode }, element.hasAttribute('data-captioned'))
  },
)

type SubstackPostAttributes = {
  instagram_id?: string
  title?: string | null
  author_name?: string | null
  thumbnail_url?: string | null
  profile_pic_url?: string | null
  timestamp?: string | null
}

const boilerplateTitleRegex = /^A post shared by\b/

const readRehostedUrl = (url: string | null | undefined): string | undefined => {
  return url?.includes('__ss-rehost__') ? url : undefined
}

const composeHandle = (handle: string | null | undefined): string | undefined => {
  if (!handle) {
    return
  }

  return handle.startsWith('@') ? handle : `@${handle}`
}

// Substack ships an Instagram post as a childless div with the whole card as JSON in `data-attrs`.
export const instagramSubstackEmbedResolver = createMarkupEmbedResolver(
  'div.instagram-embed-wrap[data-attrs], div[data-component-name="InstagramToDOM"]',
  (element): EmbedResolverResult | undefined => {
    const attributes = jsonAttr<SubstackPostAttributes>(element, 'data-attrs')
    const shortcode = attributes?.instagram_id

    if (!shortcode || !safeShortcodeRegex.test(shortcode)) {
      return
    }

    const title = attributes.title ?? undefined

    return composeEmbed({ kind: 'p', shortcode }, false, {
      description: title && !boilerplateTitleRegex.test(title) ? title : undefined,
      author: composeHandle(attributes.author_name),
      avatar: readRehostedUrl(attributes.profile_pic_url),
      thumbnail: readRehostedUrl(attributes.thumbnail_url),
      date: attributes.timestamp ?? undefined,
    })
  },
)

// The frame `embed.js` builds, which exports store after render and iframe generators paste.
export const instagramResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const post = readPostUrl(url)

  if (!post) {
    return
  }

  const parsed = parseUrl(url, placeholderBaseUrl)

  return composeEmbed(post, parsed?.pathname.includes('/embed/captioned') === true)
}

export const instagramIframeEmbedResolver = createUrlEmbedResolver(
  instagramHosts,
  instagramResolveEmbed,
)

export const readInstagramHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.type === 'MEASURE' && isPlainObject(data.details)
    ? readPixels(data.details.height)
    : undefined
}

export const instagramRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://www.instagram.com',
  readHeight: readInstagramHeight,
}
