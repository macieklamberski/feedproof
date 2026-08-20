import { isHostOf, isSubdomainOf } from 'trousse'
import type {
  CiteResolverResult,
  EmbedResolver,
  EmbedResolverResult,
  MediaResolverResult,
  ParseDateFn,
  TransformContext,
  WidgetResolverResult,
} from '../types.js'
import { type GeneratedWrapperType, getElementDimensions, getWrapperRatio } from './dom.js'
import { resolveOrDropUrl, resolveOrKeepUrl } from './urls.js'

// A card's date is whatever string the site chose to display, so the caller gets one chance to
// normalize it and anything the parser rejects is kept verbatim, not dropped. Every path that
// writes a date goes through this, so resolver output and enrichment payloads are treated
// identically.
export const parseOrKeepDate = (
  date: string | undefined,
  parseDateFn: ParseDateFn | undefined,
): string | undefined => {
  return date ? (parseDateFn?.(date) ?? date) : undefined
}

// The elements that carry a third-party URL for someone else to render, each with the
// attribute holding it: `<object>` names that URL `data` while the other two use `src`, and
// that is the only difference between them. Adding a carrier is one line here, because both
// the selector and the reader below are derived from this.
//
// Legacy Flash markup nests an `<embed>` inside an `<object>` and both match. The outer one
// wins by document order and takes the inner with it.
const embedCarriers: Record<string, string> = {
  iframe: 'src',
  embed: 'src',
  object: 'data',
}

export const embedCarrierSelector = Object.entries(embedCarriers)
  .map(([tag, attribute]) => `${tag}[${attribute}]`)
  .join(', ')

export const readCarrierUrl = (element: Element): string => {
  return element.getAttribute(embedCarriers[element.localName] ?? 'src') ?? ''
}

// The size a publisher states on the carrier is trusted by default, because they chose it for the
// player they actually embedded. A resolver that has measured the platform can overrule that with
// `declaredSize: false`: Scribd states the same `height="500"` on every document it embeds and
// keeps the honest ratio in `data-aspect-ratio`, so a number from the markup is not always the
// better one.
type ResolverOptions = {
  declaredSize?: boolean
}

// A resolver whose selector names the platform's own markup.
export const createMarkupEmbedResolver = (
  selector: string,
  extract: (element: Element) => EmbedResolverResult | undefined,
  { declaredSize = true }: ResolverOptions = {},
): EmbedResolver => {
  return {
    selector,
    extract: (element) => {
      const result = extract(element)

      return declaredSize ? withDeclaredSize(element, result) : result
    },
  }
}

// What a carrier says about its size: the dimensions it declares, or the ratio a responsive
// wrapper implies when it declares none. Never both, which is the rule the placeholder carries too.
type EmbedSize = Pick<EmbedResolverResult, 'width' | 'height' | 'ratio'>

// The two questions asked of a size wherever one is merged: does it carry any dimension, and does
// it carry anything at all. Named once so every merge reads as the rule it applies. Typed on the
// field names alone so the normalized string record and the numeric result both qualify.
type SizeFields = { width?: unknown; height?: unknown; ratio?: unknown }

export const hasDimensions = (size: SizeFields): boolean => {
  return size.width !== undefined || size.height !== undefined
}

const hasSize = (size: SizeFields): boolean => {
  return hasDimensions(size) || size.ratio !== undefined
}

// Replaces a resolver's size with what the carrier declares on itself, whole: its dimensions, or
// a ratio of its own. A carrier that declares nothing leaves the resolver's size alone.
//
// Whole, because mixing the two sources describes something neither meant: a width the publisher
// stated beside a height the resolver derived is a box nobody measured. And on itself, because a
// ratio inferred from an ancestor's responsive wrapper says what shape the box around the player
// is, not what shape the player is. Read at full depth here it once turned a platform's own 9:16
// into a theme's blanket 16:9. So the ancestors are read only when the resolver stated no size at
// all: with nothing to beat, the wrapper's shape is the one signal left, and a sizeless player in
// a responsive wrapper still gets a placeholder that can reserve space.
export const withDeclaredSize = (
  element: Element,
  result: EmbedResolverResult | undefined,
): EmbedResolverResult | undefined => {
  if (!result) {
    return
  }

  const wrapperDepth = hasSize(result) ? 0 : undefined
  const declared = getEmbedSize(element, wrapperDepth)

  if (!hasSize(declared)) {
    return result
  }

  const { width: _width, height: _height, ratio: _ratio, ...rest } = result

  return { ...rest, ...declared }
}

