import type { StringTransform } from '../types.js'

const commentRegex = /<!--[\s\S]*?-->/g

// Removes HTML comments from feed content. Comments are typically authoring
// noise (editor scaffolding, tracking markers, conditional-comment leftovers)
// that adds no value to the rendered output and can interfere with downstream
// DOM traversal. Runs after decodeDoubleEncodedTags so entity-encoded comments
// (&lt;!-- ... --&gt;) get decoded first and then stripped here.
export const stripComments: StringTransform = () => {
  return (html) => {
    return html.replace(commentRegex, '')
  }
}
