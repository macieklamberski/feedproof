import { getPathSegments, type Nullish, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, keepIfMatches, text } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const slideshareHosts = ['slideshare.net', 'slidesharecdn.com']

// The modern embed names a deck by an opaque key, the pre-2015 one by the deck's numeric id, and
// both still serve: `/slideshow/embed_code/6435157` lands on the key form and renders the deck.
const safeDeckKeyRegex = /^[A-Za-z0-9]+$/
const safeDeckIdRegex = /^\d+$/

// The Flash wrapper spells its id `__ss_{id}` on the div and `__sse{id}` on the object inside.
// Many carriers name the deck on the div alone.
const wrapperIdRegex = /^__ss[e_]?(\d+)$/

// Two players, the presentation one and the document one, sharing a query.
const flashPlayerPathRegex = /\/swf\/(?:ssplayer\d?|doc_player)\.swf$/

// A url-safe path segment that is not `.` or `..`.
const safePageSegmentRegex = /^(?!\.+$)[A-Za-z0-9_.-]+$/

const composeEmbed = (deck: string, fields?: Partial<EmbedResolverResult>): EmbedResolverResult => {
  return {
    provider: 'slideshare',
    id: deck,
    src: `https://www.slideshare.net/slideshow/embed_code/${deck}`,
    ...fields,
  }
}

export const slideshareResolveEmbed = (link: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(link, slideshareHosts)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const marker = segments.indexOf('embed_code')

  if (marker < 0) {
    return
  }

  // `/slideshow/embed_code/key/{key}` is the current form and `/slideshow/embed_code/{id}` the
  // one it replaced. The key form is left as it stands. The numeric one is already canonical.
  const isKeyed = segments[marker + 1] === 'key'
  const deck = isKeyed ? segments[marker + 2] : segments[marker + 1]

  if (!deck) {
    return
  }

  if (!(isKeyed ? safeDeckKeyRegex : safeDeckIdRegex).test(deck)) {
    return
  }

  return isKeyed
    ? {
        provider: 'slideshare',
        id: deck,
        src: `https://www.slideshare.net/slideshow/embed_code/key/${deck}`,
      }
    : composeEmbed(deck)
}

const captionLinkSelector = 'a[href*="slideshare.net/"]'

const readPageSegments = (anchor: Nullish<Element>): Array<string> => {
  const parsed = parseUrlOnHosts(attr(anchor, 'href'), slideshareHosts)

  return parsed ? getPathSegments(parsed) : []
}

// The caption's links all sit on the platform's own host: the deck's page is `/{account}/{slug}`
// and its owner `/{account}`. The 2011 caption writes a bare `slideshare.net/` link in the same
// sentence.
const readCaption = (caption: Nullish<Element>): Partial<EmbedResolverResult> => {
  const page = find(caption, captionLinkSelector, (anchor) => readPageSegments(anchor).length > 1)
  const account = readPageSegments(page)[0]
  // A route word has the shape of a handle: the 2008 caption offers `slideshare.net/upload` one
  // anchor after the deck it names.
  const owner = account
    ? find(caption, captionLinkSelector, (anchor) => {
        const segments = readPageSegments(anchor)

        return segments.length === 1 && segments[0] === account
      })
    : undefined

  return {
    url: attr(page, 'href'),
    title: attr(page, 'title') ?? text(page),
    author: text(owner),
  }
}

// A CMS leaves debris between the player and its caption: a `<br>`, or the empty half of a
// paragraph the parser split when the caption's `<div>` turned up inside a `<p>`.
const skipEmptyBlocks = (node: Nullish<Element>): Nullish<Element> => {
  let candidate = node

  while (
    candidate &&
    (candidate.localName === 'br' || (!candidate.firstElementChild && !text(candidate)))
  ) {
    candidate = candidate.nextElementSibling
  }

  return candidate
}

// The pre-2015 snippets wrap the player and the caption in one `__ss_{id}` div named for the deck.
// The share dialog dropped that wrapper and ships the caption as the block right after the
// iframe, where Blogger and WordPress leave it.
const findCaption = (element: Element, wrapper: Nullish<Element>): Nullish<Element> => {
  if (wrapper) {
    return wrapper
  }

  const sibling = element.nextElementSibling

  if (find(sibling, captionLinkSelector)) {
    return sibling
  }

  const parent = element.parentElement
  const candidate =
    skipEmptyBlocks(sibling) ??
    (parent?.lastElementChild === element ? skipEmptyBlocks(parent.nextElementSibling) : undefined)

  // A block naming a deck without its owner is prose about the next deck as often as a caption.
  return readCaption(candidate).author ? candidate : undefined
}

const consumeCaption = (
  element: Element,
  wrapper: Nullish<Element>,
): Partial<EmbedResolverResult> => {
  const caption = findCaption(element, wrapper)
  const fields = readCaption(caption)

  // Removing the __ss_{id} wrapper would take the player inside it with the caption.
  if (!wrapper && fields.url && fields.author) {
    caption?.remove()
  }

  return fields
}

// Neither player carries the numeric id: the swf query names the deck by a document key from a
// different id space, and the iframe url by an embed key.
const readWrapper = (element: Element): { deck?: string; wrapper?: Element } => {
  let deck: string | undefined
  let wrapper: Element | undefined

  // The outermost match wins: the caption sits on the __ss_ div, not the __sse object inside.
  for (let node: Element | null = element; node; node = node.parentElement) {
    const id = attr(node, 'id')?.match(wrapperIdRegex)?.[1]

    if (id) {
      deck = id
      wrapper = node
    }
  }

  return { deck, wrapper }
}

// The embed url names the deck and nothing else, so its page, its name and its owner come from
// the caption the snippet ships with the iframe, the same one the Flash repair reads.
const slideshareResolveIframeEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const resolved = slideshareResolveEmbed(link)

  if (!resolved) {
    return
  }

  const { wrapper } = readWrapper(element)
  const caption = consumeCaption(element, wrapper)
  const title = caption.title ?? attr(element, 'title')

  return { ...resolved, ...caption, title }
}

// SlideShare's player iframe, which names only the deck, and the caption the dialog ships with it.
export const slideshareIframeEmbedResolver = createUrlEmbedResolver(
  slideshareHosts,
  slideshareResolveIframeEmbed,
)

// Flash died in 2020 and these embeds have rendered nothing since, but the markup is still in
// old posts and their feeds. The numeric id in the wrapper is the same id the modern embed
// route accepts, so the dead player can be replaced by one that works.
export const slideshareFlashResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(src, placeholderBaseUrl)

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const { deck, wrapper } = readWrapper(element)

  if (!deck) {
    return
  }

  const caption = consumeCaption(element, wrapper)

  // The swf query names the deck's owner and slug, which compose the same page the wrapper
  // links to. It is the fallback for a snippet that kept the player and dropped the wrapper's
  // anchor.
  const account = keepIfMatches(parsed.searchParams.get('userName'), safePageSegmentRegex)
  const slug = keepIfMatches(parsed.searchParams.get('stripped_title'), safePageSegmentRegex)
  const composed = account && slug ? `https://www.slideshare.net/${account}/${slug}` : undefined

  return composeEmbed(deck, { ...caption, url: caption.url ?? composed })
}

// SlideShare's Flash player, dead since 2020, inside the __ss_{id} wrapper that names the deck.
export const slideshareFlashEmbedResolver = createUrlEmbedResolver(
  slideshareHosts,
  slideshareFlashResolveEmbed,
)