// The size a carrier states: its dimensions where it declares any, else the ratio a responsive
// wrapper implies, so the placeholder can still reserve space. Dimensions outrank the ratio: they
// measure this player, while the wrapper only says what shape the box around it is. `wrapperDepth`
// bounds how far up the wrapper is looked for; 0 reads only the carrier itself.
export const getEmbedSize = (element: Element, wrapperDepth?: number): EmbedSize => {
  const dimensions = getElementDimensions(element)

  if (hasDimensions(dimensions)) {
    return {
      ...(dimensions.width !== undefined && { width: dimensions.width }),
      ...(dimensions.height !== undefined && { height: dimensions.height }),
    }
  }

  const ratio = getWrapperRatio(element, wrapperDepth)

  return ratio ? { ratio } : {}
}

// The write side of getEmbedSize: a size onto an element as real HTML attributes, each half only
// where it exists, since a fluid-width player states a height and nothing else.
export const setDimensions = (
  element: Element,
  size: Pick<EmbedResolverResult, 'width' | 'height'>,
): void => {
  if (size.width) {
    element.setAttribute('width', String(size.width))
  }

  if (size.height) {
    element.setAttribute('height', String(size.height))
  }
}

// Every provider matches the same carriers and differs only in which hosts it claims and
// how it reads an id out of the URL, so the match itself lives here. Keying on the URL
// rather than on markup is what separates these resolvers from the ones that recognise a
// platform's own class or attribute, and it is why the name says url and not iframe.
//
// The element travels alongside the url because a carrier can hold more than its src: an
// iframe's `title` is the one field a publisher's snippet states that the url does not carry.
// Resolvers that need nothing but the url ignore the second argument.
export const createUrlEmbedResolver = (
  hosts: Array<string>,
  extract: (url: string, element: Element) => EmbedResolverResult | undefined,
  { declaredSize = true }: ResolverOptions = {},
): EmbedResolver => {
  return {
    selector: embedCarrierSelector,
    extract: (element) => {
      const src = readCarrierUrl(element)

      if (!isHostOf(src, hosts) && !isSubdomainOf(src, hosts)) {
        return
      }

      const result = extract(src, element)

      return declaredSize ? withDeclaredSize(element, result) : result
    },
  }
}

// Tells a media result apart from an embed result in the widget pass: only media results
// carry the element tag to mint.
export const isMediaResult = (result: WidgetResolverResult): result is MediaResolverResult => {
  return 'tag' in result
}

// The iframe a rebuild transform mints in place of a facade, so anything that should hold for
// every rebuilt player is written once here rather than eleven times. A caller adds whatever its
// own facade stated on top: a title, a size, a shape, a poster it recovered.
//
// Deliberately not used for the probe iframe in injectEnclosures. That one is never inserted: it
// exists so url-keyed resolvers have a carrier to match their selector against, and giving it
// whatever emitted iframes carry would change what every resolver sees.
export const createIframe = (document: Document, src: string): HTMLElement => {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('src', src)

  return iframe
}

// The one native player every pass mints, whether the media came out of the markup or out of an
// enclosure. The poster and the dimensions are written only on video, which is the only tag they
// are valid on. Urls arrive resolved: a caller knows what its own source is relative to.
export const createMediaElement = (
  document: Document,
  result: MediaResolverResult,
): HTMLElement => {
  const media = document.createElement(result.tag)
  media.setAttribute('src', result.src)
  media.setAttribute('controls', '')

  if (result.tag === 'video') {
    if (result.poster) {
      media.setAttribute('poster', result.poster)
    }

    setDimensions(media, result)
  }

  return media
}

// What every image the pipeline mints states about itself.
type ImageFields = {
  src: string
  srcset?: string
  alt?: string
  width?: number
  height?: number
}

// The one image every pass mints, whether it stands for an enclosure, a platform's static render
// or an `<img>` recovered from a container that parked its url. Urls arrive resolved, the same
// terms `createMediaElement` sets, and `src` is required because an image without one is an empty
// box the reader still has to lay out.
export const createImage = (document: Document, fields: ImageFields): HTMLElement => {
  const image = document.createElement('img')
  image.setAttribute('src', fields.src)

  if (fields.srcset) {
    image.setAttribute('srcset', fields.srcset)
  }

  if (fields.alt) {
    image.setAttribute('alt', fields.alt)
  }

  setDimensions(image, fields)

  return image
}

