import type { DomTransform } from '../../types.js'

// Replaces <br> tags inside <pre> with newlines. Inside <pre>, whitespace is
// already preserved so <br> is redundant and can cause double line breaks.
const brTagRegex = /<br\s*\/?>/gi

export const replacePreLineBreaks: DomTransform = () => {
  return (document) => {
    for (const pre of document.querySelectorAll('pre')) {
      const target = pre.querySelector('code') ?? pre
      target.innerHTML = target.innerHTML.replace(brTagRegex, '\n')
    }
  }
}
