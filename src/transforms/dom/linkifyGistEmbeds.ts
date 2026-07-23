import type { DomTransform } from '../../types.js'

// A GitHub Gist embeds as `<script src="https://gist.github.com/<user>/<id>.js">`, which its JS
// turns into the rendered gist. A reader runs no JS, so it renders nothing. Replace the dead
// script with a link to the gist page, so the content is at least reachable.
const gistScriptRegex = /gist\.github\.com\/(?:([^/?"]+)\/)?([A-Za-z0-9]+)\.js/

export const linkifyGistEmbeds: DomTransform = () => (document) => {
  for (const script of document.querySelectorAll('script[src*="gist.github.com"]')) {
    const match = script.getAttribute('src')?.match(gistScriptRegex)

    if (!match) {
      continue
    }

    const path = match[1] ? `${match[1]}/${match[2]}` : match[2]
    const url = `https://gist.github.com/${path}`

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.textContent = url
    script.replaceWith(link)
  }
}
