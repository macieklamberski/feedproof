import type { DomTransform } from '../../types.js'

const nonAsciiRegex = /[-￿]/
const asciiLetterRegex = /[a-zA-Z]/

const isEmojiShapedAlt = (alt: string): boolean => {
  return nonAsciiRegex.test(alt) && !asciiLetterRegex.test(alt)
}

export const unwrapEmojiImages: DomTransform = (context) => {
  const hostSelectors = context.emojiImageHosts.map((host) => `img[alt][src*="${host}"]`)
  const selector = ['img.wp-smiley[alt]', 'img.emoji[alt]', ...hostSelectors].join(', ')

  return (document) => {
    for (const image of document.querySelectorAll(selector)) {
      const alt = image.getAttribute('alt')

      if (alt && isEmojiShapedAlt(alt)) {
        image.replaceWith(document.createTextNode(alt))
      }
    }
  }
}
