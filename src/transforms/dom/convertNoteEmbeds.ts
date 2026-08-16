import { startsWithAnyOf } from 'trousse'
import type { DomTransform, WidgetResolver } from '../../types.js'
import { attr, hasText } from '../../utils/dom.js'

// Whether a registered resolver would claim an iframe on this url, asked of the real registry
// rather than guessed from a list. The candidate is the element that gets inserted on a hit, so
// what is tested is what ships. Only the registry is asked: `convertWidgets` also has a generic
// fallback that placeholders any carrier with a src, but that lives inside the pass rather than
// in `widgetResolvers`, and it is exactly what this check exists to avoid falling into, since it
// would answer yes for every url.
const isClaimedByResolver = async (
  candidate: Element,
  widgetResolvers: Array<WidgetResolver>,
): Promise<boolean> => {
  for (const resolver of widgetResolvers) {
    if (!candidate.matches(resolver.selector)) {
      continue
    }

    if (await resolver.extract(candidate)) {
      return true
    }
  }

  return false
}

// note.com ships every embed as an empty <figure> that only its web client hydrates, naming the
// target in `data-src`. Nothing renders it in a reader, so the embed is lost: the figure survives
// `stripEmptyTags` because note.com writes a uuid into `name` and `id`, which means the loss is
// silent in the output rather than visible in it.
//
// `embedded-service` names the platform but is not read, only matched on. It is an unpublished
// vocabulary note.com controls, spelled inconsistently (`githubRepository`, `tiktok-web`,
// `note-qa`), and the same platform lands in different values depending on the url shape: an
// Instagram post arrives as `oembed` and an Instagram reel as `external-article`. So the url is
// the only honest signal, and the registry is asked about it directly.
//
// `data-src` is always a canonical page url, never a player: across 1,213 figures sampled from
// live articles, none carried one. That is what makes the link fallback load-bearing rather than
// defensive. Those pages overwhelmingly refuse framing (YouTube, X, TikTok, Instagram and
// stand.fm answer SAMEORIGIN or DENY, Spotify sends a restrictive frame-ancestors), so framing
// one that no resolver rewrites produces a placeholder that looks resolved and shows nothing.
// A link always works, so anything unclaimed becomes one.
//
// A registry check is not a framability check, and the two disagree in one direction. A page no
// resolver claims can still frame fine, and it becomes a link here where framing it would have
// rendered: `adventar.org` is one, sending neither `x-frame-options` nor a CSP. Deciding it
// properly needs a network round trip, which `extract` may not do, so the trade is accepted
// rather than solved. Nothing in the 1,213-figure sample fell into that class.
export const convertNoteEmbeds: DomTransform =
  ({ widgetResolvers }) =>
  async (document) => {
    for (const element of document.querySelectorAll('figure[embedded-service][data-src]')) {
      const source = attr(element, 'data-src')

      if (!source || !startsWithAnyOf(source, ['http://', 'https://'])) {
        continue
      }

      // A figure already holding markup is showing the reader something, which is how an
      // `external-article` card arrives, so only an empty one is worth replacing.
      if (element.firstElementChild || hasText(element)) {
        continue
      }

      const iframe = document.createElement('iframe')
      iframe.setAttribute('src', source)

      if (await isClaimedByResolver(iframe, widgetResolvers)) {
        element.replaceWith(iframe)
        continue
      }

      const link = document.createElement('a')
      link.setAttribute('href', source)
      link.textContent = source
      element.replaceWith(link)
    }
  }
