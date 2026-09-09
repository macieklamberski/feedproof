import type { DomTransform } from '../../types.js'

// Shopify's deferred-media parks a whole <video> in a <template>, so the media arms stay.
const embedSelector = [
  'iframe',
  '[data-embed-src]',
  'video[src]',
  'audio[src]',
  'video source[src]',
  'audio source[src]',
].join(', ')

// linkedom has no template content fragment: the children hang off the element itself.
const templateContent = (template: Element): ParentNode => {
  const fragment = (template as HTMLTemplateElement).content
  return fragment?.childNodes.length ? fragment : template
}

// A video plugin's <template> holding the real iframe, which no script activates in a reader.
// A template holding no embed is a templating or web-component skeleton never meant to render.
// Better Core Video Embeds ships the `hd-bcve` markup, with a thumbnail outside the template.
export const surfaceTemplateEmbeds: DomTransform = () => (document) => {
  for (const template of document.querySelectorAll('template')) {
    const source = templateContent(template)

    if (!source.querySelector(embedSelector)) {
      continue
    }

    const parent = template.parentNode
    if (!parent) {
      continue
    }

    while (source.firstChild) {
      parent.insertBefore(source.firstChild, template)
    }

    template.remove()
  }
}
