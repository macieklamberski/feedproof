import { isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, jsonAttr, parsePixelSize, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Instagram's embed dialog ships a post as `<blockquote class="instagram-media">` holding the
// permalink, a skeleton of empty divs and an `embed.js` loader beside it. The loader never runs
// in a reader, so the quote arrives as its own chrome: a "View this post on Instagram" line and
// an "A post shared by" byline, with no picture and no player.
//
// The frame that loader builds is mintable from the permalink alone,
// `instagram.com/{p|reel|tv}/{shortcode}/embed/[captioned/]`, which is also what the AMP
// component builds from its shortcode and what a stored-after-render copy already points at.
//
// `instagr.am` is the short host the pre-2013 snippets and Jetpack's own matcher still accept.
const instagramHosts = ['instagram.com', 'instagr.am']

// The paths one post is addressed by: the post, the reel (singular and plural spellings) and
// the retired IGTV route. They are not interchangeable: a live photo serves its picture at
// `/p/{shortcode}/media/` and answers 404 at `/reel/{shortcode}/media/` (checked 2026-08-13),
// so the path stays part of the id.
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
const postPathRegex = /^\/(?:([A-Za-z0-9_.]{1,30})\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/
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
  const path = `${post.kind}/${post.shortcode}`

  return {
    provider: 'instagram',
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

// The dialog used to write a byline that linked the account and dated the post: "A post shared
// by {name} (@handle) on {date}", and to put the caption in a paragraph above it. The current
// one writes neither: its only text is the skeleton's own chrome and an undated byline. So the
// caption is read only where that byline marks the paragraph above it as the post's own text.
// Taking it from the modern shape would publish "View this post on Instagram" as the caption.
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
    // The display name sits behind a localized "A post shared by" prefix in the shape that
    // still carries it, so the handle is the half every era spells the same way.
    author: handle ? `@${handle}` : undefined,
    date: attr(time, 'datetime') ?? text(time),
  }
}

// The blockquote in all its versions and wrappers, which is what the share dialog writes and
// what every CMS re-wraps. The permalink attribute is the second handle on purpose: a sanitizer
// that strips classes keeps data attributes, so some feeds carry the quote with the attributes
// alone, and the attribute is Instagram's own namespace rather than a name anyone else picked.
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

// The AMP component names the post in an attribute and carries no text at all, so left alone it
// reaches the reader inert: stripEmptyTags skips custom elements, whose emptiness is meaningful,
// and no AMP runtime runs to build the frame. It names the media and not the path the media
// lives at, and addresses every shortcode it is given through `/p/`.
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

// The `title` is the post page's own title, and its shape changed with Substack's scraper. The
// earliest payloads carry the bare caption, the current ones wrap it in
// `{name} on Instagram: "{caption}"`, and the era between wrote only "A post shared by
// {author}", which duplicates `author_name` and says nothing the byline does not, so that one
// form is dropped instead of published as the post's text.
const boilerplateTitleRegex = /^A post shared by\b/

// Substack stamps the filename of every copy it rehosts. The stamp is the guard: the earliest
// payloads passed Instagram's own CDN url through instead, which is signed and long expired,
// and a dead thumbnail in a placeholder is worse than none.
const readRehostedUrl = (url: string | null | undefined): string | undefined => {
  return url?.includes('__ss-rehost__') ? url : undefined
}

// The handle arrives bare in the older payloads and `@`-prefixed in the current ones.
const composeHandle = (handle: string | null | undefined): string | undefined => {
  if (!handle) {
    return
  }

  return handle.startsWith('@') ? handle : `@${handle}`
}

// Substack renders an Instagram post server-side and ships the wrapper div childless, with the
// whole card as JSON in `data-attrs`: the shortcode, the post's page title, the author and a
// thumbnail Substack rehosted to its own storage. Left alone the div is dropped as empty markup
// and the post goes with it. Some feeds strip the class and keep the component name, so both
// halves of the selector name the same div.
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
      author: composeHandle(attributes.author_name),
      avatar: readRehostedUrl(attributes.profile_pic_url),
      thumbnail: readRehostedUrl(attributes.thumbnail_url),
      date: attributes.timestamp ?? undefined,
    })
  },
)

// The frame `embed.js` builds, which Blogger-style exports store after the page rendered and
// which iframe generators paste directly. Its query and hash (`cr`, `wp`, `rd`, `rp`) describe
// the embedding page, not the player, so the url is rebuilt from the path instead of kept.
export const instagramResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const post = readPostUrl(url)

  if (!post) {
    return
  }

  const parsed = parseUrl(url, 'https://example.com')

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
  provider: 'instagram',
  origin: 'https://www.instagram.com',
  readHeight: readInstagramHeight,
}
