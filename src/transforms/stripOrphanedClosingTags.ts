import type { StringTransform } from '../types.js'

// Closing tags without matching openers (e.g. </p> inside <table><tr>) make HTML5
// foster parenting create empty elements once the document is parsed. Strip them
// before downstream tools (sanitizers, parsers, autop) get a chance to materialize
// the empty nodes.
const orphanTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const orphanTagRegex = /<(\/?([a-z][a-z0-9]*))(\s[^>]*)?\/?>/gi

export const stripOrphanedClosingTags: StringTransform = () => {
  return (html) => {
    const counts: Record<string, number> = {}

    return html.replace(orphanTagRegex, (match, _full, tagName: string) => {
      const name = tagName.toLowerCase()

      if (!orphanTags.has(name)) {
        return match
      }

      if (match[1] === '/') {
        const count = counts[name] ?? 0

        if (count <= 0) {
          return ''
        }

        counts[name] = count - 1
      } else {
        counts[name] = (counts[name] ?? 0) + 1
      }

      return match
    })
  }
}
