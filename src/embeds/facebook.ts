import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'

// Facebook's embed SDK ships a post as `<div class="fb-post" data-href="{post url}">` and a
// video as `<div class="fb-video" data-href="{video url}">` next to a script that builds the
// widget at runtime. A reader runs no JS, so both divs render nothing and the post vanishes
// with no fallback link to keep. The keyless plugin endpoints take the href as-is (verified
// live 2026-08-08, 200 on real posts and videos):
//   https://www.facebook.com/plugins/post.php?href={encoded href}
//   https://www.facebook.com/plugins/video.php?href={encoded href}
const facebookHost = 'facebook.com'

// Only a facebook.com href may be interpolated into the plugin template.
const extractEmbed = (element: Element, plugin: string): EmbedResolverResult | undefined => {
  const href = attr(element, 'data-href')

  if (!href) {
    return
  }

  const parsed = parseUrl(href, 'https://example.com')

  if (!parsed || (!isHostOf(parsed, facebookHost) && !isSubdomainOf(parsed, facebookHost))) {
    return
  }

  return {
    provider: 'facebook',
    id: href,
    src: `https://www.facebook.com/plugins/${plugin}.php?href=${encodeURIComponent(href)}`,
    url: href,
  }
}

export const facebookPostEmbedResolver: EmbedResolver = {
  selector: 'div.fb-post[data-href]',
  extract: (element): EmbedResolverResult | undefined => {
    return extractEmbed(element, 'post')
  },
}

export const facebookVideoEmbedResolver: EmbedResolver = {
  selector: 'div.fb-video[data-href]',
  extract: (element): EmbedResolverResult | undefined => {
    return extractEmbed(element, 'video')
  },
}
