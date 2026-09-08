import { getPathSegments, isHostOf, isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const imgurHosts = ['imgur.com']

// `i.imgur.com` is the media CDN and `s.imgur.com` the embed script, so neither names a post, and
// `i.stack.imgur.com` is not Imgur's content at all. Only the bare host, its `www.` spelling and
// the mobile one do, which is why the url is checked with `isHostOf` alone and not through
// `parseUrlOnHosts`: that one admits every subdomain, and the CDN came through with it. An
// enclosure names its kind in its MIME type and not in its path, so `i.imgur.com/{id}` typed
// `video/mp4` arrives with no extension for `videoFileRegex` to read, and the host is the only
// thing standing between a playable file and a placeholder in its place.
const imgurPageHosts = ['imgur.com', 'www.imgur.com', 'm.imgur.com']

// The routes that name an album: the prefix the platform's own script writes, and the gallery
// path the older share links took.
const albumRoutes = new Set(['a', 'gallery'])

// Imgur's own pages sit at the same depth as a post, so a first segment is a site page as often
// as it is an id. The longer ones are live pages that pass the id shape, which is why the shape
// alone let `imgur.com/upload` mint a post called `upload`. The short ones, `r`, `t` and `user`,
// are refused by the id length today and are named here anyway, so that dropping the length band
// cannot quietly turn a subreddit, a tag or a profile into a post.
// No route word can pin the id's position instead: the post page is `imgur.com/{id}` with the id
// as the whole path. So each word is here because the platform answered for it, not because it
// reads like one. `memes`, `tools` and `viral` all read like site pages and are posts a person
// uploaded, which is why they are absent; `topics` serves the same not-found shell as an id
// nobody has taken.
const sitePathSegments = new Set([
  'about',
  'account',
  'apps',
  'contact',
  'download',
  'emerald',
  'login',
  'memegen',
  'new',
  'privacy',
  'r',
  'register',
  'rules',
  'search',
  'signin',
  't',
  'tos',
  'trending',
  'upload',
  'user',
  'vidgif',
])

// The gallery's own listings sit where an album id would, so they are refused the same way.
const galleryListingSegments = new Set(['hot', 'new', 'top'])

// Post ids are short alphanumerics. The album form is the same id behind an `a/` prefix, which
// is how the platform's own script tells the two apart.
const safePostIdRegex = /^[a-zA-Z0-9]{5,12}$/
const albumPrefix = 'a/'

type ImgurPost = {
  id: string
  isAlbum: boolean
}

const parsePost = (value: string): ImgurPost | undefined => {
  const isAlbum = value.startsWith(albumPrefix)
  const id = isAlbum ? value.slice(albumPrefix.length) : value

  if (safePostIdRegex.test(id)) {
    return { id, isAlbum }
  }
}

const composeEmbed = (post: ImgurPost, title?: string): EmbedResolverResult => {
  const path = post.isAlbum ? `${albumPrefix}${post.id}` : post.id

  const result: EmbedResolverResult = {
    provider: 'imgur',
    // The prefix travels because it is what addresses the post: an album and a single image can
    // hold the same id, and only the prefix separates them.
    id: path,
    src: `https://imgur.com/${path}/embed`,
    url: `https://imgur.com/${path}`,
  }

  // A single image has a thumbnail at a derivable url, the id plus a size suffix. An album does
  // not: its cover is a different image with its own id, and nothing in the markup names it.
  if (!post.isAlbum) {
    result.thumbnail = `https://i.imgur.com/${post.id}m.jpg`
  }

  return title ? { ...result, title } : result
}

// Imgur's embed is a blockquote plus `s.imgur.com/min/embed.js`, and the script is what turns it
// into the player. Without the script a reader gets the quote and its link, so the picture never
// appears. The blockquote is the only shape the platform has issued since the feature shipped in
// 2015. A bare `i.imgur.com/<id>.jpg` hotlink is an ordinary image and not this.
export const imgurBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.imgur-embed-pub[data-id]',
  (element) => {
    const post = parsePost(attr(element, 'data-id') ?? '')

    if (!post) {
      return
    }

    // The fallback anchor carries the post's title when the author set one, and the dialog's
    // own label when they did not. Both are carried as stated: the label is localised, so any
    // list of its wordings ages, and what the source says is what the placeholder reports.
    return composeEmbed(post, text(find(element, 'a')))
  },
)

// The frame the script builds, kept by exports that stored the page after it rendered. Its query
// describes the embedding page (`pub`, `ref`, `context`, `analytics`, `w`), so the url is rebuilt
// from the path instead of carried across.
export const imgurResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url, placeholderBaseUrl)

  if (!parsed || !isHostOf(parsed, imgurPageHosts)) {
    return
  }

  const segments = getPathSegments(parsed)
  const isAlbum = albumRoutes.has(segments[0] ?? '')
  const id = isAlbum ? segments[1] : segments[0]

  if (!id || (isAlbum ? galleryListingSegments : sitePathSegments).has(id)) {
    return
  }

  const post = parsePost(isAlbum ? `${albumPrefix}${id}` : id)

  return post ? composeEmbed(post) : undefined
}

export const imgurIframeEmbedResolver = createUrlEmbedResolver(imgurHosts, imgurResolveEmbed)

// The embed posts its rendered height on load, unasked, as a JSON string carrying
// `message: 'resize_imgur'`. It has to be parsed before it can be read. Verified in a browser on
// 2026-09-07 at 640 wide, where one post reported 595 and another 1389, which is why the resolver
// states no height at all: there is no one box that fits both.
//
// Two things the message does not cover. An album is served by an older template that posts
// nothing (11 seconds, no message). And the height is the one the post needs at the width it
// loaded at, 415 at 400 wide against 595 at 640, sent once and never again, so a box that changes
// width afterwards keeps the first number.
export const readImgurHeight = (data: unknown): number | undefined => {
  if (typeof data !== 'string') {
    return
  }

  try {
    const message: unknown = JSON.parse(data)

    if (isPlainObject(message) && message.message === 'resize_imgur') {
      return readPixels(message.height)
    }
  } catch {}
}

export const imgurRenderHint: EmbedRenderHint = {
  provider: 'imgur',
  origin: 'https://imgur.com',
  readHeight: readImgurHeight,
}
