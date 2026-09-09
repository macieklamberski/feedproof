import { getPathSegments, type Nullish, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, keepIfMatches, text } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const slideshareHosts = ['slideshare.net', 'slidesharecdn.com']

const safeDeckKeyRegex = /^[A-Za-z0-9]+$/
const safeDeckIdRegex = /^\d+$/

// The Flash wrapper spells its id `__ss_{id}` on the div and `__sse{id}` on the object inside.
const wrapperIdRegex = /^__ss[e_]?(\d+)$/

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

const readCaption = (caption: Nullish<Element>): Partial<EmbedResolverResult> => {
  const page = find(caption, captionLinkSelector, (anchor) => readPageSegments(anchor).length > 1)
  const account = readPageSegments(page)[0]
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

  return readCaption(candidate).author ? candidate : undefined
}

const consumeCaption = (
  element: Element,
  wrapper: Nullish<Element>,
): Partial<EmbedResolverResult> => {
  const caption = findCaption(element, wrapper)
  const fields = readCaption(caption)

  if (!wrapper && fields.url && fields.author) {
    caption?.remove()
  }

  return fields
}

const readWrapper = (element: Element): { deck?: string; wrapper?: Element } => {
  let deck: string | undefined
  let wrapper: Element | undefined

  for (let node: Element | null = element; node; node = node.parentElement) {
    const id = attr(node, 'id')?.match(wrapperIdRegex)?.[1]

    if (id) {
      deck = id
      wrapper = node
    }
  }

  return { deck, wrapper }
}

const slideshareResolveIframeEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const resolved = slideshareResolveEmbed(link)
  const { wrapper } = readWrapper(element)

  return resolved && { ...resolved, ...consumeCaption(element, wrapper) }
}

// SlideShare's player iframe, which names only the deck, and the caption the dialog ships with it.
export const slideshareIframeEmbedResolver = createUrlEmbedResolver(
  slideshareHosts,
  slideshareResolveIframeEmbed,
)

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
