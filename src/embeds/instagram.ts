import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, find, parsePixelSize, text } from '../utils/dom.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

// Instagram's embed dialog ships a post as `<blockquote class="instagram-media">` holding the
// permalink, a skeleton of empty divs and an `embed.js` loader beside it. The loader never runs
// in a reader, so the quote arrives as its own chrome — a "View this post on Instagram" line and
// an "A post shared by" byline — with no picture and no player.
//
// The frame that loader builds is mintable from the permalink alone,
// `instagram.com/{p|reel|tv}/{shortcode}/embed/[captioned/]`, which is also what the AMP
// component builds from its shortcode and what a stored-after-render copy already points at.
//
// `instagr.am` is the short host the pre-2013 snippets and Jetpack's own matcher still accept.
const instagramHosts = ['instagram.com', 'instagr.am']

const isInstagramUrl = (url: URL): boolean => {
  return isHostOf(url, instagramHosts) || isSubdomainOf(url, instagramHosts)
}

// The paths one post is addressed by: the post, the reel (singular and plural spellings) and
// the retired IGTV route. They are not interchangeable — a live photo serves its picture at
// `/p/{shortcode}/media/` and answers 404 at `/reel/{shortcode}/media/` (checked 2026-08-13) —
// so the path stays part of the id rather than being normalized away.
const postPathRegex = /^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/
const safeShortcodeRegex = /^[A-Za-z0-9_-]+$/

type Post = { kind: string; shortcode: string }

const readPostUrl = (value: string | undefined): Post | undefined => {
  const parsed = parseUrl(value ?? '', 'https://example.com')

  if (!parsed || !isInstagramUrl(parsed)) {
    return
  }

  const match = parsed.pathname.match(postPathRegex)

  if (!match) {
    return
  }

  return { kind: match[1] === 'reels' ? 'reel' : match[1], shortcode: match[2] }
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
// size the embed rendered at. That is the only place an Instagram embed carries a ratio: the
// blockquote declares a max-width and never a height.
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
    // Stated together or not at all: the pair reads downstream as an aspect ratio, and one
    // alone would claim a fixed height the embed does not have.
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
    const parsed = parseUrl(attr(anchor, 'href') ?? '', 'https://example.com')

    if (!parsed || !isInstagramUrl(parsed)) {
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

// The dialog used to write a byline that linked the account and dated the post — "A post shared
// by {name} (@handle) on {date}" — and to put the caption in a paragraph above it. The current
// one writes neither: its only text is the skeleton's own chrome and an undated byline. So the
// caption is read only where that byline marks the paragraph above it as the post's own text;
// taking it from the modern shape would publish "View this post on Instagram" as the caption.
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
// what every CMS re-wraps.
export const instagramBlockquoteEmbedResolver: EmbedResolver = {
  selector: 'blockquote.instagram-media',
  extract: (element): EmbedResolverResult | undefined => {
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
}

// The AMP component names the post in an attribute and carries no text at all, so left alone it
// is dropped as an empty element and the post goes with it. It names the media and not the path
// the media lives at, and addresses every shortcode it is given through `/p/`.
export const instagramAmpEmbedResolver: EmbedResolver = {
  selector: 'amp-instagram[data-shortcode], amp-instagram[shortcode]',
  extract: (element): EmbedResolverResult | undefined => {
    const shortcode = attr(element, 'data-shortcode') ?? attr(element, 'shortcode')

    if (!shortcode || !safeShortcodeRegex.test(shortcode)) {
      return
    }

    return composeEmbed({ kind: 'p', shortcode }, element.hasAttribute('data-captioned'))
  },
}

// The frame `embed.js` builds, which Blogger-style exports store after the page rendered and
// which iframe generators paste directly. Its query and hash (`cr`, `wp`, `rd`, `rp`) describe
// the embedding page rather than the player, so the url is rebuilt from the path instead of kept.
export const instagramResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const post = readPostUrl(url)

  if (!post) {
    return
  }

  const parsed = parseUrl(url, 'https://example.com')

  return composeEmbed(post, parsed?.pathname.includes('/embed/captioned') === true)
}

export const instagramIframeEmbedResolver = createIframeEmbedResolver(
  instagramHosts,
  instagramResolveEmbed,
)

// A WordPress lazy-loader that parks the whole blockquote percent-encoded in `data-content` and
// injects it when the placeholder scrolls into view. Without its script the div stays empty and
// is deleted as empty markup, so the post disappears leaving nothing behind. The wrapper repeats
// the post url plain, and the parked copy still spells whether the publisher asked for a caption.
export const instagramLazyEmbedResolver: EmbedResolver = {
  selector: 'div.load-later-vendor-wwwinstagramcom[data-url]',
  extract: (element): EmbedResolverResult | undefined => {
    const post = readPostUrl(attr(element, 'data-url'))

    if (!post) {
      return
    }

    const captioned = attr(element, 'data-content')?.includes('data-instgrm-captioned') === true

    return composeEmbed(post, captioned)
  },
}
