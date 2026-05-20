import type { DomTransform } from '../../types.js'

const headingSelector = 'h1, h2, h3, h4, h5, h6'
const mediaSelector = 'img, picture, video, audio, iframe, svg'

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

export const stripDuplicateTitleHeading: DomTransform = (context) => {
  const articleTitle = context.articleTitle
  const title = articleTitle && articleTitle.trim().length > 0 ? normalize(articleTitle) : ''

  if (!title) {
    return () => {}
  }

  return (document) => {
    let heading: Element | null = document.querySelector(headingSelector)
    let text = heading?.textContent?.trim() ?? ''

    // Fall back to a full sweep only when the first heading is empty (rare).
    if (heading && text.length === 0) {
      heading = null
      for (const candidate of document.querySelectorAll(headingSelector)) {
        const candidateText = candidate.textContent?.trim() ?? ''
        if (candidateText.length > 0) {
          heading = candidate
          text = candidateText
          break
        }
      }
    }

    if (!heading) {
      return
    }

    if (text.toLowerCase().replace(/\s+/g, ' ') !== title) {
      return
    }

    // Nested heading: `<h2><h1>x</h1></h2>` — linkedom doesn't auto-close, so
    // removing the outer drops the inner. Skip.
    if (heading.querySelector(headingSelector)) {
      return
    }

    // Media inside the heading would be silently deleted along with it.
    if (heading.querySelector(mediaSelector)) {
      return
    }

    heading.remove()
  }
}
