import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, text } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const slideshareHosts = ['slideshare.net', 'slidesharecdn.com']

// Two id spaces address one deck. The modern embed names it by an opaque key, the pre-2015
// one by the deck's numeric id, and both still serve: opening `/slideshow/embed_code/6435157`
// lands on the key form and renders the deck (checked in a browser 2026-08-13).
const safeDeckKeyRegex = /^[A-Za-z0-9]{10,20}$/
const safeDeckIdRegex = /^\d{4,12}$/

// The Flash wrapper carries the numeric id twice, on the div that holds the player and on the
// object inside it: `id="__ss_6435157"` and `id="__sse6435157"`. The div's spelling is the one
// that matters: many carriers name the deck on the div alone, so accepting only the object's
// spelling would lose them.
const wrapperIdRegex = /^__ss[e_]?(\d{4,12})$/

// Two players, the presentation one and the document one, sharing a query.
const flashPlayerPathRegex = /\/swf\/(?:ssplayer\d?|doc_player)\.swf$/

const composeEmbed = (deck: string, url?: string, title?: string): EmbedResolverResult => {
  return {
    provider: 'slideshare',
    id: deck,
    src: `https://www.slideshare.net/slideshow/embed_code/${deck}`,
    url,
    title,
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

export const slideshareIframeEmbedResolver = createUrlEmbedResolver(
  slideshareHosts,
  slideshareResolveEmbed,
)

// The wrapper the Flash snippet builds around the player, which is where the deck's numeric id
// and its human-facing link live. The player itself carries neither: its swf query names the
// deck by a document key from a different id space, so the wrapper is the only route to a url
// that can be minted.
const readWrapper = (element: Element): { deck?: string; url?: string; title?: string } => {
  let node: Element | null = element
  let deck: string | undefined
  let anchor: Element | undefined

  // Both the outer div and the object inside it carry the id, and only the outer one holds the
  // deck's link, so finding an id is not a reason to stop climbing.
  while (node && (!deck || !anchor)) {
    deck ??= attr(node, 'id')?.match(wrapperIdRegex)?.[1]
    anchor ??= find(node, 'a[href*="slideshare.net/"]')
    node = node.parentElement
  }

  return {
    deck,
    url: attr(anchor, 'href'),
    title: attr(anchor, 'title') ?? text(anchor),
  }
}

// Flash died in 2020 and these embeds have rendered nothing since, but the markup is still in
// old posts and their feeds. The numeric id in the wrapper is the same id the modern embed
// route accepts, so the dead player can be replaced by one that works.
export const slideshareFlashResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(src, 'https://example.com')

  if (!parsed || !flashPlayerPathRegex.test(parsed.pathname)) {
    return
  }

  const { deck, url, title } = readWrapper(element)

  if (!deck) {
    return
  }

  // The swf query names the deck's owner and slug, which compose the same page the wrapper
  // links to. It is the fallback for a snippet that kept the player and dropped the wrapper's
  // anchor.
  const account = parsed.searchParams.get('userName')
  const slug = parsed.searchParams.get('stripped_title')
  const composed = account && slug ? `https://www.slideshare.net/${account}/${slug}` : undefined

  return composeEmbed(deck, url ?? composed, title || undefined)
}

export const slideshareFlashEmbedResolver = createUrlEmbedResolver(
  slideshareHosts,
  slideshareFlashResolveEmbed,
)
