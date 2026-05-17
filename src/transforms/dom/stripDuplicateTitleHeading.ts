import type { DomTransform } from '../../types.js'

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

export const stripDuplicateTitleHeading: DomTransform = (context) => {
  const title = context.articleTitle ? normalize(context.articleTitle) : ''

  return (document) => {
    if (!title) {
      return
    }

    const heading = document.querySelector('h1, h2, h3, h4, h5, h6')

    if (!heading) {
      return
    }

    if (normalize(heading.textContent ?? '') === title) {
      heading.remove()
    }
  }
}
