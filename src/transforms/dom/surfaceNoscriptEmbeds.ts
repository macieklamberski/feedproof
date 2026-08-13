import type { DomTransform, WidgetResolver } from '../../types.js'

const gistScriptSelector = 'script[src*="gist.github.com"]'

// True when an iframe is a recognized video embed, i.e. one of the widget resolvers
// claims it. This is the same check convertWidgets makes, so only iframes that would
// become a video placeholder (or a recovered media element) pass.
const isVideoIframe = async (
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

// True when a noscript holds the source of the GitHub Gist embedded beside it. The gist
// <script> is what makes this readable as a fallback for a specific embed; a bare
// <noscript> on its own carries prose, an image or a tracking pixel far more often.
const isGistSource = (noscript: Element): boolean => {
  if (!noscript.querySelector('pre, code')) {
    return false
  }

  return Boolean(noscript.parentElement?.querySelector(gistScriptSelector))
}

// Lazy-load plugins (WP Rocket LazyLoad, a3 Lazy Load, and similar) wrap the original
// video <iframe> in a <noscript> as the no-JS fallback, and static site generators ship
// a Gist's source in a <noscript> beside the embed <script>. A reader runs no JS, but the
// browser still hides <noscript> content (and sanitizers strip it), so neither ever
// renders. Hoist the content out for those two shapes.
//
// Both gates are essential: <noscript><iframe> is also how Google Tag Manager, reCAPTCHA,
// and ad networks ship their fallbacks, and those must never be surfaced into content.
// Gating on the widget resolvers excludes them.
export const surfaceNoscriptEmbeds: DomTransform = (context) => async (document) => {
  for (const noscript of document.querySelectorAll('noscript')) {
    const iframe = noscript.querySelector('iframe[src]')
    const hasVideo = iframe ? await isVideoIframe(iframe, context.widgetResolvers) : false

    if (!hasVideo && !isGistSource(noscript)) {
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
