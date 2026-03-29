import { defaultStrippedParams } from 'feedcanon'
import type { DomTransform } from '../types.js'

export const stripTrackingParams: DomTransform = () => {
  return (document) => {
    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href')

      if (!href) {
        continue
      }

      try {
        const url = new URL(href)
        let changed = false

        for (const param of defaultStrippedParams) {
          if (url.searchParams.has(param)) {
            url.searchParams.delete(param)
            changed = true
          }
        }

        if (changed) {
          anchor.setAttribute('href', url.toString())
        }
      } catch {}
    }
  }
}
