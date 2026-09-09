import { parseUrl } from 'trousse'
import { parseMastodonStatus } from '../embeds/mastodon.js'
import type { CiteResolver } from '../types.js'
import { buildCite } from '../utils/cites.js'
import { attr, find, isElement, text } from '../utils/dom.js'
import { isOnHosts, placeholderBaseUrl } from '../utils/urls.js'

// When the linked article has a date, the generic onebox appends it to the source anchor's
// text ("Whonix – 13 Jan 23") behind this spaced en dash.
const publisherDateSeparator = ' – '

// The pull request and commit engines render a comment with the author in a bare span, not under
// .user, and the heading repeating it as `Comment by USER - ` before the real title.
const stripCommentPrefix = (title: string | undefined, author: string): string | undefined => {
  const prefix = `Comment by ${author} - `

  return title?.startsWith(prefix) ? title.slice(prefix.length) : title
}

// The GitHub onebox splits its preview around a show-more "…" whose hidden span holds the rest
// of the sentence, so reading the paragraph whole injects the ellipsis mid-sentence.
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

// Engines whose cards are not link previews. TikTok, Reddit, Facebook and Twitch emit bare
// iframes, not aside.onebox, and Mastodon links go through the generic engine.
export const omittedOneboxClasses = [
  'twitterstatus', // A social post: the heading is the author and the body the post text
  'threadsstatus', // The same social-post shape as twitterstatus
  'instagram', // Legacy social-post asides; since 2021 the engine emits a bare iframe
  'pdf', // A file card: the title is the filename and the only paragraph its size
  'googlemeet', // A join-call card: every field is a fixed label or the meeting code
]

// Hosts with no onebox engine of their own: their posts arrive as generic asides whose og title
// is the author's name.
export const socialPostHosts = ['bsky.app', 'threads.net', 'threads.com']

// Any domain can be a Mastodon instance. A status page titles itself "Display Name
// (@user@instance)", which the generic onebox renders as its heading.
const fediverseHandleRegex = /@[\w.-]+@[\w-]+(?:\.[\w-]+)+/

// Discourse's onebox: a pasted link expanded into an aside of divs the forum's CSS lays out.
export const discourseCiteResolver: CiteResolver = {
  kind: 'cite',
  selector: `aside.onebox${omittedOneboxClasses.map((name) => `:not(.${name})`).join('')}`,
  extract: (element) => {
    const body = find(element, '.onebox-body')
    const source = find(element, 'header.source a')

    // Old-generation oneboxes (the Stack Exchange shape among them) carry no
    // data-onebox-src. Their canonical url is the source anchor's.
    const url = attr(element, 'data-onebox-src') ?? attr(source, 'href')
    // Engines differ on the heading level they use for the title.
    const title = text(body, 'h3, h4')

    // data-onebox-src arrives unrewritten, so a protocol-relative url names no host without a base.
    const cited = url ? parseUrl(url, placeholderBaseUrl) : undefined

    if (cited && (isOnHosts(cited, socialPostHosts) || parseMastodonStatus(cited.href))) {
      return
    }

    if (title && fediverseHandleRegex.test(title)) {
      return
    }

    const [publisher, date] = text(source)?.split(publisherDateSeparator) ?? []

    // The GitHub engines (issue, pull request, commit) put the body in its own paragraph and an
    // ISO-dated local-date span in a `.github-info` row.
    const githubBody = find(body, 'p.github-body-container')
    const githubDate = find(element, '.github-info .date .discourse-local-date')

    let description = text(body, 'p')

    if (githubBody) {
      description = githubDescription(githubBody)
    } else if (element.classList.contains('githubfolder')) {
      // The folder onebox's first paragraph is the path link, not an excerpt. Its repo
      // description sits in a `span.label1` after it.
      description = text(body, 'p span.label1')
    } else if (element.classList.contains('hackernews')) {
      // The Hacker News onebox always ends on a stats paragraph (points, comments, author,
      // timestamp). Only self-posts put a real text paragraph before it.
      description = text(find(body, 'p', (paragraph) => !find(paragraph, 'a.author')))
    }

    const githubAuthor =
      text(element, '.github-info .user a') ?? text(element, '.github-info span a')

    // The Stack Exchange onebox writes "asked by <author> on <date>" as two anchors in its
    // `.date` div.
    const dateAnchors = Array.from(body?.querySelectorAll('.date a') ?? [])

    // The submitter and the item's time, from the stats paragraph the description skips. No
    // other engine's body carries either anchor, and the timestamp is the site's own
    // formatting ("8:09 AM - 28 Sep 2021").
    const hackernewsAuthor = text(find(body, 'a.author'))
    const hackernewsDate = text(find(body, 'a.timestamp'))

    return buildCite({
      provider: 'discourse',
      url,
      title: githubAuthor ? stripCommentPrefix(title, githubAuthor) : title,
      description,
      author: githubAuthor ?? text(dateAnchors[0]) ?? hackernewsAuthor,
      publisher,
      date:
        date ??
        attr(githubDate, 'data-date') ??
        text(githubDate) ??
        text(dateAnchors[1]) ??
        hackernewsDate,
      // GitHub oneboxes render no site icon. The inline author avatar stands in for it.
      icon:
        attr(find(element, 'img.site-icon'), 'src') ??
        attr(find(element, 'img.onebox-avatar-inline'), 'src'),
      // The Stack Exchange avatar sits as a bare `img.thumbnail` in the body, not under
      // `.aspect-image`.
      thumbnail:
        attr(find(element, '.aspect-image img'), 'src') ?? attr(find(body, 'img.thumbnail'), 'src'),
    })
  },
}
