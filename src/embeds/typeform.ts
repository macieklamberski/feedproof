import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const typeformHosts = ['typeform.com']

// Two id generations share one url template. A form id is short and mixed case (`MTt3Pw7K`), and
// a live-embed id is a 26-char Crockford base32 ULID (`01HCZ4DNW8JM6PEGNTQWF2PW87`).
const safeIdRegex = /^[A-Za-z0-9]+$/

// The share panel writes the form's own title into an iframe-props string, `title=<the
// title>,<other props>`, which is the only human-readable text the empty div carries.
const titlePropRegex = /(?:^|,)title=([^,]+)/

// Four of the five embed types are launchers: a button that opens the form in an overlay.
// Those are chrome that was never article content, and each carries the same id as the
// widget, so they have to be excluded before the id is read.
const launcherAttributes = ['data-tf-popup', 'data-tf-slider', 'data-tf-popover', 'data-tf-sidetab']

const composeEmbed = (id: string, title?: string): EmbedResolverResult | undefined => {
  if (!safeIdRegex.test(id)) {
    return
  }

  const result: EmbedResolverResult = {
    provider: 'typeform',
    id,
    src: `https://form.typeform.com/to/${id}`,
    url: `https://form.typeform.com/to/${id}`,
  }

  return title ? { ...result, title } : result
}

const readTitle = (element: Element): string | undefined => {
  return attr(element, 'data-tf-iframe-props')?.match(titlePropRegex)?.[1]?.trim() || undefined
}

// Typeform's inline embed is an empty div only the SDK hydrates into an iframe.
// Both generations do this, the current `data-tf-*` family and the `typeform-widget` class whose
// loader is still served.
export const typeformWidgetEmbedResolver = createMarkupEmbedResolver(
  'div[data-tf-widget], div[data-tf-live], div.typeform-widget[data-url]',
  (element) => {
    if (launcherAttributes.some((name) => element.hasAttribute(name))) {
      return
    }

    const title = readTitle(element)

    // Each carrier is validated on its own, so a malformed id in one does not hide a usable id
    // in another: a block can carry all three, and only the last generation is ever complete.
    return (
      composeEmbed(attr(element, 'data-tf-widget') ?? '', title) ??
      // A live id's /to/ url lands on the explore page, and enrichment maps it to the form id.
      // `api.typeform.com/single-embed/<liveId>` answers key-free with the real form id.
      composeEmbed(attr(element, 'data-tf-live') ?? '', title) ??
      typeformResolveEmbed(attr(element, 'data-url') ?? '')
    )
  },
)

// `form.typeform.com/to/<id>` is what the platform's oEmbed emits, and the per-account
// `<user>.typeform.com/to/<id>` still serves the same form without redirecting, so both
// reach here. The query is telemetry (`typeform-embed`, `typeform-medium`) and is dropped.
export const typeformResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, typeformHosts)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)

  return segments[0] === 'to' && segments[1] ? composeEmbed(segments[1]) : undefined
}

// A Typeform form iframe, on form.typeform.com or a per-account subdomain.
export const typeformIframeEmbedResolver = createUrlEmbedResolver(
  typeformHosts,
  typeformResolveEmbed,
)
