import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { DomTransform } from '../../types.js'
import { attr, flashVars } from '../../utils/dom.js'

// Flickr's slideshow embeds as an `<object>`/`<embed>` pair playing `flickr.com/apps/slideshow/
// show.swf`, and Flash has rendered nothing since 2021. There is nothing to repair it into:
// Flickr publishes no viewer at all, its oEmbed answers `type: photo`, and its own help pages
// document the embed as either a `.jpg` or a link to the page. So the album page is the most
// this can become.
//
// It cannot become an `<img>` either. A slideshow names a whole set rather than one photo, and
// a photo's file url needs a server shard and a per-photo secret that no id yields.
const flickrHosts = ['flickr.com']

const playerPathRegex = /^\/apps\/slideshow\//

// The swf url names only the player, with a cache-busting `?v=`. The set is in the flashvars,
// as a percent-encoded path that `URLSearchParams` decodes: `page_show_url=%2Fphotos%2F{user}
// %2Fsets%2F{setId}%2Fshow%2F`.
const setPathRegex = /^\/photos\/([\w.@-]+)\/sets\/(\d+)/

// An owner is a numeric NSID with its `@N0…` suffix, or the path alias the owner chose. Both
// address `/photos/{owner}/`.
const safeOwnerRegex = /^[\w.@-]+$/

const flickrCarrierSelector = 'object[data*="flickr.com/apps/"], embed[src*="flickr.com/apps/"]'

const readAlbumUrl = (element: Element): string | undefined => {
  const parsed = parseUrl(attr(element, 'data') ?? attr(element, 'src') ?? '')

  // The selector matches on a substring, so another host can carry the player's path inside
  // its own and reach here.
  if (!parsed || (!isHostOf(parsed, flickrHosts) && !isSubdomainOf(parsed, flickrHosts))) {
    return
  }

  if (!playerPathRegex.test(parsed.pathname)) {
    return
  }

  const config = flashVars(element)
  const match = config && new URLSearchParams(config).get('page_show_url')?.match(setPathRegex)

  if (!match) {
    return
  }

  // `/sets/` still resolves, but Flickr renamed them albums and redirects there.
  const [, owner, setId] = match

  return safeOwnerRegex.test(owner)
    ? `https://www.flickr.com/photos/${owner}/albums/${setId}`
    : undefined
}

export const linkifyFlickrEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll(flickrCarrierSelector)) {
    const url = readAlbumUrl(element)

    if (!url) {
      continue
    }

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.textContent = url

    // An `<embed>` inside an `<object>` is the same slideshow twice, so the pair collapses to
    // one link rather than leaving the outer element wrapped around it.
    const carrier = element.parentElement?.localName === 'object' ? element.parentElement : element

    carrier.replaceWith(link)
  }
}
