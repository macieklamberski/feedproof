import { getPathSegments, isHostOf, isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'imgur'

const imgurHosts = ['imgur.com']

// Exact hosts on purpose: `i.imgur.com` is the CDN and names no post, and a `video/mp4` enclosure
// there carries no extension, so the host is all that keeps it a playable file.
// `s.imgur.com` is the embed script, and `i.stack.imgur.com` is not Imgur's content at all.
const imgurPageHosts = ['imgur.com', 'www.imgur.com', 'm.imgur.com']

// The routes that name an album: the prefix the platform's own script writes, and the gallery
// path both the older share links and the current slugged ones take.
const albumRoutes = new Set(['a', 'gallery'])

// `imgur.com/t/{tag}/{slug}-{id}` served byte-for-byte the same page as `imgur.com/gallery/{id}`
// on 2026-09-08, and served it under a tag that does not exist, so the tag is decoration in
// front of a post one segment deeper. `imgur.com/t/{tag}` alone names no post.
const tagRoute = 't'

// `r` and `user` fail the id length today and stay so dropping the band cannot make them posts.
// Imgur's own pages sit at the same depth as a post. `memes`, `tools` and `viral` are posts a
// person uploaded, and `topics` serves the not-found shell an untaken id does.
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
  'tos',
  'trending',
  'upload',
  'user',
  'vidgif',
])

// The gallery's own listings, sitting where an album id would. `trending` also passes the id shape.
const galleryListingSegments = new Set(['hot', 'new', 'top', 'trending'])

// Post ids are short alphanumerics. The album form is the same id behind an `a/` prefix, which
// is how the platform's own script tells the two apart.
const safePostIdRegex = /^[a-zA-Z0-9]{5,12}$/
const albumPrefix = 'a/'

// The hyphen pins the id: without it a longer word reads as its own last twelve characters.
// A share link is `gallery/{slug}-{id}`, and the slug alone redirects to the home page.
const sluggedPostIdRegex = /(?:^|-)([a-zA-Z0-9]{5,12})$/

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
    provider,
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

// Only a route word puts the id at a known depth, so only behind one can a slug in front of the
// id be read off. The bare post page has nothing to say where the id starts.
const composeAlbumEmbed = (segment: string | undefined): EmbedResolverResult | undefined => {
  if (!segment || galleryListingSegments.has(segment)) {
    return
  }

  const id = segment.match(sluggedPostIdRegex)?.[1]

  return id ? composeEmbed({ id, isAlbum: true }) : undefined
}

// Imgur ships a post as a blockquote only its embed script turns into the player.
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

// The frame the embed script builds, kept by exports that stored the page after it rendered.
// Its query (`pub`, `ref`, `context`, `analytics`, `w`) describes the embedding page.
export const imgurResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url, placeholderBaseUrl)

  if (!parsed || !isHostOf(parsed, imgurPageHosts)) {
    return
  }

  const [route, second, third] = getPathSegments(parsed)

  // A tag sits between its route and the post, so a tagged url names the post one segment deeper
  // than an album route does.
  if (route === tagRoute) {
    return composeAlbumEmbed(third)
  }

  if (albumRoutes.has(route ?? '')) {
    return composeAlbumEmbed(second)
  }

  if (!route || sitePathSegments.has(route)) {
    return
  }

  const post = parsePost(route)

  return post ? composeEmbed(post) : undefined
}

export const imgurIframeEmbedResolver = createUrlEmbedResolver(imgurHosts, imgurResolveEmbed)

// The embed posts its rendered height on load, unasked, as a JSON string carrying
// `message: 'resize_imgur'`. An album is served by an older template that posts nothing, and the
// height is sent once, for the width the post loaded at, and never again.
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
  provider,
  origin: 'https://imgur.com',
  readHeight: readImgurHeight,
}
