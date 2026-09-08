import { getPathSegments, type Nullish, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, keepIfMatches, text } from '../utils/dom.js'
import { parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const slideshareHosts = ['slideshare.net', 'slidesharecdn.com']

// Two id spaces address one deck. The modern embed names it by an opaque key, the pre-2015
// one by the deck's numeric id, and both still serve: opening `/slideshow/embed_code/6435157`
// lands on the key form and renders the deck (checked in a browser 2026-08-13).
//
// Neither length is checked. `embed_code` and the `key` segment after it are what select a
// deck, and each id sits in the one position behind them, so a bound would only refuse the next
// length SlideShare mints. What the classes do is separate the two spaces from each other,
// since digits cannot be read as a key nor `key` as a numeric id, and exclude the dot, which
// keeps a file on the host playable when the enclosure probe offers it here.
const safeDeckKeyRegex = /^[A-Za-z0-9]+$/
const safeDeckIdRegex = /^\d+$/

// The Flash wrapper carries the numeric id twice, on the div that holds the player and on the
// object inside it: `id="__ss_6435157"` and `id="__sse6435157"`. The div's spelling is the one
// that matters: many carriers name the deck on the div alone, so accepting only the object's
// spelling would lose them. The `__ss` prefix is what tells the wrapper from any other element
// carrying an id, so only the digits are checked after it.
const wrapperIdRegex = /^__ss[e_]?(\d+)$/

// Two players, the presentation one and the document one, sharing a query.
const flashPlayerPathRegex = /\/swf\/(?:ssplayer\d?|doc_player)\.swf$/

// The owner and the slug come off the swf query decoded, and both are written into the deck's
// page url as path segments, so a separator or a dot segment in either would let the feed pick
// the path. The class is the url-safe alphabet; the lookahead refuses `.` and `..`, which the
// class would otherwise admit.
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

  // The keyed url is already the canonical embed, so it is kept whole instead of rebuilt from
  // the key. The numeric one goes through the same composer as the Flash repair.
  return isKeyed
    ? {
        provider: 'slideshare',
        id: deck,
        src: `https://www.slideshare.net/slideshow/embed_code/key/${deck}`,
      }
    : composeEmbed(deck)
}

const captionLinkSelector = 'a[href*="slideshare.net/"]'

// The caption's links all sit on the platform's own host, so the path is what tells them apart:
// the deck's page is `/{account}/{slug}` and its owner `/{account}`. Counting is also what drops
// the bare `slideshare.net/` link the 2011 caption writes in the same sentence, which reading the
// first anchor takes for the deck whenever the deck's own anchor has been stripped.
const readPageSegments = (anchor: Nullish<Element>): Array<string> => {
  const parsed = parseUrlOnHosts(attr(anchor, 'href'), slideshareHosts)

  return parsed ? getPathSegments(parsed) : []
}

// Reads one deck's caption out of the block that holds it, never across two. `find` takes the
// first match in document order, and the deck's own anchor leads every dialect of the caption.
//
// The owner is taken only where its single segment is the account the deck's page names. A route
// word has exactly the shape of a handle, so that agreement is the only thing separating them:
// the 2008 caption offers `slideshare.net/upload` one anchor after the deck it names, and a post
// linking `slideshare.net/langwitches/` in prose put `author="SlideShare"` on a placeholder. That
// is discrimination rather than plausibility, and it is why an owner with no deck page beside it
// is dropped instead of guessed at.
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

// A CMS leaves debris between the player and its caption: a `<br>`, or the empty half of a
// paragraph the parser split when the caption's `<div>` turned up inside a `<p>`. None of it
// carries anything, so none of it is the caption, and none of it is a player either, which is
// what keeps the walk below from reaching the next deck's snippet.
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

// Where one deck's caption sits, which is the whole difficulty here: a post carrying several
// decks puts each deck's caption exactly where a climb finds an earlier deck's.
//
// The pre-2015 snippets wrap the player and the caption in one `__ss_{id}` div named for the
// deck, so everything inside it is this deck's and nothing outside it is, and the id is the
// bound. The share dialog dropped that wrapper and ships the caption as the block right after
// the iframe, where Blogger and WordPress leave it, and that adjacency is the whole of the
// association.
const findCaption = (element: Element, wrapper: Nullish<Element>): Nullish<Element> => {
  if (wrapper) {
    return wrapper
  }

  const sibling = element.nextElementSibling

  if (find(sibling, captionLinkSelector)) {
    return sibling
  }

  // Anything further is prose as often as it is a caption: a post listing several decks names
  // the next one in the paragraph after this player, and reading any slideshare link from that
  // distance labels this deck with another deck's page. So the dialog's own shape is the only
  // one taken from there, the deck's page beside its owner's, which prose does not write.
  const parent = element.parentElement
  const candidate =
    skipEmptyBlocks(sibling) ??
    (parent?.lastElementChild === element ? skipEmptyBlocks(parent.nextElementSibling) : undefined)

  return readCaption(candidate).author ? candidate : undefined
}

// The wrapper the pre-2015 snippet builds around the player, which is where the deck's numeric
// id lives. Neither player carries it: the swf query names the deck by a document key from a
// different id space, and the iframe url by an embed key. Both the outer div and the object
// inside it spell it, `__ss_6435157` and `__sse6435157`, and only the outer one holds the
// caption, so the climb takes the outermost that matches rather than the first.
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

// The embed url names the deck and nothing else, so its page, its name and its owner come from
// the caption the snippet ships with the iframe, the same one the Flash repair reads.
const slideshareResolveIframeEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const resolved = slideshareResolveEmbed(link)
  const { wrapper } = readWrapper(element)

  return resolved && { ...resolved, ...readCaption(findCaption(element, wrapper)) }
}

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

  const caption = readCaption(findCaption(element, wrapper))

  // The swf query names the deck's owner and slug, which compose the same page the wrapper
  // links to. It is the fallback for a snippet that kept the player and dropped the wrapper's
  // anchor.
  const account = keepIfMatches(parsed.searchParams.get('userName'), safePageSegmentRegex)
  const slug = keepIfMatches(parsed.searchParams.get('stripped_title'), safePageSegmentRegex)
  const composed = account && slug ? `https://www.slideshare.net/${account}/${slug}` : undefined

  return composeEmbed(deck, { ...caption, url: caption.url ?? composed })
}

export const slideshareFlashEmbedResolver = createUrlEmbedResolver(
  slideshareHosts,
  slideshareFlashResolveEmbed,
)
