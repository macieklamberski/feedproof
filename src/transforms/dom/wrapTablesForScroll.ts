import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName } from '../../utils/dom.js'

const tableTags = new Set(['table'])

// A wide <table>, which stretches the layout unless a wrapper lets it scroll horizontally.
export const wrapTablesForScroll: DomTransform = () => {
  return (document) => {
    const tables = document.querySelectorAll('table')

    for (const table of tables) {
      const parent = table.parentNode

      if (!parent) {
        continue
      }

      if (hasAncestorWithTagName(table, tableTags)) {
        continue
      }

      if (table.parentElement?.hasAttribute('data-table')) {
        continue
      }

      const wrapper = document.createElement('div')
      wrapper.setAttribute('data-table', '')
      parent.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    }
  }
}
