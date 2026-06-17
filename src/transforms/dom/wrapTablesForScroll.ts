import { hasAncestorWithTagName } from '../../common.js'
import type { DomTransform } from '../../types.js'

const tableTags = new Set(['table'])

// Author-supplied scroll wrappers (Bootstrap `.table-responsive`, Gutenberg
// `figure.wp-block-table`) already box the table; reuse one as the hook instead
// of nesting a second wrapper inside it. The author's own class won't survive a
// reader that strips classes, so we still need our `data-table` marker on it.
const authorWrapperClassRegex = /(?:^|\s)(?:table-responsive|wp-block-table)(?:\s|$)/

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

      const parentElement = table.parentElement

      if (parentElement?.hasAttribute('data-table')) {
        continue
      }

      // Reuse an existing author wrapper rather than nesting our own inside it.
      if (
        parentElement &&
        authorWrapperClassRegex.test(parentElement.getAttribute('class') ?? '')
      ) {
        parentElement.setAttribute('data-table', '')
        continue
      }

      const wrapper = document.createElement('div')
      wrapper.setAttribute('data-table', '')
      parent.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    }
  }
}
