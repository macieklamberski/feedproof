import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { CleanUrlFn, Enclosure, TransformContext } from '../types.js'
import { getElementDimensions } from './dom.js'
import { getImageFingerprint, getUrlSizeHint } from './images.js'
import { absoluteUrlRegex, cleanUrl, resolveOrKeepUrl } from './urls.js'

export const isAudioEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'audio' || !!enclosure.type?.startsWith('audio/')
}

export const isVideoEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'video' || !!enclosure.type?.startsWith('video/')
}

export const isImageEnclosure = (enclosure: Enclosure): boolean => {
  return enclosure.medium === 'image' || !!enclosure.type?.startsWith('image/')
}

export const isAvatarEnclosure = (url: string, avatarHosts: ReadonlyArray<string>): boolean => {
  return isHostOf(url, avatarHosts) || isSubdomainOf(url, avatarHosts)
}

// Picks between two copies of one image. A url with no size in it is the original, so a bare
// photo.jpg beats photo-800x450.jpg. Between two sized copies the bigger one wins, and on a tie
// the one without a query string.
const isPreferredVariant = (incoming: Enclosure, kept: Enclosure): boolean => {
  const incomingUrl = incoming.url ?? ''
  const keptUrl = kept.url ?? ''
  const incomingHint = getUrlSizeHint(incomingUrl)
  const keptHint = getUrlSizeHint(keptUrl)

  const incomingIsOriginal = incomingHint === 0
  const keptIsOriginal = keptHint === 0

  if (incomingIsOriginal !== keptIsOriginal) {
    return incomingIsOriginal
  }

  if (incomingHint !== keptHint) {
    return incomingHint > keptHint
  }

  return keptUrl.includes('?') && !incomingUrl.includes('?')
}

// A feed often lists one picture twice, as a native enclosure and again as a media:content,
// scaled, proxied through a CDN or with a `?w=` query, and each copy would inject on its own.
// The key is the same size-agnostic fingerprint stripDuplicateEnclosures uses. Audio and video
// stay out of this: their query strings often carry identity, as podcast proxies do.
const dedupeImageEnclosures = (
  enclosures: ReadonlyArray<Enclosure>,
  cleanUrlFn?: CleanUrlFn,
): Array<Enclosure> => {
  const indexByKey = new Map<string, number>()
  const result: Array<Enclosure> = []

  for (const enclosure of enclosures) {
    if (typeof enclosure.url !== 'string' || !isImageEnclosure(enclosure)) {
      result.push(enclosure)
      continue
    }

    const key = getImageFingerprint(enclosure.url, cleanUrlFn)
    const existingIndex = indexByKey.get(key)

    if (existingIndex === undefined) {
      indexByKey.set(key, result.length)
      result.push(enclosure)
      continue
    }

    if (isPreferredVariant(enclosure, result[existingIndex])) {
      result[existingIndex] = enclosure
    }
  }

  return result
}

// A rendition stating one dimension ranks by that alone.
const getPixelArea = (enclosure: Enclosure): number => {
  return (enclosure.width ?? enclosure.height ?? 0) * (enclosure.height ?? enclosure.width ?? 0)
}

// A media group is one object in several renditions, so it renders once. A rendition declaring
// a zero dimension carries no picture and yields to a sibling that has one, default flag or not;
// an absent dimension stays eligible.
const pickGroupRendition = (renditions: ReadonlyArray<Enclosure>): Enclosure => {
  const renderable = renditions.filter((rendition) => rendition.url ?? rendition.playerUrl)
  const eligible = renderable.length ? renderable : renditions
  const pictured = eligible.filter((rendition) => rendition.width !== 0 && rendition.height !== 0)
  const candidates = pictured.length ? pictured : eligible
  const preferred = candidates.find((rendition) => rendition.isDefault)

  if (preferred) {
    return preferred
  }

  return candidates.reduce((best, rendition) => {
    return getPixelArea(rendition) > getPixelArea(best) ? rendition : best
  })
}

// One rendition per group, standing where the group's first member stood; ungrouped
// enclosures pass through untouched.
const collapseGroups = (enclosures: ReadonlyArray<Enclosure>): Array<Enclosure> => {
  const groups = new Map<number, Array<Enclosure>>()

  for (const enclosure of enclosures) {
    if (enclosure.groupIndex === undefined) {
      continue
    }

    const renditions = groups.get(enclosure.groupIndex) ?? []
    renditions.push(enclosure)
    groups.set(enclosure.groupIndex, renditions)
  }

  const collapsed: Array<Enclosure> = []

  for (const enclosure of enclosures) {
    if (enclosure.groupIndex === undefined) {
      collapsed.push(enclosure)
      continue
    }

    const renditions = groups.get(enclosure.groupIndex)

    if (renditions?.[0] === enclosure) {
      collapsed.push(pickGroupRendition(renditions))
    }
  }

  return collapsed
}

