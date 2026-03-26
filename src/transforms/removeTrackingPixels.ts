import type { DomTransform } from '../types.js'

export const removeTrackingPixels: DomTransform = () => {
  return (document) => {
    for (const image of document.querySelectorAll('img')) {
      const width = image.getAttribute('width')
      const height = image.getAttribute('height')

      if (width && height && Number(width) <= 2 && Number(height) <= 2) {
        image.remove()
      }
    }
  }
}
