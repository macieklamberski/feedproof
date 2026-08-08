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

// Onebox engines that render a social post rather than a link preview: the card's heading
// is the author and its body the post text, so a cite would mislabel it. These are the only
// social engines that render as `aside.onebox` — the others (TikTok, Reddit, Facebook,
// Twitch) emit bare iframes, and Mastodon links go through the generic engine.
export const socialOneboxClasses = ['twitterstatus', 'threadsstatus', 'instagram']

// Discourse forums expand a pasted link into a "onebox" card. The engine that built the
// card varies (a generic one covers 979 of the 1,118 corpus feeds, the rest are per-site
// engines like github or wikipedia), and each engine renders its own body markup, so this
// keys on the wrapper and the fields the generic shape shares rather than on the engine
// subclass. The canonical URL sits on the wrapper, so no inner anchor is needed.
export const discourseCiteResolver: CiteResolver = {
  selector: `aside.onebox${socialOneboxClasses.map((name) => `:not(.${name})`).join('')}`,
  extract: (element) => {
    const body = find(element, '.onebox-body')
    const source = find(element, 'header.source a')
    const [publisher, date] = text(source)?.split(publisherDateSeparator) ?? []

    // The GitHub engines (issue, pull request, commit) put the author and an ISO-dated
    // local-date span in `.github-info` rows instead of the generic shape.
    const githubBody = find(body, 'p.github-body-container')
    const githubDate = find(element, '.github-info .date .discourse-local-date')

    // The Stack Exchange onebox writes "asked by <author> on <date>" as two anchors in its
    // `.date` div.
    const dateAnchors = Array.from(body?.querySelectorAll('.date a') ?? [])

    return buildCite({
      provider: 'discourse',
      // Old-generation oneboxes (the Stack Exchange shape among them) carry no
      // data-onebox-src; their canonical url is the source anchor's.
      url: attr(element, 'data-onebox-src') ?? attr(source, 'href'),
      // Engines differ on the heading level they use for the title.
      title: text(body, 'h3, h4'),
      description: githubBody ? githubDescription(githubBody) : text(body, 'p'),
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
