import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// XenForo unfurls a pasted link into a block whose fields carry js-unfurl-* hooks.
// The hooks are near-universal and the theme classes vary from site to site.
export const xenforoCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: '.bbCodeBlock--unfurl[data-url]',
  extract: (element) => {
    return buildCite({
      provider: 'xenforo',
      url: attr(element, 'data-url'),
      title: text(element, '.js-unfurl-title') ?? text(element, '.contentRow-title'),
      description: text(element, '.js-unfurl-desc') ?? text(element, '.contentRow-snippet'),
      publisher: attr(element, 'data-host'),
      icon: attr(find(element, '.js-unfurl-favicon img'), 'src'),
      // Rare feeds ship without the hooks, or carry the figure's image under its own class.
      thumbnail:
        attr(find(element, '.js-unfurl-figure img'), 'src') ??
        attr(find(element, 'img.bbCodeBlockUnfurl-image'), 'src'),
    })
  },
}
