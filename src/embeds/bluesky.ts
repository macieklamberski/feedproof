import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, isBlockElement, isBr, isElement, jsonAttr, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { atUsername, createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'bluesky'

// The fork host only widens what is read: the player is always minted on embed.bsky.app.
// `main.bsky.dev` is first-party and `deer.social` a third-party soft fork, and both serve the
// same `/profile/{authority}/post/{rkey}` path.
export const blueskyHosts = ['bsky.app', 'deer.social', 'main.bsky.dev']

// Images come off `cdn.bsky.app` today and off `cdn.bsky.social` in older records, both plain
// paths with no signature and no expiry.
const blueskyMediaHosts = ['bsky.app', 'bsky.social']

// An AT URI addresses a record as `at://{authority}/{collection}/{rkey}`, and only the post
// collection is embeddable. WHATWG url parsing is no use here: `at://did:plc:x/…` reads the
// colon in the authority as a port and fails, so the URI is split by hand.
const postCollection = 'app.bsky.feed.post'
// at://{authority}/{collection}/{rkey}.
const atUriRegex = /^at:\/\/([^/]+)\/([^/]+)\/([^/?#]+)/

// A DID or a handle, which is a domain name.
const safeAuthorityRegex = /^(?:did:[a-z]+:[\w.:%-]+|[a-z\d-]+(?:\.[a-z\d-]+)+)$/i
// A record key, never `.` or `..`: the protocol forbids them and they would climb out of the path.
const safeRecordKeyRegex = /^(?!\.{1,2}$)[\w.~-]+$/

// Whitespace, an en dash, an em dash or a hyphen.
const authorSeparatorRegex = /^[\s–—-]+/

// Bluesky's own fallback for media the blockquote cannot render, e.g. `[image or embed]`. It
// is an anchor to the post like the date link is, so a date reading has to tell them apart.
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
  // Not `new URL`: it reads the colon in a DID authority as a port and fails.
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

  // `bsky.app/profile/{authority}/post/{rkey}` is the permalink the blockquote's anchors carry,
  // and `embed.bsky.app/embed/{authority}/app.bsky.feed.post/{rkey}` is the player.
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
    // A record key is unique only inside one repository, and every endpoint keys on the authority.
    // `getPostThread` and oEmbed answer a handle-form post, and only `getPosts` needs a DID.
    id: `${post.authority}/${post.rkey}`,
    // The player takes a DID today and answers 400 to the handle form <bluesky-post> ships.
    src: `https://embed.bsky.app/embed/${post.authority}/${postCollection}/${post.rkey}`,
    url: `https://bsky.app/profile/${post.authority}/post/${post.rkey}`,
  }
}

// Bluesky's oEmbed names an author `Display Name (@handle)`, and most of the markup carries
// that string whole. The forms that split the two across an anchor boundary are composed back
// into it, so one author reads the same whichever carrier it came from.
const composeAuthor = (name?: string, handle?: string): string | undefined => {
  if (name && handle) {
    return `${name} (${atUsername(handle)})`
  }

  return name || (handle && atUsername(handle)) || undefined
}

// The last permalink in the element. A post carrying media links itself twice, once from the
// media marker in the body and once from the date, and the date is always the later of them.
const findPostAnchor = (element: Element): Element | undefined => {
  let found: Element | undefined

  // The last one: a media marker links the post too, and the date link is always later.
  for (const anchor of element.querySelectorAll('a[href]')) {
    if (extractBlueskyPostFromUrl(attr(anchor, 'href') ?? '')) {
      found = anchor
    }
  }

  return found
}

// Everything inline that precedes the date link: a text node, the profile anchor, or a text
// node either side of it, depending on which snippet generator wrote the footer. A block
// element or a `<br>` marks where the post text ended, so the walk stops there.
const readAuthor = (anchor: Element): string | undefined => {
  let label = ''
  let node = anchor.previousSibling

  while (node && !isBlockElement(node) && !isBr(node)) {
    label = `${node.textContent ?? ''}${label}`
    node = node.previousSibling
  }

  const author = label.replace(authorSeparatorRegex, '').trim()

  // Every footer names the handle, so a run with no `@` in it is body text.
  return author.includes('@') ? author : undefined
}

const readPostText = (element: Element, postAnchor: Element | undefined): string | undefined => {
  // The post text is a paragraph of its own wherever the markup has paragraphs at all. The
  // one holding the date link is the footer, not the text.
  const paragraph = find(element, 'p', (node) => !postAnchor || !node.contains(postAnchor))
  const container = paragraph ?? element
  let body = ''

  for (const node of container.childNodes) {
    // With no paragraph to read, the text is the run of nodes before the first break and the
    // footer is everything after it.
    if (!paragraph && (isBr(node) || isBlockElement(node))) {
      break
    }

    // Bluesky writes `[image or embed]` where the blockquote cannot show the attachment, and
    // links it to the post exactly as the footer does. It is chrome, not the post's words.
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
  // Some feeds strip the blockquote's data attributes, and others drop its class and keep them.
  const post = extractBlueskyPost(attr(element, attribute) ?? '') ?? quoted.post

  return post ? { ...composeEmbedResult(post), ...quoted.fields } : undefined
}

// Bluesky's post blockquote, the fallback its embed script replaces and no reader runs.
// Every CMS wrapper holds it: WordPress's Gutenberg figure, Ghost's card and Daily Kos's editor
// block all carry this same blockquote inside.
export const blueskyBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.bluesky-embed, blockquote[data-bluesky-uri]',
  (element) => extractQuotedPost(element, 'data-bluesky-uri'),
)

// Substack renders every Bluesky embed as an iframe inside its own wrapper, and that wrapper
// carries the whole post as JSON: the text, the author, their avatar, the timestamp and the
// media. None of it survives the generic iframe path, and none of it needs a network call.
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
    // `…/bluesky.min.html#at://{authority}/app.bsky.feed.post/{rkey}#embed.bsky.app`: the
    // helper page takes the AT URI first and its own provider marker second.
    const post = extractBlueskyPost(attr(element, 'src')?.split('#')[1] ?? '')

    if (!post) {
      return
    }

    return composeEmbedResult(post)
  },
)

// A newsletter's <bluesky-post> custom element, a declarative shadow root no reader mounts.
// Its `src` is an AT URI spelled with the author's handle. The blockquote inside holds the post.
export const blueskyPostElementEmbedResolver = createMarkupEmbedResolver(
  'bluesky-post[src]',
  (element) => extractQuotedPost(element, 'src'),
)

// The player posts its height whenever the post's size changes.
export const readBlueskyHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) ? readPixels(data.height) : undefined
}

export const blueskyRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://embed.bsky.app',
  readHeight: readBlueskyHeight,
}
