import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'reddit'

const redditHosts = ['reddit.com', 'redditmedia.com']

const safeNameRegex = /^[A-Za-z0-9_-]+$/
// The post counter started at one base36 character in 2005, and two-character permalinks are still
// linked from real feeds.
const safeThingIdRegex = /^[a-z0-9]+$/i

// What a permalink names. A post carries a title, a comment does not, and a subreddit names
// neither, so the kind decides which fields the widget can fill.
type RedditTarget = {
  kind: 'post' | 'comment' | 'subreddit'
  // The permalink path the two endpoints share, canonical and without the title slug: the
  // player is `embed.reddit.com/{path}/` and the post is `reddit.com/{path}/`.
  path: string
  publisher: string
}

const parseRedditPath = (value: string | undefined): Array<string> | undefined => {
  const parsed = parseUrlOnHosts(value, redditHosts)

  if (!parsed) {
    return
  }

  return getPathSegments(parsed)
}

const parseTarget = (value: string | undefined): RedditTarget | undefined => {
  const segments = parseRedditPath(value)

  if (!segments) {
    return
  }

  const [scope, name, comments, postId] = segments

  if ((scope !== 'r' && scope !== 'user') || !name || !safeNameRegex.test(name)) {
    return
  }

  const publisher = scope === 'r' ? `r/${name}` : `u/${name}`

  // A bare profile is not a target: embed.reddit.com/user/{name}/ answers 404.
  // A profile post, /user/{name}/comments/{id}/, renders like any other.
  if (comments === undefined) {
    return scope === 'r' ? { kind: 'subreddit', path: `r/${name}`, publisher } : undefined
  }

  if (comments !== 'comments' || !postId || !safeThingIdRegex.test(postId)) {
    return
  }

  // The whole path travels: embed.reddit.com/comments/{id}/ serves the not-found shell.
  // The player ignores the subreddit in the path, the id alone selects the post.
  const post = `${scope}/${name}/comments/${postId}`
  // A sixth segment is the comment the widget quotes, sitting behind the title slug. Reddit
  // writes `/comment/{id}/` in place of that slug on its own permalinks and serves both, so
  // the canonical form is the one minted and the slug itself never travels.
  const commentId = segments[5]

  if (commentId) {
    return safeThingIdRegex.test(commentId)
      ? { kind: 'comment', path: `${post}/comment/${commentId}`, publisher }
      : undefined
  }

  return { kind: 'post', path: post, publisher }
}

// A profile link, which names the poster and nothing embeddable.
const parseAuthor = (value: string | undefined): string | undefined => {
  const [scope, name, rest] = parseRedditPath(value) ?? []

  if (scope !== 'user' || rest !== undefined || !name || !safeNameRegex.test(name)) {
    return
  }

  return `u/${name}`
}

const composeEmbed = (
  target: RedditTarget,
  extra: Partial<EmbedResolverResult> = {},
): EmbedResolverResult => {
  return {
    provider,
    id: target.path,
    src: `https://embed.reddit.com/${target.path}/`,
    url: `https://www.reddit.com/${target.path}/`,
    publisher: target.publisher,
    ...extra,
  }
}

// Everything the widget states, read in one pass over its links. The loader embeds the first
// permalink it finds and ignores the rest, so that anchor is the target here too.
const readWidget = (element: Element): EmbedResolverResult | undefined => {
  let target: RedditTarget | undefined
  let title: string | undefined
  let author: string | undefined

  for (const anchor of element.querySelectorAll('a[href]')) {
    const href = attr(anchor, 'href')
    const anchorTarget = parseTarget(href)

    target ??= anchorTarget

    // A comment widget's first anchor reads "Comment" in the dialog's language, not the title.
    // A comment widget links the comment first and its discussion second, and only the second
    // carries the title.
    if (anchorTarget?.kind === 'post') {
      title ??= text(anchor)
    }

    author ??= parseAuthor(href)
  }

  if (!target) {
    return
  }

  // Neither `data-embed-created` nor `data-card-created` is the post's date: the loader pushes
  // either into the player's `created` query beside `showedits`, which hides the edits made after
  // the embed code was generated. So both stamp the embed, and neither reaches `date`.

  // data-embed-height is the height Reddit's dialog states, spelled as an inline style as well, and
  // neither states a width.
  const height = parsePixelSize(attr(element, 'data-embed-height'))

  return composeEmbed(target, { title, author, height })
}

// Reddit's snippet: a blockquote of links that only the widgets.js loader turns into the card.
// reddit-embed-bq is the current dialog's class, reddit-card the generation before it and
// reddit-embed its comment embed's div. embedly-card names Embedly's card.
export const redditWidgetEmbedResolver = createMarkupEmbedResolver(
  ['.reddit-embed-bq', '.reddit-card', '.reddit-embed'].join(', '),
  readWidget,
)

export const redditResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const target = parseTarget(url)

  return target ? composeEmbed(target) : undefined
}

// The embed.reddit.com frame the loader builds, kept by exports that stored the rendered page.
// redditmedia.com redirects to embed.reddit.com path for path.
export const redditIframeEmbedResolver = createUrlEmbedResolver(redditHosts, redditResolveEmbed)

// The player reports its height under a `resize.embed` type, first as 0 and then as the rendered
// value once the post is in, so the first message reads as nothing.
export const readRedditHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.type === 'resize.embed' ? readPixels(data.data) : undefined
}

export const redditRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://embed.reddit.com',
  readHeight: readRedditHeight,
}
