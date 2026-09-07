import { composeWidgetEmbedUrl, readWidgetConfig } from '../../embeds/gettyimages.js'
import type { DomTransform } from '../../types.js'
import { createIframe, setDimensions } from '../../utils/widgets.js'

// The call the inline config script makes. Matching on it rather than on the host keeps the
// transform off the loader script, which carries the host but no configuration.
const widgetCallRegex = /gie\.widgets\.load\s*\(/

// Getty's `gie` widget renders nothing in a reader: the configuration sits in an inline script
// the feed carries but never executes, so the photo shows as a bare "Embed from Getty Images"
// link. The config holds everything the player iframe needs, so it is rebuilt into that iframe
// and `gettyImagesEmbedResolver` turns it into a placeholder from there.
//
// The anchor is matched by id rather than by proximity: Getty writes the same token into the
// config's `id` and onto the `<a>`, which is what pairs the two when a post carries several
// photos. Where the anchor is missing the script is replaced in place, so a config on its own
// still yields a player.
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

    // CSS.escape is not in the DOM libraries this runs against, and the token is Getty's own
    // base64url id, so it is matched by attribute value rather than spliced into a selector.
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
