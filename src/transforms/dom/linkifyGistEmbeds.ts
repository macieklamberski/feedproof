import type { DomTransform } from '../../types.js'
import { keepIfMatches } from '../../utils/dom.js'

// A GitHub Gist embeds as `<script src="https://gist.github.com/<user>/<id>.js">`, which its JS
// turns into the rendered gist. A reader runs no JS, so it renders nothing. AMP's <amp-gist> is
// the same dead embed by another name, and needs the AMP runtime on top. Replace either with a
// link to the gist page, so the content is at least reachable.
const gistScriptRegex = /gist\.github\.com\/(?:([^/?"]+)\/)?([A-Za-z0-9]+)\.js/
const gistIdRegex = /^[A-Za-z0-9]+$/

const gistCarrierSelector = 'script[src*="gist.github.com"], amp-gist[data-gistid]'

const readGistPath = (element: Element): string | undefined => {
  // <amp-gist> names the gist by id alone, with no owner. `gist.github.com/{id}` redirects to
  // the owned URL, so the bare id makes the same link the script form does.
  if (element.localName === 'amp-gist') {
    const gistId = element.getAttribute('data-gistid')

    return keepIfMatches(gistId, gistIdRegex)
  }

  const match = element.getAttribute('src')?.match(gistScriptRegex)

  if (!match) {
    return
  }

  return match[1] ? `${match[1]}/${match[2]}` : match[2]
}

export const linkifyGistEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll(gistCarrierSelector)) {
    const path = readGistPath(element)

    if (!path) {
      continue
    }

    const url = `https://gist.github.com/${path}`

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.textContent = url
    element.replaceWith(link)
  }
}
