import type { DomTransform } from '../../types.js'

const wrapperTags = new Set(['div', 'article', 'section', 'main', 'header', 'footer'])

const hasEmbedAttribute = (element: Element): boolean => {
  for (const attribute of element.attributes) {
    if (attribute.name.startsWith('data-embed')) {
      return true
    }
  }
  return false
}

// Removes purely presentational container tags (`<div>` / `<article>` /
// `<section>` / `<main>` / `<header>` / `<footer>`) anywhere in the document.
// Children are hoisted in place, preserving any text-node siblings.
//
// Subsumes the old body-level wrapper unwrap, the figure media-wrapper
// unwrap, the figcaption div unwrap, and Substack-style `<a><div><picture>`
// nesting. Reader apps render content with their own typography, so the
// classes/styles on these containers are not load-bearing.
//
// Pipeline placement: runs AFTER merge transforms (`mergeFragmentedLists`,
// `mergeConsecutiveOneLinerPres`) so unwrapping doesn't expose new adjacent
// siblings for those transforms to merge — preserving author-intended
// separation between e.g. two lists that lived in separate divs.
//
// Containers carrying `data-embed-*` attributes (feedsweep's own embed
// placeholders) are always preserved. Iterates in post-order so deeply
// nested wrappers collapse in a single pass.
export const unwrapWrappers: DomTransform = () => {
  return (document) => {
    const candidates = [...document.body.querySelectorAll([...wrapperTags].join(','))]

    for (let i = candidates.length - 1; i >= 0; i--) {
      const element = candidates[i]

      if (!element.parentNode) {
        continue
      }

      if (hasEmbedAttribute(element)) {
        continue
      }

      const parent = element.parentNode

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element)
      }

      element.remove()
    }
  }
}
