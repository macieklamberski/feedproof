import type { DomTransform } from '../../types.js'
import { attr } from '../../utils/dom.js'
import { createLinkedImage } from '../../utils/widgets.js'

const chartIdRegex = /datawrapper\.dwcdn\.net\/([A-Za-z0-9]+)/
const visWrapperIdRegex = /^datawrapper-vis-([A-Za-z0-9]+)$/
// Datawrapper ships a resize listener next to its iframes: pure noise once the chart is a
// static image. Every modern minified variant postMessages on `datawrapper-height`. The
// pre-2017 form keys a `window.datawrapper[<id>]` object instead.
const resizeScriptRegex = /datawrapper-height|window\.datawrapper/

const getChartId = (url: string | null | undefined): string | undefined => {
  return url?.match(chartIdRegex)?.[1]
}

// Datawrapper publishes a static PNG of every chart at dwcdn.net/<id>/full.png and names that
// same file in the <noscript> of its own embed.
const buildChartImage = (document: Document, chartId: string, alt?: string): HTMLElement => {
  return createLinkedImage(document, {
    src: `https://datawrapper.dwcdn.net/${chartId}/full.png`,
    href: `https://datawrapper.dwcdn.net/${chartId}/`,
    alt,
  })
}

// A Datawrapper chart as a script loader, an iframe or a bare link: the script needs JS, the
// iframe a third-party frame a reader may block, and the link shows no chart at all.
export const convertDatawrapperEmbeds: DomTransform = () => (document) => {
  // Responsive iframe (the dominant form): `<iframe src="dwcdn.net/<id>/<ver>/">`. The alt
  // comes from the iframe's title. Skip `#?secret=` preview URLs: the chart is unpublished,
  // so full.png 404s. Leave those for the generic iframe placeholder, which keeps the secret.
  for (const iframe of document.querySelectorAll('iframe[src*="datawrapper.dwcdn.net/"]')) {
    const src = iframe.getAttribute('src')
    const chartId = getChartId(src)

    // A secret= preview url is an unpublished chart whose full.png 404s.
    if (!chartId || src?.includes('secret=')) {
      continue
    }

    iframe.replaceWith(buildChartImage(document, chartId, attr(iframe, 'title')))
  }

  // Script form: <div id="datawrapper-vis-<id>"> wrapping the embed.js loader and a
  // <noscript><img full.png> fallback.
  for (const wrapper of document.querySelectorAll('[id^="datawrapper-vis-"]')) {
    const chartId = wrapper.id.match(visWrapperIdRegex)?.[1]

    if (!chartId) {
      continue
    }

    const fallback = wrapper.querySelector('img[src*="datawrapper.dwcdn.net/"]')
    wrapper.replaceWith(buildChartImage(document, chartId, attr(fallback, 'alt')))
  }

  // A `data-frame-src` chart embed (Texas Tribune / @newswire/frames) is already an <iframe> by
  // now: rebuildDeferredIframes materialized it upstream, so the iframe pass above handles it.
  // Link form: some feeds ship only <div class="datawrapper-embed"><a href="dwcdn/<id>/">.
  for (const wrapper of document.querySelectorAll('.datawrapper-embed')) {
    const anchor = wrapper.querySelector('a[href*="datawrapper.dwcdn.net/"]')

    // A converted image is itself an a[href*=dwcdn] and would be reminted without the img check.
    if (!anchor || anchor.querySelector('img')) {
      continue
    }

    const chartId = getChartId(anchor.getAttribute('href'))

    if (!chartId) {
      continue
    }

    wrapper.replaceWith(buildChartImage(document, chartId))
  }

  for (const script of document.querySelectorAll('script')) {
    if (resizeScriptRegex.test(script.textContent ?? '')) {
      script.remove()
    }
  }
}