// Query param values that are themselves absolute URLs, e.g. the file URL inside
// a player page like player.example.com/?media_url=<file>.
const extractNestedUrls = (url: string): Array<string> => {
  const parsed = parseUrl(url)

  if (!parsed) {
    return []
  }

  const nested: Array<string> = []

  for (const value of parsed.searchParams.values()) {
    if (absoluteUrlRegex.test(value)) {
      nested.push(value)
    }
  }

  return nested
}

// A player sometimes arrives as raw embed HTML (e.g. rawvoice:embed) instead of a
// URL. Parse it through the DOM so entity decoding and attribute quoting are
// handled properly, and turn the entry into a plain player page entry (url plus
// display size) that mergePlayerEnclosures can pair with its media file.
const extractEnclosureFromEmbed = (enclosure: Enclosure, document: Document): Enclosure => {
  if (!enclosure.playerEmbed) {
    return enclosure
  }

  const { playerEmbed, ...rest } = enclosure
  const container = document.createElement('div')
  container.innerHTML = playerEmbed

  // In real feeds (corpus sample, July 2026) rawvoice:embed is an iframe player in 36 of
  // 40 feeds. The rest wrap a native <audio> for the same file as the enclosure, or plain
  // text. Only frame-able elements count as players, so those others fall through and the
  // enclosure itself still renders.
  const frame = container.querySelector('iframe[src], embed[src]')

  if (!frame) {
    return rest
  }

  const dimensions = getElementDimensions(frame)

  return {
    ...rest,
    url: rest.url ?? frame.getAttribute('src') ?? undefined,
    width: rest.width ?? dimensions.width,
    height: rest.height ?? dimensions.height,
  }
}

// An enclosure in the shape the rest of the pass works with: its player embed folded in, both
// urls absolute. Absolute here rather than at each use, because the fingerprint that collapses
// duplicate images and the gravatar check both read the url as it stands, and one naming no
// host keys as itself and matches nothing.
const readEnclosure = (
  enclosure: Enclosure,
  document: Document,
  context: TransformContext,
): Enclosure => {
  const extracted = extractEnclosureFromEmbed(enclosure, document)

  return {
    ...extracted,
    url: resolveOrKeepUrl(extracted.url, context),
    playerUrl: resolveOrKeepUrl(extracted.playerUrl, context),
  }
}

// A feed sometimes lists the same media twice: once as the raw file and once as a
// player page carrying the file URL in a query param (podcast hosts pair a plain
// <enclosure> with a player entry like …/?media_url=<file>; the param name varies
// by host, so any URL-shaped param value counts). Collapse such pairs into the
// file entry with the player page as its playerUrl, so the item renders one
// embedded player instead of a player iframe next to a bare audio element.
const mergePlayerEnclosures = (
  enclosures: ReadonlyArray<Enclosure>,
  cleanUrlFn?: CleanUrlFn,
): Array<Enclosure> => {
  const result = [...enclosures]
  const removed = new Set<number>()

  const findFileIndex = (nestedUrl: string, playerIndex: number): number => {
    return result.findIndex((candidate, index) => {
      if (index === playerIndex || removed.has(index)) {
        return false
      }

      return (
        typeof candidate.url === 'string' && cleanUrl(candidate.url, { cleanUrlFn }) === nestedUrl
      )
    })
  }

  for (let playerIndex = 0; playerIndex < result.length; playerIndex++) {
    const player = result[playerIndex]

    if (removed.has(playerIndex) || typeof player.url !== 'string') {
      continue
    }

    for (const nested of extractNestedUrls(player.url)) {
      const fileIndex = findFileIndex(cleanUrl(nested, { cleanUrlFn }), playerIndex)

      if (fileIndex === -1) {
        continue
      }

      // Keep the file entry's own fields and fill only what it lacks from the
      // player entry (a player page often carries the display size the file
      // doesn't). The earlier position of the two is kept so injection order
      // stays stable.
      const file = result[fileIndex]
      const merged: Enclosure = { ...player, ...file, playerUrl: file.playerUrl ?? player.url }

      result[Math.min(playerIndex, fileIndex)] = merged
      removed.add(Math.max(playerIndex, fileIndex))
      break
    }
  }

  return result.filter((_, index) => !removed.has(index))
}

// The enclosures in the shape injection works with: read, one rendition per group, image
// variants collapsed, player pages merged with their files.
export const prepareEnclosures = (
  enclosures: ReadonlyArray<Enclosure>,
  document: Document,
  context: TransformContext,
): Array<Enclosure> => {
  const resolved = enclosures.map((enclosure) => readEnclosure(enclosure, document, context))
  const deduped = dedupeImageEnclosures(collapseGroups(resolved), context.cleanUrlFn)

  return mergePlayerEnclosures(deduped, context.cleanUrlFn)
}
