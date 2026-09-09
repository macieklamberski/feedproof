import { composeWidgetEmbedUrl, readWidgetConfig } from '../../embeds/gettyimages.js'
import type { DomTransform } from '../../types.js'
import { createIframe, setDimensions } from '../../utils/widgets.js'

// Matching on the host would also catch the loader script, which carries no configuration.
const widgetCallRegex = /gie\.widgets\.load\s*\(/

// Getty's gie widget: its config sits in an inline script the feed carries but never runs.
// Without it the photo shows as a bare "Embed from Getty Images" link.
export const rebuildGettyImagesEmbeds: DomTransform = () => (document) => {
  for (const script of document.querySelectorAll('script')) {
    const source = script.textContent ?? ''

    if (!widgetCallRegex.test(source)) {
      continue
    }

    const config = readWidgetConfig(source)

    if (!config) {
      continue
    }

    const iframe = createIframe(document, composeWidgetEmbedUrl(config))
    setDimensions(iframe, config)

    // Getty writes one token into the config's et and onto the <a> id, which pairs the two when a
    // post carries several photos.
    // CSS.escape is missing in this DOM, so the id is compared instead of spliced into a selector.
    const anchor = [...document.querySelectorAll('a[id]')].find(
      (candidate) => candidate.getAttribute('id') === config.et,
    )

    if (anchor) {
      anchor.replaceWith(iframe)
      script.remove()
    } else {
      script.replaceWith(iframe)
    }
  }
}
