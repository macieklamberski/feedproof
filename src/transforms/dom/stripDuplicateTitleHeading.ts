import type { DomTransform } from '../../types.js'

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

export const stripDuplicateTitleHeading: DomTransform = (context) => {
  const title = context.articleTitle ? normalize(context.articleTitle) : ''

  return (document) => {
    if (!title) {
      return
    }

    // Skip past leading empty headings (e.g. foster-parented <h*> debris
    // before a <table>) so they don't mask the real article heading.
    const heading = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).find(
      (candidate) => (candidate.textContent ?? '').trim().length > 0,
    )

    if (!heading) {
      return
    }

    if (normalize(heading.textContent ?? '') !== title) {
      return
    }

    // Skip when the heading contains a nested heading (parsers like linkedom
    // don't auto-close outer headings, so `<h2><h1>x</h1></h2>` keeps both).
    // Removing the outer would drop the inner too.
    if (heading.querySelector('h1, h2, h3, h4, h5, h6')) {
      return
    }

    // Skip when the heading contains a media element (the matching text might
    // be accompanying alt-shaped caption, not the only content). Removing
    // the heading would silently delete the embedded image / iframe / video.
    if (heading.querySelector('img, picture, video, audio, iframe, svg')) {
      return
    }

    heading.remove()
  }
}
