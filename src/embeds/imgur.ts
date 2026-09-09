import { getPathSegments, isHostOf, isPlainObject, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, find, text } from '../utils/dom.js'
import { readPixels } from '../utils/hints.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'imgur'

const imgurHosts = ['imgur.com']

// Exact hosts on purpose: `i.imgur.com` is the CDN and names no post.
const imgurPageHosts = ['imgur.com', 'www.imgur.com', 'm.imgur.com']

const albumRoutes = new Set(['a', 'gallery'])

const tagRoute = 't'

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

const galleryListingSegments = new Set(['hot', 'new', 'top', 'trending'])

const safePostIdRegex = /^[a-zA-Z0-9]{5,12}$/
const albumPrefix = 'a/'

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
    id: path,
    src: `https://imgur.com/${path}/embed`,
    url: `https://imgur.com/${path}`,
  }

  if (!post.isAlbum) {
    result.thumbnail = `https://i.imgur.com/${post.id}m.jpg`
  }

  return title ? { ...result, title } : result
}

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

    return composeEmbed(post, text(find(element, 'a')))
  },
)

// The frame the embed script builds, kept by exports that stored the page after it rendered.
export const imgurResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrl(url, placeholderBaseUrl)

  if (!parsed || !isHostOf(parsed, imgurPageHosts)) {
    return
  }

  const [route, second, third] = getPathSegments(parsed)

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
