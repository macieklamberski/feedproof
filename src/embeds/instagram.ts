import { isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, jsonAttr, parsePixelSize, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { decodeOrKeep, parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { atUsername, createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'instagram'

// `instagr.am` is the short host the pre-2013 snippets still carry.
const instagramHosts = ['instagram.com', 'instagr.am']

// `audio` sits where a shortcode does, under `/reels/audio/{id}`, and names a sound, not a post.
const nonShortcodeSegments = new Set(['audio'])

// Instagram's own routes sit where an account does: `share/p/{token}` carries a redirect
// token, not a shortcode, and reading it as one mints a frame that cannot load.
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

// The account names the poster, not the post, so it is matched and dropped.
// `tv` is the retired IGTV route and `reels` the plural spelling of the reel.
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

// The captioned frame renders the post's text under the picture, so which of the two a
// publisher asked for decides how much of the post a reader gets to see.
const composeEmbed = (
  post: Post,
  captioned: boolean,
  extra?: Partial<EmbedResolverResult>,
): EmbedResolverResult => {
  // The kind stays in the path: a photo's media answers 404 under `/reel/`.
  const path = `${post.kind}/${post.shortcode}`

  return {
    provider,
    id: path,
    src: `https://www.instagram.com/${path}/embed/${captioned ? 'captioned/' : ''}`,
    url: `https://www.instagram.com/${path}/`,
    ...extra,
  }
}

// Tumblr wraps the quote in a figure that repeats the post url percent-encoded and states the
// size the embed rendered at. That is the only size a blockquote ever comes with: the quote
// itself declares a max-width and never a height, so the declared-size pass finds nothing on it.
const wrapperSelector = 'figure[data-provider="instagram"]'

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
    post: readPostUrl(decodeOrKeep(attr(figure, 'data-url'))),
    // Stated together or not at all: a lone height would claim a fixed box the embed does
    // not have.
    size: width && height ? { width, height } : {},
  }
}

// Where the post is named, in the order the shapes provide it: the attribute the dialog writes,
// then any anchor in the quote, which the pre-2018 versions and every sanitized copy leave as
// the only trace.
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

// `/{handle}/` on its own: the account page, as the dated byline links it.
const profilePathRegex = /^\/([A-Za-z0-9_.]{1,30})\/?$/
// The handle as the byline spells it beside the display name, `(@handle)`. A sanitized copy
// keeps only the bare `@handle`, which is read second: inside a quote that still carries its
// caption, the first bare @token is as likely to be a mention as the author.
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

// The byline paragraph: the one that links the account or dates the post.
const findByline = (element: Element): Element | undefined => {
  return find(element, 'p', (paragraph) => {
    return Boolean(find(paragraph, 'time') ?? readProfileHandle(paragraph))
  })
}

const readContent = (element: Element): Partial<EmbedResolverResult> => {
  const byline = findByline(element)
  // Only beside a byline: the modern skeleton's first paragraph is its own chrome.
  // The older dialog puts the caption in a paragraph above the byline "A post shared by {name}
  // (@handle) on {date}", and the current one writes neither.
  const caption = byline ? find(element, 'p', (paragraph) => paragraph !== byline) : undefined
  const time = find(element, 'time')
  const quoted = text(element)
  const handle =
    readProfileHandle(element) ??
    quoted?.match(bylineHandleRegex)?.[1] ??
    (caption ? undefined : quoted?.match(bareHandleRegex)?.[1])

  return {
    description: text(caption),
    // The display name sits behind a localized "A post shared by" prefix in the shape that
    // still carries it, so the handle is the half every era spells the same way.
    author: handle ? atUsername(handle) : undefined,
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

    // The component names the media and not the path it lives at, so the frame goes through `/p/`.
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

// The earliest payloads carry the bare caption as the title, the current ones wrap it in
// `{name} on Instagram: "{caption}"`, and the era between wrote only "A post shared by {author}".
const boilerplateTitleRegex = /^A post shared by\b/

// Only a rehosted copy: the earliest payloads carry Instagram's signed CDN url, long expired.
const readRehostedUrl = (url: string | null | undefined): string | undefined => {
  return url?.includes('__ss-rehost__') ? url : undefined
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

    // The payload names the media and not the path it lives at, so like the AMP component the
    // frame addresses the shortcode through `/p/`.
    return composeEmbed({ kind: 'p', shortcode }, false, {
      description: title && !boilerplateTitleRegex.test(title) ? title : undefined,
      // The handle arrives bare in the older payloads and `@`-prefixed in the current ones.
      author: attributes.author_name ? atUsername(attributes.author_name) : undefined,
      avatar: readRehostedUrl(attributes.profile_pic_url),
      thumbnail: readRehostedUrl(attributes.thumbnail_url),
      date: attributes.timestamp ?? undefined,
    })
  },
)

// The frame `embed.js` builds, which exports store after render and iframe generators paste.
// Its query and hash (`cr`, `wp`, `rd`, `rp`) describe the embedding page, not the player.
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

// The player measures itself once mounted and reports it under a `MEASURE` type. `LOADING`
// and `MOUNTED` come through the same channel without a size.
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
