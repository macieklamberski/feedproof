import type { DomTransform, EmbedResolver } from '../../types.js'

// True when an iframe is a recognized video embed, i.e. one of the embed resolvers
// claims it. This is the same check replaceEmbedsWithPlaceholders makes, so only
// iframes that would become a real video placeholder pass.
const isVideoIframe = async (
  iframe: Element,
  resolvers: ReadonlyArray<EmbedResolver>,
): Promise<boolean> => {
  for (const resolver of resolvers) {
    if (iframe.matches(resolver.selector) && (await resolver.extract(iframe))) {
      return true
    }
  }

  return false
}

// Lazy-load plugins (WP Rocket LazyLoad, a3 Lazy Load, and similar) wrap the original
// video <iframe> in a <noscript> as the no-JS fallback. A reader runs no JS, but the
// browser still hides <noscript> content (and sanitizers strip it), so the embed never
// renders. Hoist the content out when the noscript holds a recognized video iframe.
//
// The video check is essential: <noscript><iframe> is also how Google Tag Manager,
// reCAPTCHA, and ad networks ship their fallbacks, and those must never be surfaced
// into content. Gating on the embed resolvers excludes them.
export const surfaceNoscriptEmbeds: DomTransform = (context) => async (document) => {
  for (const noscript of document.querySelectorAll('noscript')) {
    const iframe = noscript.querySelector('iframe[src]')

    if (!iframe || !(await isVideoIframe(iframe, context.embedResolvers))) {
      continue
    }

    const parent = noscript.parentNode
    if (!parent) {
      continue
    }

    while (noscript.firstChild) {
      parent.insertBefore(noscript.firstChild, noscript)
    }

    noscript.remove()
  }
}
