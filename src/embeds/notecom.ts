import { getPathSegments } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { readPixels } from '../utils/hints.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'notecom'

const safeNoteIdRegex = /^n[0-9a-f]+$/

const notecomHosts = ['note.com', 'note.mu']

const composePlayer = (noteId: string): string => {
  return `https://note.com/embed/notes/${noteId}`
}

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
export const notecomIframeEmbedResolver = createUrlEmbedResolver(notecomHosts, (url) => {
  const target = readNoteUrl(url)

  if (!target) {
    return
  }

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
