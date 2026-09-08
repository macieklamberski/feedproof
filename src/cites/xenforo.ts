import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, text } from '../utils/dom.js'

// XenForo forums expand a pasted link into an "unfurl" block. The URL and host sit on the
// wrapper, and each field carries a `js-unfurl-*` hook alongside its theme classes. The
// hooks are what this reads first: they are near-universal while the theme classes vary from
// site to site. The theme classes are the fallback for the rare feeds whose markup ships without
// the hooks, or whose figure carries the image under its own class instead of under the hook.
//
// No test observes the `[data-url]` half of the selector, and none can: `data-url` is the only
// url this reads, so a block without it resolves to nothing whether the selector claims it or
// not, and `buildCite` refuses the result either way. The attribute stays in the selector to
// say what the block has to carry, not because a case can tell the two paths apart.
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
      thumbnail:
        attr(find(element, '.js-unfurl-figure img'), 'src') ??
        attr(find(element, 'img.bbCodeBlockUnfurl-image'), 'src'),
    })
  },
}