// A platform that publishes a canonical static render of something it would otherwise show in a
// player: Datawrapper's chart png, Giphy's gif. The render goes inline where a reader sees it at
// once, and the interactive version stays one click away on the platform's own page.
export const createLinkedImage = (
  document: Document,
  fields: ImageFields & { href: string },
): HTMLElement => {
  const link = document.createElement('a')
  link.setAttribute('href', fields.href)
  link.appendChild(createImage(document, fields))

  return link
}

// Writes a field record as `data-{type}-*` attributes, replacing any the element already carries.
// A later pass that sets a field means it: an enrichment pass is the platform's own API answering
// about this exact embed, and that beats whatever a resolver read off the markup. A pass that
// wants to keep an existing value checks for it before calling, as assignVideoPosters does.
export const updatePlaceholder = <Type extends object>(
  element: Element,
  type: GeneratedWrapperType,
  fields: Type,
): void => {
  // Trimming here lets resolvers pass extracted text as-is. A value that is only
  // whitespace trims to an empty string and is skipped with the other empty fields.
  for (const [key, value] of Object.entries(fields)) {
    const name = `data-${type}-${key}`
    const cleaned = typeof value === 'string' ? value.trim() : value

    if (cleaned) {
      element.setAttribute(name, cleaned)
    }
  }
}

export const createPlaceholder = <Type extends object>(
  document: Document,
  type: GeneratedWrapperType,
  fields: Type,
): HTMLElement => {
  const element = document.createElement('div')
  updatePlaceholder(element, type, fields)

  return element
}

// Maps embed metadata to its `data-embed-*` field record. Key order is the
// attribute write order, so it's kept stable. Shared by embed creation and
// enrichment so the per-field rules live in one place.
export const normalizeEmbedFields = (
  metadata: Partial<EmbedResolverResult>,
): Record<string, string | undefined> => {
  return {
    src: metadata.src,
    provider: metadata.provider,
    id: metadata.id,
    url: metadata.url,
    thumbnail: metadata.thumbnail,
    width: metadata.width ? String(metadata.width) : undefined,
    height: metadata.height ? String(metadata.height) : undefined,
    ratio: metadata.ratio,
    title: metadata.title,
    description: metadata.description,
    author: metadata.author,
    avatar: metadata.avatar,
    publisher: metadata.publisher,
    date: metadata.date,
    duration: metadata.duration ? String(metadata.duration) : undefined,
  }
}

// A placeholder states its size as dimensions or as a ratio, never both, and the size moves as a
// unit. Every embed placeholder is written through here, creation and enrichment alike, which is
// what keeps the two from ever landing on the same element.
//
// A write that carries any size clears the whole size slot first, so what it brings lands whole.
// Writing width and height as independent attributes once let an enricher's width sit next to a
// resolver's height, a box neither of them measured (560 beside a fixed 190). Where a write
// brings both dimensions and a ratio, the dimensions win as the more specific claim.
export const updateEmbedPlaceholder = (
  element: Element,
  metadata: Partial<EmbedResolverResult>,
): void => {
  const fields = normalizeEmbedFields(metadata)

  if (hasSize(fields)) {
    element.removeAttribute('data-embed-width')
    element.removeAttribute('data-embed-height')
    element.removeAttribute('data-embed-ratio')
  }

  if (hasDimensions(fields)) {
    fields.ratio = undefined
  }

  updatePlaceholder(element, 'embed', fields)
}

// The page the embed stands for, which is where a reader sends a click, so it takes the drop
// answer. Cleaned once it resolves, because a resolver that carries this url out of the markup
// rather than minting it from an id hands over whatever the publisher pasted. A cleaner answering
// with nothing has not answered, and the url it was handed stands.
const prepareCanonicalUrl = (
  url: string | undefined,
  context: TransformContext,
): string | undefined => {
  const resolved = resolveOrDropUrl(url, context.resolveUrlFn, context.baseUrl)

  if (!resolved) {
    return
  }

  const cleaned = context.cleanUrlFn?.(resolved)

  return cleaned ? cleaned : resolved
}

