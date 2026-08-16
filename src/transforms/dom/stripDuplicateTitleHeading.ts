import type { DomTransform } from '../../types.js'

const headingSelector = 'h1, h2, h3, h4, h5, h6'
const mediaSelector = 'img, picture, video, audio, iframe, svg'

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

const markupRegex = /[&<]/

// A title can carry markup the heading's text does not: entities left by a feed that escaped
// it twice (Tumblr's `&amp;rsquo;`), or inline tags. Parsing it gives the text to compare.
const getTitleText = (document: Document, value: string): string => {
  if (!markupRegex.test(value)) {
    return value
  }

  const container = document.createElement('div')
  container.innerHTML = value

  return container.textContent ?? ''
}

export const stripDuplicateTitleHeading: DomTransform = (context) => {
  const articleTitle = context.articleTitle?.trim() ?? ''

  if (!articleTitle) {
    return () => {}
  }

  return (document) => {
    let heading: Element | null = document.querySelector(headingSelector)
    let text = normalize(heading?.textContent ?? '')

    // Fall back to a full sweep only when the first heading is empty (rare).
    if (heading && !text) {
      heading = null

      for (const candidate of document.querySelectorAll(headingSelector)) {
        text = normalize(candidate.textContent ?? '')

        if (text) {
          heading = candidate
          break
        }
      }
    }

    if (!heading) {
      return
    }

    if (text !== normalize(getTitleText(document, articleTitle))) {
      return
    }

    // Nested heading: `<h2><h1>x</h1></h2>`: linkedom doesn't auto-close, so
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
