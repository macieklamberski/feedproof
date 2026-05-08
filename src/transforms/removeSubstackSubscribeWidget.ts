import type { DomTransform } from '../types.js'

export const removeSubstackSubscribeWidget: DomTransform = () => {
  return (document) => {
    for (const widget of document.querySelectorAll('[data-component-name="SubscribeWidget"]')) {
      widget.remove()
    }
  }
}
