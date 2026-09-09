import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'notecom'

// A note id is `n` followed by lowercase hex, e.g. `nf938ce640465`.
const safeNoteIdRegex = /^n[0-9a-f]+$/

// `note.mu` is the platform's former domain and still 301s to `note.com` on the same path
// (checked 2026-08-15), so both are matched and only the current one is minted.
const notecomHosts = ['note.com', 'note.mu']

// The player answers 200 for any id: a full body carrying the title, the author and a post link for
// a real one, an empty shell for a fabricated one.
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
    provider,
    id: noteId,
    src: composePlayer(noteId),
    url: composePostUrl(noteId, pageUrl),
  }
}

type NoteUrl = { noteId: string; kind: 'post' | 'player' }

// Each id is read at its position: off the end, a trailing slug would be handed over as the note.
// The shapes are the post note.com/{user}/n/{id}, the same post under a publication as
// biz.note.com/n/{id}, and the player note.com/embed/notes/{id}.
const readNoteUrl = (link: string): NoteUrl | undefined => {
  const parsed = parseUrlOnHosts(link, notecomHosts)
  const segments = parsed ? getPathSegments(parsed) : []

  if (segments[1] === 'n' && segments[2]) {
    return { noteId: segments[2], kind: 'post' }
  }

  if (segments[0] === 'n' && segments.length === 2) {
    return { noteId: segments[1], kind: 'post' }
  }

  if (segments[0] === 'embed' && segments[1] === 'notes' && segments[2]) {
    return { noteId: segments[2], kind: 'player' }
  }
}

// A note.com embed figure carries the post url, not the player, so a reader frames the article.
// A CMS that ran the figure's script saves the player iframe itself into the feed.
export const notecomIframeEmbedResolver = createUrlEmbedResolver(notecomHosts, (url) => {
  const target = readNoteUrl(url)

  if (!target) {
    return
  }

  // Only the post form names the user, so only it can state the canonical url outright.
  return composeEmbed(target.noteId, target.kind === 'post' ? url : undefined)
})

// The player's height message, `height::{player url}::{pixels}`.
const heightMessageRegex = /^height::.*::(\d+(?:\.\d+)?)$/

export const readNotecomHeight = (data: unknown): number | undefined => {
  return typeof data === 'string'
    ? readPixels(Number(data.match(heightMessageRegex)?.[1]))
    : undefined
}

export const notecomRenderHint: EmbedRenderHint = {
  provider,
  origin: 'https://note.com',
  readHeight: readNotecomHeight,
}
