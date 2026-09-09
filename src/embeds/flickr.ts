import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { flashVars, keepIfMatches } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver, getEmbedSize } from '../utils/widgets.js'

const flickrHosts = ['flickr.com']

const flashPlayerPathRegex = /^\/apps\/slideshow\//i
const legacyPlayerPathRegex = /^\/slideshow\/index\.gne$/i

const setPathRegex = /^\/photos\/([\w.@-]+)\/sets\/(\d+)/
const streamPathRegex = /^\/photos\/([\w.@-]+)\/show\/?$/
const groupPathRegex = /^\/groups\/(\d+@N\d\d)\/pool\/show\/?$/

const safeSetIdRegex = /^\d+$/

// The first class admits no dot, so `..` never reaches a minted path.
const safeOwnerRegex = /^[\w-][\w.-]*(?:@N\d\d)?$/

const safeNsidRegex = /^\d+@N\d\d$/

type FlickrSubject = { setId?: string; owner?: string; groupId?: string }

const composeAlbumPlayer = (setId: string): string => {
  return `https://embedr.flickr.com/photosets/${setId}`
}

const composeStreamPlayer = (owner: string): string => {
  return `https://embedr.flickr.com/photostreams/${owner}`
}

const composeAliasStreamPlayer = (owner: string): string => {
  return `https://www.flickr.com/photos/${owner}/player`
}

const composeGroupPlayer = (groupId: string): string => {
  return `https://embedr.flickr.com/groups/${groupId}`
}

// Flickr's base58 alphabet for flic.kr short urls.
const base58Alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'

const composeShortAlbumUrl = (setId: string): string => {
  let remaining = BigInt(setId)
  let encoded = ''

  while (remaining > 0n) {
    encoded = base58Alphabet[Number(remaining % 58n)] + encoded
    remaining /= 58n
  }

  return `https://flic.kr/s/${encoded || base58Alphabet[0]}`
}

const dialogSize = { width: 400, height: 300 }

const readPageSubject = (page: string): FlickrSubject | undefined => {
  const set = page.match(setPathRegex)

  if (set) {
    return { owner: set[1], setId: set[2] }
  }

  const group = page.match(groupPathRegex)

  if (group) {
    return { groupId: group[1] }
  }

  const stream = page.match(streamPathRegex)

  if (stream) {
    return { owner: stream[1] }
  }
}

const readFlashSubject = (element: Element): FlickrSubject => {
  const config = new URLSearchParams(flashVars(element) ?? '')
  const page = config.get('page_show_url') ?? ''

  return readPageSubject(page) ?? { owner: config.get('user_id') ?? undefined }
}

const readLegacySubject = (parsed: URL): FlickrSubject => {
  return {
    setId: parsed.searchParams.get('set_id') ?? undefined,
    owner: parsed.searchParams.get('user_id') ?? undefined,
    groupId: parsed.searchParams.get('group_id') ?? undefined,
  }
}

const composeEmbed = (subject: FlickrSubject): EmbedResolverResult | undefined => {
  const owner = keepIfMatches(subject.owner, safeOwnerRegex)

  if (subject.setId && safeSetIdRegex.test(subject.setId)) {
    return owner
      ? {
          provider: 'flickr',
          id: `${owner}/${subject.setId}`,
          src: composeAlbumPlayer(subject.setId),
          url: `https://www.flickr.com/photos/${owner}/sets/${subject.setId}`,
        }
      : {
          provider: 'flickr',
          id: `photosets/${subject.setId}`,
          src: composeAlbumPlayer(subject.setId),
          url: composeShortAlbumUrl(subject.setId),
        }
  }

  if (subject.groupId && safeNsidRegex.test(subject.groupId)) {
    return {
      provider: 'flickr',
      id: `groups/${subject.groupId}`,
      src: composeGroupPlayer(subject.groupId),
      url: `https://www.flickr.com/groups/${subject.groupId}/`,
    }
  }

  if (owner) {
    return {
      provider: 'flickr',
      id: `photostreams/${owner}`,
      src: safeNsidRegex.test(owner) ? composeStreamPlayer(owner) : composeAliasStreamPlayer(owner),
      url: `https://www.flickr.com/photos/${owner}/`,
    }
  }
}

export const flickrResolveEmbed = (
  link: string,
  element: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, placeholderBaseUrl)

  if (!parsed) {
    return
  }

  let subject: FlickrSubject | undefined

  if (flashPlayerPathRegex.test(parsed.pathname)) {
    subject = readFlashSubject(element)
  } else if (legacyPlayerPathRegex.test(parsed.pathname)) {
    subject = readLegacySubject(parsed)
  } else {
    subject = readPageSubject(parsed.pathname)
  }

  const result = subject && composeEmbed(subject)

  if (!result) {
    return
  }

  const declared = getEmbedSize(element, 0)
  const { width, height } =
    declared.width && declared.height
      ? { width: declared.width, height: declared.height }
      : dialogSize

  return { ...result, src: `${result.src}?width=${width}&height=${height}`, width, height }
}

// Flickr's slideshow swf, legacy iframe or framed album page, none of which renders today.
export const flickrEmbedResolver = createUrlEmbedResolver(flickrHosts, flickrResolveEmbed, {
  preferResolverSize: true,
})
