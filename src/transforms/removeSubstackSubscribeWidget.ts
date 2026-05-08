import type { DomTransform } from '../types.js'

export const removeSubstackSubscribeWidget: DomTransform = () => {
  return (document) => {
    const widgets = document.querySelectorAll('[data-component-name="SubscribeWidget"]')

    for (const widget of widgets) {
      widget.remove()
    }
  }
}
