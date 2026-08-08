import { isHostOf } from 'trousse'
import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, isElement, text } from '../utils/dom.js'

// When the linked article has a date, the generic onebox appends it to the source anchor's
// text ("Whonix – 13 Jan 23") behind this spaced en dash.
const publisherDateSeparator = ' – '

// The GitHub onebox splits its body preview around a "…" show-more expander: the text
// before it is visible and the `.excerpt.hidden` span holds the rest of the same sentence.
// Reading the paragraph's textContent whole would inject the ellipsis mid-word, so the
// expander is skipped and the halves rejoined.
const githubDescription = (paragraph: Element): string | undefined => {
  let result = ''

  for (const node of paragraph.childNodes) {
    if (isElement(node) && node.classList.contains('show-more-container')) {
      continue
    }

    result += node.textContent ?? ''
  }

  return result.trim() || undefined
}

// Onebox engines whose cards are not link previews, so a cite would misrepresent what the
// author linked; their markup passes through untouched. Only engines that render as
// `aside.onebox` need listing — the other social engines (TikTok, Reddit, Facebook,
// Twitch) emit bare iframes, and Mastodon links go through the generic engine.
export const omittedOneboxClasses = [
  'twitterstatus', // A social post: the heading is the author and the body the post text.
  'threadsstatus', // The same social-post shape as twitterstatus.
  'instagram', // Legacy social-post asides; since 2021 the engine emits a bare iframe.
  'pdf', // A file card: the title is the filename and the only paragraph its size.
]

// Social platforms without their own onebox engine: their posts arrive as generic asides
// whose og title is the author's name, so they are recognized by the cited host instead of
// the engine class.
export const socialPostHosts = ['bsky.app', 'threads.net', 'threads.com']

// Mastodon posts cannot be told apart by host (any domain can be an instance). Two other
// signals mark them: a status url is `/@user/<numeric id>` on any instance (no article url
// ends in a bare number there), and the page titles itself "Display Name (@user@instance)",
// which the generic onebox renders as its heading.
const mastodonStatusPathRegex = /\/@[^/]+\/\d{6,}(?:[?#]|$)/
const fediverseHandleRegex = /@[\w.-]+@[\w-]+(?:\.[\w-]+)+/

// Discourse forums expand a pasted link into a "onebox" card. The engine that built the
// card varies (a generic one covers 979 of the 1,118 corpus feeds, the rest are per-site
// engines like github or wikipedia), and each engine renders its own body markup, so this
// keys on the wrapper and the fields the generic shape shares rather than on the engine
// subclass. The canonical URL sits on the wrapper, so no inner anchor is needed.
export const discourseCiteResolver: CiteResolver = {
  selector: `aside.onebox${omittedOneboxClasses.map((name) => `:not(.${name})`).join('')}`,
  extract: (element) => {
    const body = find(element, '.onebox-body')
    const source = find(element, 'header.source a')

    // Old-generation oneboxes (the Stack Exchange shape among them) carry no
    // data-onebox-src; their canonical url is the source anchor's.
    const url = attr(element, 'data-onebox-src') ?? attr(source, 'href')

    if (url && (isHostOf(url, socialPostHosts) || mastodonStatusPathRegex.test(url))) {
      return
    }

    // Engines differ on the heading level they use for the title.
    const title = text(body, 'h3, h4')

    if (title && fediverseHandleRegex.test(title)) {
      return
    }

    const [publisher, date] = text(source)?.split(publisherDateSeparator) ?? []

    // The GitHub engines (issue, pull request, commit) put the author and an ISO-dated
    // local-date span in `.github-info` rows instead of the generic shape.
    const githubBody = find(body, 'p.github-body-container')
    const githubDate = find(element, '.github-info .date .discourse-local-date')

    // The folder onebox's first paragraph is the path link, not an excerpt; its repo
    // description sits in a `span.label1` after it.
    let description = text(body, 'p')

    if (githubBody) {
      description = githubDescription(githubBody)
    } else if (element.classList.contains('githubfolder')) {
      description = text(body, 'p span.label1')
    }

    // The Stack Exchange onebox writes "asked by <author> on <date>" as two anchors in its
    // `.date` div.
    const dateAnchors = Array.from(body?.querySelectorAll('.date a') ?? [])

    return buildCite({
      provider: 'discourse',
      url,
      // Engines differ on the heading level they use for the title.
      title: text(body, 'h3, h4'),
      description,
      author: text(element, '.github-info .user a') ?? text(dateAnchors[0]),
      publisher,
      date: date ?? attr(githubDate, 'data-date') ?? text(githubDate) ?? text(dateAnchors[1]),
      // GitHub oneboxes render no site icon; the inline author avatar stands in for it.
      icon:
        attr(find(element, 'img.site-icon'), 'src') ??
        attr(find(element, 'img.onebox-avatar-inline'), 'src'),
      // The Stack Exchange avatar sits as a bare `img.thumbnail` in the body rather than
      // under `.aspect-image`.
      thumbnail:
        attr(find(element, '.aspect-image img'), 'src') ?? attr(find(body, 'img.thumbnail'), 'src'),
    })
  },
}
