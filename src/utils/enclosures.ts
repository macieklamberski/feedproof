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
// stay out of this: there the query can be the whole identity, a YouTube watch?v= or a player
// page carrying the file in ?url=.
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

// A media group is one thing in several renditions, so only one of them renders: the default,
// else the first. A group with nothing to load renders nothing.
const pickGroupRendition = (renditions: ReadonlyArray<Enclosure>): Enclosure | undefined => {
  const renderable = renditions.filter((rendition) => rendition.url ?? rendition.playerUrl)

  return renderable.find((rendition) => rendition.isDefault) ?? renderable[0]
}

// An entry outside any group that names the same file as a group member is that member listed
// again, so it joins the group: it keeps its own position and takes the member's fields.
const foldEqualMembers = (
  enclosures: ReadonlyArray<Enclosure>,
  cleanUrlFn?: CleanUrlFn,
): Array<Enclosure> => {
  const members = new Map<string, Enclosure>()

  for (const enclosure of enclosures) {
    if (enclosure.groupIndex !== undefined && typeof enclosure.url === 'string') {
      members.set(cleanUrl(enclosure.url, { cleanUrlFn }), enclosure)
    }
  }

  if (!members.size) {
    return [...enclosures]
  }

  const emitted = new Set<Enclosure>()
  const folded: Array<Enclosure> = []

  for (const enclosure of enclosures) {
    if (enclosure.groupIndex !== undefined) {
      if (!emitted.has(enclosure)) {
        emitted.add(enclosure)
        folded.push(enclosure)
      }

      continue
    }

    if (typeof enclosure.url !== 'string') {
      folded.push(enclosure)
      continue
    }

    const member = members.get(cleanUrl(enclosure.url, { cleanUrlFn }))

    if (!member) {
      folded.push(enclosure)
      continue
    }

    if (!emitted.has(member)) {
      emitted.add(member)
      folded.push({ ...enclosure, ...member })
    }
  }

  return folded
}

// Keeps one rendition per group, in the place the group's first member had. Enclosures outside
// a group pass through as they are.
const collapseGroups = (
  enclosures: ReadonlyArray<Enclosure>,
  cleanUrlFn?: CleanUrlFn,
): Array<Enclosure> => {
  const folded = foldEqualMembers(enclosures, cleanUrlFn)
  const groups = new Map<number, Array<Enclosure>>()

  for (const enclosure of folded) {
    if (enclosure.groupIndex === undefined) {
      continue
    }

    const renditions = groups.get(enclosure.groupIndex) ?? []
    renditions.push(enclosure)
    groups.set(enclosure.groupIndex, renditions)
  }

  const collapsed: Array<Enclosure> = []

  for (const enclosure of folded) {
    if (enclosure.groupIndex === undefined) {
      collapsed.push(enclosure)
      continue
    }

    const renditions = groups.get(enclosure.groupIndex)

    if (renditions?.[0] !== enclosure) {
      continue
    }

    const rendition = pickGroupRendition(renditions)

    if (rendition) {
      collapsed.push(rendition)
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

// A player sometimes arrives as raw embed HTML, rawvoice:embed for one, instead of a url. Parsing
// it through the DOM takes care of entities and attribute quoting, and what comes out is a plain
// player page entry, url and display size, that mergePlayerEnclosures can pair with its file.
const extractEnclosureFromEmbed = (enclosure: Enclosure, document: Document): Enclosure => {
  if (!enclosure.playerEmbed) {
    return enclosure
  }

  const { playerEmbed, ...rest } = enclosure
  const container = document.createElement('div')
  container.innerHTML = playerEmbed

  // In a July 2026 corpus sample, rawvoice:embed was an iframe player in 36 of 40 feeds. The
  // rest wrap a native <audio> for the same file as the enclosure, or plain text. Only frameable
  // elements count as players, so those fall through and the enclosure itself still renders.
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

// Folds the player embed in and makes both urls absolute. Absolute here, once, because the image
// fingerprint and the gravatar check both read the url as it is, and a url with no host keys as
// itself and matches nothing.
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

// A feed sometimes lists the same media twice: the raw file, and a player page carrying that
// file's url in a query param. Podcast hosts do this, a plain <enclosure> next to a player entry
// like …/?media_url=<file>, and the param name varies by host, so any url-shaped param value
// counts. The pair collapses into the file entry, with the player page as its playerUrl, so the
// item gets one embedded player instead of a player iframe next to a bare audio element.
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

      // The file entry keeps its own fields and takes from the player entry only what it lacks,
      // usually the display size. The merged entry sits at the earlier of the two positions so
      // the injection order does not move.
      const file = result[fileIndex]
      const merged: Enclosure = { ...player, ...file, playerUrl: file.playerUrl ?? player.url }

      result[Math.min(playerIndex, fileIndex)] = merged
      removed.add(Math.max(playerIndex, fileIndex))
      break
    }
  }

  return result.filter((_, index) => !removed.has(index))
}

// Reads the enclosures and gets them into the shape injection works with: one rendition per
// group, image variants collapsed, player pages merged with their files.
export const prepareEnclosures = (
  enclosures: ReadonlyArray<Enclosure>,
  document: Document,
  context: TransformContext,
): Array<Enclosure> => {
  const resolved = enclosures.map((enclosure) => readEnclosure(enclosure, document, context))
  const collapsed = collapseGroups(resolved, context.cleanUrlFn)
  const deduped = dedupeImageEnclosures(collapsed, context.cleanUrlFn)

  return mergePlayerEnclosures(deduped, context.cleanUrlFn)
}
