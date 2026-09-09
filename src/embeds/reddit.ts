import { getPathSegments, isPlainObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, parsePixelSize, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'reddit'

const redditHosts = ['reddit.com', 'redditmedia.com']

const safeNameRegex = /^[A-Za-z0-9_-]+$/
const safeThingIdRegex = /^[a-z0-9]+$/i

type RedditTarget = {
  kind: 'post' | 'comment' | 'subreddit'
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

  if (comments === undefined) {
    return scope === 'r' ? { kind: 'subreddit', path: `r/${name}`, publisher } : undefined
  }

  if (comments !== 'comments' || !postId || !safeThingIdRegex.test(postId)) {
    return
  }

  const post = `${scope}/${name}/comments/${postId}`
  const commentId = segments[5]

  if (commentId) {
    return safeThingIdRegex.test(commentId)
      ? { kind: 'comment', path: `${post}/comment/${commentId}`, publisher }
      : undefined
  }

  return { kind: 'post', path: post, publisher }
}

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

const readWidget = (element: Element): EmbedResolverResult | undefined => {
  let target: RedditTarget | undefined
  let title: string | undefined
  let author: string | undefined

  for (const anchor of element.querySelectorAll('a[href]')) {
    const href = attr(anchor, 'href')
    const anchorTarget = parseTarget(href)

    target ??= anchorTarget

    if (anchorTarget?.kind === 'post') {
      title ??= text(anchor)
    }

    author ??= parseAuthor(href)
  }

  if (!target) {
    return
  }

  const height = parsePixelSize(attr(element, 'data-embed-height'))

  return composeEmbed(target, { title, author, height })
}

// Reddit's snippet: a blockquote of links that only the widgets.js loader turns into the card.
export const redditWidgetEmbedResolver = createMarkupEmbedResolver(
  ['.reddit-embed-bq', '.reddit-card', '.reddit-embed'].join(', '),
  readWidget,
)

export const redditResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const target = parseTarget(url)

  return target ? composeEmbed(target) : undefined
}

// The embed.reddit.com frame the loader builds, kept by exports that stored the rendered page.
export const redditIframeEmbedResolver = createUrlEmbedResolver(redditHosts, redditResolveEmbed)

export const readRedditHeight = (data: unknown): number | undefined => {
  return isPlainObject(data) && data.type === 'resize.embed' ? readPixels(data.data) : undefined
}

export const redditRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://embed.reddit.com',
  readHeight: readRedditHeight,
}
