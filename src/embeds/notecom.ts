import { getPathSegments, isHostOf, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// A note id is `n` followed by lowercase hex, e.g. `nf938ce640465`.
const safeNoteIdRegex = /^n[0-9a-f]+$/

// `note.mu` is the platform's former domain and still 301s to `note.com` on the same path
// (checked 2026-08-15), so both are matched and only the current one is minted.
const notecomHosts = ['note.com', 'note.mu']

// The player the platform's own client builds, and the only note.com url a reader can frame.
// It discriminates on body size rather than status: three real ids answered 200 at 3,109 to
// 3,203 bytes while two fabricated ones answered 200 at exactly 683 bytes, the empty shell
// (checked 2026-08-15). The real body carries the note's title, its author and a link to the
// post, none of which is in the feed markup, so those stay for enrichment.
const composePlayer = (noteId: string): string => {
  return `https://note.com/embed/notes/${noteId}`
}

// `note.com/notes/{id}` 301s to the canonical `note.com/{user}/n/{id}` (checked 2026-08-15).
// A carrier that names the user gives the canonical url directly; one that names only the id
// gets this form, which reaches the same post without inventing a user.
const composePostUrl = (noteId: string, pageUrl: string | undefined): string => {
  return pageUrl ?? `https://note.com/notes/${noteId}`
}

const composeEmbed = (noteId: string, pageUrl?: string): EmbedResolverResult | undefined => {
  if (!safeNoteIdRegex.test(noteId)) {
    return
  }

  return {
    provider: 'notecom',
    id: noteId,
    src: composePlayer(noteId),
    url: composePostUrl(noteId, pageUrl),
  }
}

// The two note.com url shapes, both naming the id in their last segment: the canonical post
// `note.com/{user}/n/{id}` and the player `note.com/embed/notes/{id}`. Which one a carrier holds
// decides whether a canonical url can be stated, since only the post form names the user.
type NoteUrl = { noteId: string; kind: 'post' | 'player' }

const readNoteUrl = (link: string): NoteUrl | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed || !isHostOf(parsed, notecomHosts)) {
    return
  }

  const segments = getPathSegments(parsed)
  const noteId = segments.at(-1)

  if (!noteId) {
    return
  }

  if (segments[1] === 'n' && segments.length > 2) {
    return { noteId, kind: 'post' }
  }

  if (segments[0] === 'embed' && segments[1] === 'notes') {
    return { noteId, kind: 'player' }
  }
}

// note.com ships an own-post embed as an empty `<figure>` that only its web client hydrates,
// naming the post in `data-src`. Nothing renders it in a reader, so the note is lost. The figure
// also carries the id alone in `data-identifier`, which is deliberately not read: it always
// repeats what the url states, so preferring it would only create a way for the id and the url
// on one placeholder to disagree.
//
// A figure whose `data-src` already points at the player is the same embed a step further along,
// and is claimed here too: minting the same player from it is what stops it becoming a link to
// an embed page, which is what it degraded to before.
export const notecomFigureEmbedResolver = createMarkupEmbedResolver(
  'figure[embedded-service="note"][data-src]',
  (element) => {
    const source = attr(element, 'data-src')
    const target = source ? readNoteUrl(source) : undefined

    if (!target) {
      return
    }

    return composeEmbed(target.noteId, target.kind === 'post' ? source : undefined)
  },
)

// The player the figure's script builds at runtime, saved into a feed by a CMS that ran it
// first, plus the hand-written form. 255 corpus feeds carry it and every one of them reached a
// provider-less generic placeholder before this resolver existed.
export const notecomIframeEmbedResolver = createUrlEmbedResolver(notecomHosts, (url) => {
  const target = readNoteUrl(url)

  return target?.kind === 'player' ? composeEmbed(target.noteId) : undefined
})