// Everything an embed states about a url or a date, made ready to write: each url resolved against
// the base, the canonical one cleaned of whatever tracking the publisher pasted, the date handed to
// the caller's parser. Every pass that writes to a placeholder goes through this, whether the embed
// came from markup, from an enclosure or from an enricher's payload, so all three carry their
// fields on the same terms.
//
// Nothing here refuses to produce a result. A field that cannot be made good is left out and the
// rest still go on the element, because the three callers disagree about what a refusal would
// mean: an unbuilt markup placeholder falls through to the generic tier and still renders, while
// an unbuilt enclosure placeholder is simply never injected.
//
// `src` takes the drop answer like the canonical url, since it is the url the reader actually
// loads. The two passes that build a placeholder resolve their own before they decide to build at
// all and write it back over this one, so for them it is a second resolve of a url already
// resolved. Enrichment is the pass this is here for: it writes onto a placeholder that already
// has a working src, so a payload src that will not resolve is left out and the resolver's stands.
export const prepareEmbedMetadata = (
  metadata: Partial<EmbedResolverResult>,
  context: TransformContext,
): Partial<EmbedResolverResult> => {
  return {
    ...metadata,
    src: resolveOrDropUrl(metadata.src, context.resolveUrlFn, context.baseUrl),
    url: prepareCanonicalUrl(metadata.url, context),
    thumbnail: resolveOrKeepUrl(metadata.thumbnail, context.resolveUrlFn, context.baseUrl),
    avatar: resolveOrKeepUrl(metadata.avatar, context.resolveUrlFn, context.baseUrl),
    date: parseOrKeepDate(metadata.date, context.parseDateFn),
  }
}

// `src` is the one field a placeholder cannot be built without, so it is required inside the
// metadata rather than passed beside it: a second argument would let the two disagree.
export const createEmbedPlaceholder = (
  document: Document,
  metadata: Partial<EmbedResolverResult> & Pick<EmbedResolverResult, 'src'>,
): HTMLElement => {
  const element = document.createElement('div')
  updateEmbedPlaceholder(element, metadata)

  return element
}

// Maps cite metadata to its `data-cite-*` field record. Key order is the attribute write
// order, so it's kept stable. Shared by cite creation and enrichment so the field set lives
// in one place: an enricher passing a whole API payload through cannot reach beyond these
// names, and no value ever ends up in an attribute name.
export const normalizeCiteFields = (
  result: Partial<CiteResolverResult>,
): Record<string, string | undefined> => {
  return {
    provider: result.provider,
    description: result.description,
    caption: result.caption,
    author: result.author,
    publisher: result.publisher,
    date: result.date,
    kind: result.kind,
    url: result.url,
    title: result.title,
    icon: result.icon,
    thumbnail: result.thumbnail,
  }
}

// Everything a cite states about a url or a date, made ready to write: each url resolved against
// the base, the canonical one cleaned of whatever tracking the publisher pasted, the date handed to
// the caller's parser. Both passes that write to a cite placeholder go through this, whether the
// card came from markup or from an enricher's payload, so the two carry their fields on the same
// terms.
//
// The canonical url is kept when it will not resolve, unlike an embed's, because a cite is mostly
// text: a card with a dead link still reads as the title, description and image it carries. So
// nothing here refuses to produce a result.
//
// cleanAnchorUrls runs earlier, so the resolvers that read their url from an anchor href get it
// already cleaned. The ones reading an attribute or a JSON blob (Tumblr, Substack, Discourse,
// XenForo, Tistory, Paragraph) never pass through it, and neither does an enricher's payload, so
// their redirect wrappers are unwrapped here. Re-cleaning an already-clean url is a no-op.
export const prepareCiteMetadata = (
  result: Partial<CiteResolverResult>,
  context: TransformContext,
): Partial<CiteResolverResult> => {
  const url = resolveOrKeepUrl(result.url, context.resolveUrlFn, context.baseUrl)

  return {
    ...result,
    url: url ? (context.cleanUrlFn?.(url) ?? url) : undefined,
    icon: resolveOrKeepUrl(result.icon, context.resolveUrlFn, context.baseUrl),
    thumbnail: resolveOrKeepUrl(result.thumbnail, context.resolveUrlFn, context.baseUrl),
    date: parseOrKeepDate(result.date, context.parseDateFn),
  }
}

export const updateCitePlaceholder = (
  element: Element,
  result: Partial<CiteResolverResult>,
): void => {
  updatePlaceholder(element, 'cite', normalizeCiteFields(result))
}

export const createCitePlaceholder = (
  document: Document,
  result: CiteResolverResult,
): HTMLElement => {
  return createPlaceholder(document, 'cite', normalizeCiteFields(result))
}
