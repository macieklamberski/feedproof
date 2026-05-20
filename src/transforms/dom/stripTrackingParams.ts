import { defaultStrippedParams } from 'feedcanon'
import type { DomTransform } from '../../types.js'

const strippedParamSet = new Set<string>(defaultStrippedParams)

export const stripTrackingParams: DomTransform = () => {
  return (document) => {
    const anchors = document.querySelectorAll('a[href]')

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href')

      if (!href || href.indexOf('?') === -1) {
        continue
      }

      try {
        const url = new URL(href)
        const toDelete: Array<string> = []

        for (const key of url.searchParams.keys()) {
          if (strippedParamSet.has(key)) {
            toDelete.push(key)
          }
        }

        if (toDelete.length > 0) {
          for (const key of toDelete) {
            url.searchParams.delete(key)
          }
          anchor.setAttribute('href', url.toString())
        }
      } catch {}
    }
  }
}
