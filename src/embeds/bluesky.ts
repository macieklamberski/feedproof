import { getPathSegments, isSubdomainOf } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, isBlockElement, isBr, isElement, jsonAttr, text } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const blueskyHosts = ['bsky.app']

// Images come off `cdn.bsky.app` today and off `cdn.bsky.social` in older records. Both are
// plain paths with no signature and no expiry (checked live 2026-08-13: 200, public,
// `cache-control: max-age=604800`), so one can be written into a placeholder and still
// resolve later.
const blueskyMediaHosts = ['bsky.app', 'bsky.social']

// An AT URI addresses a record as `at://{authority}/{collection}/{rkey}`, and only the post
// collection is embeddable. WHATWG url parsing is no use here: `at://did:plc:x/…` reads the
// colon in the authority as a port and fails, so the URI is split by hand.
const postCollection = 'app.bsky.feed.post'
const atUriRegex = /^at:\/\/([^/]+)\/([^/]+)\/([^/?#]+)/

// The authority is either a DID (`did:plc:…`, `did:web:…`) or a handle, which is a domain
// name. The record key is base32-sortable in practice. The wider charset here is the whole
// of what a record key may hold. Both are interpolated into urls, so anything outside these
// alphabets is refused, not escaped.
const safeAuthorityRegex = /^(?:did:[a-z]+:[\w.:%-]+|[a-z\d-]+(?:\.[a-z\d-]+)+)$/i
const safeRecordKeyRegex = /^[\w.~-]+$/

// The author label sits between the post text and the date link, and the leading separator is
// whatever the snippet generator emitted: `&mdash;`, an en dash, or a plain `--`.
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
  const match = uri.match(atUriRegex)

  if (!match || match[2] !== postCollection) {
    return
  }

  return composePost(match[1], match[3])
}

// The two url spellings of the same post: `bsky.app/profile/{authority}/post/{rkey}` is the
// permalink the blockquote's own anchors carry, and
// `embed.bsky.app/embed/{authority}/app.bsky.feed.post/{rkey}` is the player the embed script
// builds. The host is checked, not the path shape, so a url that merely spells one of
// these paths on its own host names no post.
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

// `EnrichEmbedFn` is handed `{provider, id}` and nothing else, so the id has to address the
// post on its own. A record key does not: it is unique only within one repository, and every
// endpoint that answers for a post, the AT URI, the permalink, the player, is keyed by the
// authority as well. So the id is the pair, and both endpoints rebuild from it.
//
// The authority is whichever form the markup gave. `getPostThread` and oEmbed both answer a
// handle-form post directly, so the id addresses the post either way (checked live
// 2026-08-13). Only `getPosts` needs a DID.
//
// The player is composed the same way for both forms, even though it takes a DID today and
// answers 400 to a handle (checked live 2026-08-13). The handle form is one file in 200 and
// comes from a single newsletter platform whose custom element carries no DID anywhere, so the
// alternative is either dropping those posts or writing a url that is a different kind of
// thing into the field that names the player. Keeping the shape uniform means the day the
// player resolves handles itself, those embeds start working with no change here.
const composeEmbedResult = (post: BlueskyPost): EmbedResolverResult => {
  return {
    provider: 'bluesky',
    id: `${post.authority}/${post.rkey}`,
    src: `https://embed.bsky.app/embed/${post.authority}/${postCollection}/${post.rkey}`,
    url: `https://bsky.app/profile/${post.authority}/post/${post.rkey}`,
  }
}

// Bluesky's oEmbed names an author `Display Name (@handle)`, and most of the markup carries
// that string whole. The forms that split the two across an anchor boundary are composed back
// into it, so one author reads the same whichever carrier it came from.
const composeAuthor = (name?: string, handle?: string): string | undefined => {
  if (name && handle) {
    return `${name} (@${handle})`
  }

  return name || (handle && `@${handle}`) || undefined
}

// The last permalink in the element. A post carrying media links itself twice, once from the
// media marker in the body and once from the date, and the date is always the later of them.
const findPostAnchor = (element: Element): Element | undefined => {
  let found: Element | undefined

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

  // Every footer names the handle, so a run with no `@` in it is body text rather than an
  // author label.
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

// The blockquote is what a reader sees until Bluesky's script replaces it, and it holds the
// post text, the author and the date. Replacing it with a placeholder that carried only an id
// would lose all three, so they are read out of it first. The `<bluesky-post>` custom element
// ships the same fallback markup, so both carriers read it the same way.
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

// The canonical embed, and the one every CMS wrapper holds: WordPress's Gutenberg figure,
// Ghost's card, the theme divs, Daily Kos's editor block and the entity-encoded feeds all
// carry this same blockquote inside. The wrapper is left standing and only the blockquote is
// replaced, so no wrapper needs naming here.
//
// The AT URI is the declared identifier, but one feed shape ships the blockquote with the
// data attributes stripped, so the permalink in the footer is read as a second source. The
// opposite stripping happens too: some feeds drop the class and keep the attributes, so the
// second selector half claims the quote by its declared AT URI.
export const blueskyBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.bluesky-embed, blockquote[data-bluesky-uri]',
  (element) => {
    const quoted = readQuotedPost(element)
    const post = extractBlueskyPost(attr(element, 'data-bluesky-uri') ?? '') ?? quoted.post

    if (!post) {
      return
    }

    return { ...composeEmbedResult(post), ...quoted.fields }
  },
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
    avatar: isSubdomainOf(attributes.authorAvatarUrl ?? '', blueskyMediaHosts)
      ? attributes.authorAvatarUrl
      : undefined,
    thumbnail: isSubdomainOf(image ?? '', blueskyMediaHosts) ? image : undefined,
    date: attributes.createdAt,
  }
}

// The player the embed script builds at runtime, saved into the feed by a CMS that ran the
// script first (Substack) or pasted by hand (Ghost, TinyMCE). Same post, same placeholder:
// only the carrier differs.
export const blueskyIframeEmbedResolver = createUrlEmbedResolver(blueskyHosts, (url, element) => {
  const post = extractBlueskyPostFromUrl(url)

  if (!post) {
    return
  }

  return { ...composeEmbedResult(post), ...readSubstackPost(element) }
})

// Forum software renders a post through the s9e MediaEmbed helper page, which is hosted on
// `s9e.github.io`, not on Bluesky. The post is named in the url fragment, so the
// placeholder points back at Bluesky's own player like every other carrier.
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

// A newsletter platform ships the post as a custom element with a declarative shadow root,
// which no reader mounts. Its `src` is an AT URI written with the author's handle, not their
// DID, and the fallback blockquote inside it holds the post text.
export const blueskyPostElementEmbedResolver = createMarkupEmbedResolver(
  'bluesky-post[src]',
  (element) => {
    const quoted = readQuotedPost(element)
    const post = extractBlueskyPost(attr(element, 'src') ?? '') ?? quoted.post

    if (!post) {
      return
    }

    return { ...composeEmbedResult(post), ...quoted.fields }
  },
)
