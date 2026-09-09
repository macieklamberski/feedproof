import type { DomTransform, WidgetResolver } from '../../types.js'

// True when one of the widget resolvers claims the iframe, which is the same test convertWidgets
// makes, so only iframes that would become a placeholder or a recovered media element pass.
const isResolvedIframe = async (
  iframe: Element,
  resolvers: ReadonlyArray<WidgetResolver>,
): Promise<boolean> => {
  for (const resolver of resolvers) {
    if (iframe.matches(resolver.selector) && (await resolver.extract(iframe))) {
      return true
    }
  }

  return false
}

// A lazy-load plugin's <noscript> fallback iframe, which a reader hides along with the noscript.
// WP Rocket LazyLoad and a3 Lazy Load wrap the original video <iframe> this way.
export const surfaceNoscriptEmbeds: DomTransform = (context) => async (document) => {
  for (const noscript of document.querySelectorAll('noscript')) {
    const iframe = noscript.querySelector('iframe[src]')

    // Ungated, this would surface Google Tag Manager, reCAPTCHA and ad-network noscript frames.
    if (!iframe || !(await isResolvedIframe(iframe, context.widgetResolvers))) {
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
