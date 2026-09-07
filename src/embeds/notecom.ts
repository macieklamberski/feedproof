import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A note id is `n` followed by lowercase hex, e.g. `nf938ce640465`.
const safeNoteIdRegex = /^n[0-9a-f]+$/

// `note.mu` is the platform's former domain and still 301s to `note.com` on the same path
// (checked 2026-08-15), so both are matched and only the current one is minted.
const notecomHosts = ['note.com', 'note.mu']

// The player the platform's own client builds, and the only note.com url a reader can frame.
// It discriminates on body size rather than status: a real id answers 200 with a full body
// while a fabricated one answers 200 with the identical empty shell (checked 2026-08-15). The
// real body carries the note's title, its author and a link to the post, none of which is in
// the feed markup, so those stay for enrichment.
const composePlayer = (noteId: string): string => {
  return `https://note.com/embed/notes/${noteId}`
}

// `note.com/notes/{id}` 301s to the canonical `note.com/{user}/n/{id}` (checked 2026-08-15).
// A carrier that names the user gives the canonical url directly. One that names only the id
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

// The note.com url shapes, all naming the id in their last segment: the canonical post
// `note.com/{user}/n/{id}`, the same post under one of the platform's own publications, where
// the subdomain stands in for the user (`biz.note.com/n/{id}`), and the player
// `note.com/embed/notes/{id}`. Which one a carrier holds decides whether a canonical url can be
// stated, since only the two post forms name where the note lives. The player serves a
// publication's note like any other: a real id answers the full body and an invented one the
// empty shell (checked 2026-09-05).
type NoteUrl = { noteId: string; kind: 'post' | 'player' }

const readNoteUrl = (link: string): NoteUrl | undefined => {
  const parsed = parseUrlOnHosts(link, notecomHosts)
  const segments = parsed ? getPathSegments(parsed) : []
  const noteId = segments.at(-1)

  if (!noteId) {
    return
  }

  if (segments[1] === 'n' && segments.length > 2) {
    return { noteId, kind: 'post' }
  }

  if (segments[0] === 'n' && segments.length === 2) {
    return { noteId, kind: 'post' }
  }

  if (segments[0] === 'embed' && segments[1] === 'notes') {
    return { noteId, kind: 'player' }
  }
}

// Two carriers, one resolver. The player is what the figure's script builds at runtime and what
// a CMS that ran the script first saves into a feed, which would otherwise reach a provider-less
// generic placeholder. The post url is what note.com's own embed figure names, and
// `convertNoteEmbeds` frames it so this claims it there too, which is why the figure needs no
// resolver of its own.
export const notecomIframeEmbedResolver = createUrlEmbedResolver(notecomHosts, (url) => {
  const target = readNoteUrl(url)

  if (!target) {
    return
  }

  // Only the post form names the user, so only it can state the canonical url outright.
  return composeEmbed(target.noteId, target.kind === 'post' ? url : undefined)
})

// The player reports its height as a string, `height::{player url}::{pixels}`, once the note has
// rendered. The url in the middle can hold anything, so the number is read off the end.
const heightMessageRegex = /^height::.*::(\d+(?:\.\d+)?)$/

export const readNotecomHeight = (data: unknown): number | undefined => {
  return typeof data === 'string'
    ? readPixels(Number(data.match(heightMessageRegex)?.[1]))
    : undefined
}

export const notecomRenderHint: EmbedRenderHint = {
  provider: 'notecom',
  origin: 'https://note.com',
  readHeight: readNotecomHeight,
}
