import type { DomTransform } from '../../types.js'
import { hasAncestorWithTagName } from '../../utils/dom.js'

const tableTags = new Set(['table'])

// Wraps every top-level <table> in a <div data-table> so downstream styling has
// a stable hook to make wide tables scroll horizontally instead of stretching
// the layout. Tables nested in another table's cell are skipped. Idempotent via
// the existing-wrapper check.
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
