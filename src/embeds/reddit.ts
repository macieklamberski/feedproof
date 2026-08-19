import { getPathSegments, trimObject } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize, text } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const redditHosts = ['reddit.com', 'redditmedia.com']

// Subreddit and account names are letters, digits, underscore and hyphen. Posts and comments
// are named by a base36 id. Both are interpolated into the minted url, so both are bounded.
const safeNameRegex = /^[A-Za-z0-9_-]{1,32}$/
const safeThingIdRegex = /^[a-z0-9]{4,13}$/i

// What a permalink names. A post carries a title, a comment does not, and a subreddit names
// neither, so the kind decides which fields the widget can fill.
type RedditTarget = {
  kind: 'post' | 'comment' | 'subreddit'
  // The permalink path the two endpoints share, canonical and without the title slug: the
  // player is `embed.reddit.com/{path}/` and the post is `reddit.com/{path}/`.
  path: string
  publisher: string
}

// A relative href has no host to check, so it falls out here rather than being resolved
// against the feed's own base: a permalink is always written in full.
const parseRedditPath = (value: string | undefined): Array<string> | undefined => {
  const parsed = parseUrlOnHosts(value, redditHosts)

  if (!parsed) {
    return
  }

  return getPathSegments(parsed)
}

// The permalink shapes the platform's own loader accepts, minus the account profile: it will
// build `embed.reddit.com/user/{name}/` from a bare profile link and that address answers 404,
// while `/user/{name}/comments/{id}/` is a profile post and renders like any other.
//
// The subreddit in a post path is not checked by the player: the post id alone selects the
// post, but it is not optional either: `embed.reddit.com/comments/{id}/` serves the not-found
// shell. So the whole path travels as the id, which is also what lets the id address Reddit's
// oEmbed endpoint, the one enrichment source that answers without a key.
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

  if (comments === undefined) {
    return scope === 'r' ? { kind: 'subreddit', path: `r/${name}`, publisher } : undefined
  }

  if (comments !== 'comments' || !postId || !safeThingIdRegex.test(postId)) {
    return
  }

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
    provider: 'reddit',
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

    // The post's title sits on the anchor naming the post: a comment widget links the comment
    // first and the discussion it came from second, and only the second carries a title. The
    // first anchor of a comment widget reads "Comment", a label the dialog writes in the
    // reader's own language, which is why the kind decides this, not the position.
    if (anchorTarget?.kind === 'post') {
      title ??= text(anchor)
    }

    author ??= parseAuthor(href)
  }

  if (!target) {
    return
  }

  // The height Reddit's own dialog states, which the loader passes to the player. The modern
  // widget spells it as an inline style as well, and the declared-size pass reads that one for
  // free. Neither states a width and the placeholder must not invent one: a lone height is the
  // fixed box this player is, and a made-up number beside it describes a box nobody measured.
  const height = parsePixelSize(attr(element, 'data-embed-height'))

  return composeEmbed(target, {
    ...trimObject({ title, author }, Boolean),
    ...(height !== undefined && { height }),
  })
}

// Reddit ships the post as a blockquote holding its title, its poster and its subreddit as
// links, then an `embed.reddit.com/widgets.js` loader that turns the quote into the player.
// Without the script a reader gets the bare links, so the card never appears and nothing
// downstream can tell which platform they belong to.
//
// Three classes, one loader: `reddit-embed-bq` is what the current dialog writes,
// `reddit-card` is the generation before it, and `reddit-embed` is the div its comment embed
// used. `embedly-card` is claimed by the same loader and is left alone, because that class
// names Embedly's card and carries whatever url the publisher gave it.
export const redditWidgetEmbedResolver = createMarkupEmbedResolver(
  ['.reddit-embed-bq', '.reddit-card', '.reddit-embed'].join(', '),
  readWidget,
)

// The frame the loader builds, kept by exports that stored the page after it rendered. The
// legacy host redirects to the modern one path for path, so both mint the same player, and
// the query it carries describes the embedding page rather than the post.
export const redditResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const target = parseTarget(url)

  return target ? composeEmbed(target) : undefined
}

export const redditIframeEmbedResolver = createUrlEmbedResolver(redditHosts, redditResolveEmbed)
