import type { DomTransform } from '../../types.js'

// Media is here alongside embeds because Shopify's default theme parks a complete
// <video controls><source src> inside a <template> in its <deferred-media> element, so the
// markup is already right and only its location makes it inert.
const embedSelector = [
  'iframe',
  '[data-embed-src]',
  'video[src]',
  'audio[src]',
  'video source[src]',
  'audio source[src]',
].join(', ')

// Returns the node that actually holds a template's content: the `.content`
// DocumentFragment in a spec parser (jsdom), or the template element itself in
// linkedom, which exposes the children directly.
const templateContent = (template: Element): ParentNode => {
  const fragment = (template as HTMLTemplateElement).content
  return fragment?.childNodes.length ? fragment : template
}

// Lazy-load video plugins (e.g. Better Core Video Embeds, the `hd-bcve` markup on
// moby.com) park the real <iframe> inside a <template> and show a thumbnail outside
// it. In a reader there is no JS to activate the template, so the embed stays trapped
// and never renders. When a template holds an embed, hoist its content into the tree
// so convertWidgets and assignVideoPosters can placeholder it and
// connect the poster. Templates without an embed are JS-templating / web-component
// skeletons not meant to render, so they are left alone.
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
