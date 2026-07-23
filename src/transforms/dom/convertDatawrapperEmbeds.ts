import type { DomTransform } from '../../types.js'

const chartIdRegex = /datawrapper\.dwcdn\.net\/([A-Za-z0-9]+)/

const getChartId = (url: string | null | undefined): string | undefined => {
  return url?.match(chartIdRegex)?.[1]
}

// Datawrapper publishes a complete static PNG render of every chart at
// `dwcdn.net/<id>/full.png`, derivable from the chart id alone. A feed reader runs no JS,
// so the interactive iframe/script embed shows nothing (or a bare link); the static render
// shows the chart immediately with no third-party load. Emit a linked <img> — the chart
// inline, its interactive version one click away — so the image transforms downstream
// dimension and proxy it like any other image.
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
  // Responsive iframe: `<iframe id="datawrapper-chart-<id>" src="dwcdn.net/<id>/<ver>/">`.
  // The alt comes from the iframe's title.
  for (const iframe of document.querySelectorAll('iframe[src*="datawrapper.dwcdn.net/"]')) {
    const chartId = getChartId(iframe.getAttribute('src'))

    if (!chartId) {
      continue
    }

    iframe.replaceWith(buildChartImage(document, chartId, iframe.getAttribute('title')))
  }

  // Script / web-component form: a `<noscript>` holds the static PNG fallback, its `src`
  // the chart and its `alt` the description. Replace the whole `datawrapper-vis` wrapper so
  // the sibling loader `<script>` goes with it.
  for (const noscript of document.querySelectorAll('noscript')) {
    const image = noscript.querySelector('img[src*="datawrapper.dwcdn.net/"]')
    const chartId = getChartId(image?.getAttribute('src'))

    if (!image || !chartId) {
      continue
    }

    const wrapper = noscript.closest('[id^="datawrapper-vis-"]') ?? noscript
    wrapper.replaceWith(buildChartImage(document, chartId, image.getAttribute('alt')))
  }

  // Link form: some feeds ship only `<div class="datawrapper-embed"><a href="dwcdn/<id>/">`.
  // The `:not(img child)` guard keeps a converted image (also an `a[href*=dwcdn]`) from
  // being reprocessed when it happens to sit inside a `datawrapper-embed` wrapper.
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
}
