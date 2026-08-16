import type { DomTransform } from '../../types.js'

const chartIdRegex = /datawrapper\.dwcdn\.net\/([A-Za-z0-9]+)/
const visWrapperIdRegex = /^datawrapper-vis-([A-Za-z0-9]+)$/
// Datawrapper ships a resize listener next to its iframes: pure noise once the chart is a
// static image. Every modern minified variant postMessages on `datawrapper-height`. The
// pre-2017 form keys a `window.datawrapper[<id>]` object instead.
const resizeScriptRegex = /datawrapper-height|window\.datawrapper/

const getChartId = (url: string | null | undefined): string | undefined => {
  return url?.match(chartIdRegex)?.[1]
}

// Builds the chart as a linked <img>: the chart inline, its interactive version one click away,
// so the image transforms downstream dimension and proxy it like any other image.
//
// Datawrapper publishes a complete static PNG render of every chart at `dwcdn.net/<id>/full.png`,
// derivable from the chart id alone, and names that same file in the `<noscript>` of its own
// embed, so this is the platform's declared fallback rather than a guess. It shows the chart
// immediately whichever carrier the feed used: the script form shows nothing without JS, and the
// iframe form renders only by loading a third-party frame the reader may not allow.
const buildChartImage = (document: Document, chartId: string, alt: string | null): HTMLElement => {
  const image = document.createElement('img')
  image.setAttribute('src', `https://datawrapper.dwcdn.net/${chartId}/full.png`)

  if (alt) {
    image.setAttribute('alt', alt)
  }

  const link = document.createElement('a')
  link.setAttribute('href', `https://datawrapper.dwcdn.net/${chartId}/`)
  link.appendChild(image)

  return link
}

export const convertDatawrapperEmbeds: DomTransform = () => (document) => {
  // Responsive iframe (the dominant form): `<iframe src="dwcdn.net/<id>/<ver>/">`. The alt
  // comes from the iframe's title. Skip `#?secret=` preview URLs: the chart is unpublished,
  // so full.png 404s. Leave those for the generic iframe placeholder, which keeps the secret.
  for (const iframe of document.querySelectorAll('iframe[src*="datawrapper.dwcdn.net/"]')) {
    const src = iframe.getAttribute('src')
    const chartId = getChartId(src)

    if (!chartId || src?.includes('secret=')) {
      continue
    }

    iframe.replaceWith(buildChartImage(document, chartId, iframe.getAttribute('title')))
  }

  // Script / web-component form: `<div id="datawrapper-vis-<id>">` wrapping the embed.js loader
  // and a `<noscript><img full.png>` fallback. The id segment carries the chart id, so this
  // works whether or not the noscript survived. Replace the whole wrapper (loader script and
  // fallback go with it). Take the alt from the fallback img when present.
  for (const wrapper of document.querySelectorAll('[id^="datawrapper-vis-"]')) {
    const chartId = wrapper.id.match(visWrapperIdRegex)?.[1]

    if (!chartId) {
      continue
    }

    const fallback = wrapper.querySelector('img[src*="datawrapper.dwcdn.net/"]')
    wrapper.replaceWith(buildChartImage(document, chartId, fallback?.getAttribute('alt') ?? null))
  }

  // A `data-frame-src` chart embed (Texas Tribune / @newswire/frames) is already an <iframe> by
  // now: rebuildDeferredIframes materialized it upstream, so the iframe pass above handles it.

  // Link form: some feeds ship only `<div class="datawrapper-embed"><a href="dwcdn/<id>/">`.
  // The img-child guard keeps a converted image (also an `a[href*=dwcdn]`) from being
  // reprocessed when it happens to sit inside a `datawrapper-embed` wrapper.
  for (const wrapper of document.querySelectorAll('.datawrapper-embed')) {
    const anchor = wrapper.querySelector('a[href*="datawrapper.dwcdn.net/"]')

    if (!anchor || anchor.querySelector('img')) {
      continue
    }

    const chartId = getChartId(anchor.getAttribute('href'))

    if (!chartId) {
      continue
    }

    wrapper.replaceWith(buildChartImage(document, chartId, null))
  }

  for (const script of document.querySelectorAll('script')) {
    if (resizeScriptRegex.test(script.textContent ?? '')) {
      script.remove()
    }
  }
}
