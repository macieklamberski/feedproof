import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, isBlockElement, isBr, isElement, jsonAttr, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'bluesky'

export const blueskyHosts = ['bsky.app', 'deer.social', 'main.bsky.dev']

const blueskyMediaHosts = ['bsky.app', 'bsky.social']

const postCollection = 'app.bsky.feed.post'
// at://{authority}/{collection}/{rkey}.
const atUriRegex = /^at:\/\/([^/]+)\/([^/]+)\/([^/?#]+)/

// A DID or a handle, which is a domain name.
const safeAuthorityRegex = /^(?:did:[a-z]+:[\w.:%-]+|[a-z\d-]+(?:\.[a-z\d-]+)+)$/i
// A record key, never `.` or `..`.
const safeRecordKeyRegex = /^(?!\.{1,2}$)[\w.~-]+$/

// Whitespace, an en dash, an em dash or a hyphen.
const authorSeparatorRegex = /^[\s–—-]+/

const mediaMarkerRegex = /^\[.*\]$/

type BlueskyPost = {
  authority: string
  rkey: string
}

type SubstackPostAttributes = {
  authorName?: string
  authorHandle?: string
  authorAvatarUrl?: string
  text?: string
  createdAt?: string
  imageUrls?: Array<string>
}

const composePost = (authority: string, rkey: string): BlueskyPost | undefined => {
  if (safeAuthorityRegex.test(authority) && safeRecordKeyRegex.test(rkey)) {
    return { authority, rkey }
  }
}

const extractBlueskyPost = (uri: string): BlueskyPost | undefined => {
  const match = uri.match(atUriRegex)

  if (!match || match[2] !== postCollection) {
    return
  }

  return composePost(match[1], match[3])
}

const extractBlueskyPostFromUrl = (link: string): BlueskyPost | undefined => {
  const parsed = parseUrlOnHosts(link, blueskyHosts)

  if (!parsed) {
    return
  }

  const [root, authority, collection, rkey] = getPathSegments(parsed)

  if (!authority || !rkey) {
    return
  }

  if (
    (root === 'profile' && collection === 'post') ||
    (root === 'embed' && collection === postCollection)
  ) {
    return composePost(authority, rkey)
  }
}

const composeEmbedResult = (post: BlueskyPost): EmbedResolverResult => {
  return {
    provider,
    id: `${post.authority}/${post.rkey}`,
    src: `https://embed.bsky.app/embed/${post.authority}/${postCollection}/${post.rkey}`,
    url: `https://bsky.app/profile/${post.authority}/post/${post.rkey}`,
  }
}

const composeAuthor = (name?: string, handle?: string): string | undefined => {
  if (name && handle) {
    return `${name} (@${handle})`
  }

  return name || (handle && `@${handle}`) || undefined
}

const findPostAnchor = (element: Element): Element | undefined => {
  let found: Element | undefined

  for (const anchor of element.querySelectorAll('a[href]')) {
    if (extractBlueskyPostFromUrl(attr(anchor, 'href') ?? '')) {
      found = anchor
    }
  }

  return found
}

const readAuthor = (anchor: Element): string | undefined => {
  let label = ''
  let node = anchor.previousSibling

  while (node && !isBlockElement(node) && !isBr(node)) {
    label = `${node.textContent ?? ''}${label}`
    node = node.previousSibling
  }

  const author = label.replace(authorSeparatorRegex, '').trim()

  return author.includes('@') ? author : undefined
}

const readPostText = (element: Element, postAnchor: Element | undefined): string | undefined => {
  const paragraph = find(element, 'p', (node) => !postAnchor || !node.contains(postAnchor))
  const container = paragraph ?? element
  let body = ''

  for (const node of container.childNodes) {
    if (!paragraph && (isBr(node) || isBlockElement(node))) {
      break
    }

    const isMediaMarker =
      isElement(node) &&
      node.localName === 'a' &&
      Boolean(extractBlueskyPostFromUrl(attr(node, 'href') ?? ''))

    if (!isMediaMarker) {
      body += node.textContent ?? ''
    }
  }

  return body.trim() || undefined
}

const readQuotedPost = (
  element: Element,
): { post?: BlueskyPost; fields: Partial<EmbedResolverResult> } => {
  const postAnchor = findPostAnchor(element)
  const date = text(postAnchor)

  return {
    post: extractBlueskyPostFromUrl(attr(postAnchor, 'href') ?? ''),
    fields: {
      description: readPostText(element, postAnchor),
      author: postAnchor && readAuthor(postAnchor),
      date: date && !mediaMarkerRegex.test(date) ? date : undefined,
    },
  }
}

const extractQuotedPost = (
  element: Element,
  attribute: string,
): EmbedResolverResult | undefined => {
  const quoted = readQuotedPost(element)
  const post = extractBlueskyPost(attr(element, attribute) ?? '') ?? quoted.post

  return post ? { ...composeEmbedResult(post), ...quoted.fields } : undefined
}

// Bluesky's post blockquote, the fallback its embed script replaces and no reader runs.
export const blueskyBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.bluesky-embed, blockquote[data-bluesky-uri]',
  (element) => extractQuotedPost(element, 'data-bluesky-uri'),
)

const readSubstackPost = (element: Element): Partial<EmbedResolverResult> => {
  const wrapper = element.closest('[data-component-name="BlueskyCreateBlueskyEmbed"]')
  const attributes = jsonAttr<SubstackPostAttributes>(wrapper, 'data-attrs')

  if (!attributes) {
    return {}
  }

  const image = attributes.imageUrls?.[0]

  return {
    description: attributes.text,
    author: composeAuthor(attributes.authorName, attributes.authorHandle),
    avatar: parseUrlOnHosts(attributes.authorAvatarUrl, blueskyMediaHosts)
      ? attributes.authorAvatarUrl
      : undefined,
    thumbnail: parseUrlOnHosts(image, blueskyMediaHosts) ? image : undefined,
    date: attributes.createdAt,
  }
}

// The embed.bsky.app player iframe, saved by a CMS that ran the script or pasted by hand.
export const blueskyIframeEmbedResolver = createUrlEmbedResolver(blueskyHosts, (url, element) => {
  const post = extractBlueskyPostFromUrl(url)

  if (!post) {
    return
  }

  return { ...composeEmbedResult(post), ...readSubstackPost(element) }
})

// A forum's s9e MediaEmbed helper iframe on s9e.github.io, naming the post in its url fragment.
export const blueskyS9eEmbedResolver = createMarkupEmbedResolver(
  'iframe[data-s9e-mediaembed="bluesky"]',
  (element) => {
    const post = extractBlueskyPost(attr(element, 'src')?.split('#')[1] ?? '')

    if (!post) {
      return
    }

    return composeEmbedResult(post)
  },
)

// A newsletter's <bluesky-post> custom element, a declarative shadow root no reader mounts.
export const blueskyPostElementEmbedResolver = createMarkupEmbedResolver(
  'bluesky-post[src]',
  (element) => extractQuotedPost(element, 'src'),
)

export const readBlueskyHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) ? readPixels(data.height) : undefined
}

export const blueskyRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://embed.bsky.app',
  readHeight: readBlueskyHeight,
}
