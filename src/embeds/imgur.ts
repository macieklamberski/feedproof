import { getPathSegments, isHostOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, text } from '../utils/dom.js'
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
const sitePathSegments = new Set([
  'about',
  'account',
  'apps',
  'emerald',
  'memegen',
  'new',
  'privacy',
  'r',
  'register',
  'search',
  'signin',
  't',
  'tos',
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
