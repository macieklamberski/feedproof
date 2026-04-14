import type { StringTransform } from '../types.js'

const hasHtmlRegex = /<[a-z][a-z0-9]*[\s>]/i

// Matches entity-encoded HTML tags: &lt;tagname ...&gt; or &lt;/tagname&gt;.
// Attribute group uses negative lookahead to stop at &gt; but allow other & sequences
// (e.g. &amp; inside attribute values).
const encodedTagRegex = /&lt;(\/?)([a-zA-Z][\w-]*)((?:[^&]|&(?!gt;))*)&gt;/g
const hasEncodedTagRegex = /&lt;[a-zA-Z/]/

// Matches <code>, <pre>, or <pre><code> blocks (with optional attributes) and their
// content, used to protect intentionally-encoded tags inside code from being decoded.
const codeBlockRegex = /<(code|pre)(\s[^>]*)?>[\s\S]*?<\/\1>/gi

// Decodes HTML tags that were double-encoded by buggy feed generators. Some feeds
// mix real HTML (<p>, <ul>) with entity-encoded tags (&lt;a href="..."&gt;) in the
// same content block. After XML parsing, the double-encoded tags remain as visible
// text instead of rendered HTML. This transform detects the mixed state and decodes
// the entity-encoded tags back to real HTML. Skips content inside <code> and <pre>
// blocks where entity-encoded tags are intentional (e.g. tutorials showing HTML).
export const decodeDoubleEncodedTags: StringTransform = () => {
  return (html) => {
    if (!hasHtmlRegex.test(html) || !hasEncodedTagRegex.test(html)) {
      return html
    }

    let result = ''
    let lastIndex = 0

    for (const match of html.matchAll(codeBlockRegex)) {
      const matchStart = match.index
      const matchEnd = matchStart + match[0].length

      // Decode tags in the segment before this code block.
      result += html.slice(lastIndex, matchStart).replace(encodedTagRegex, '<$1$2$3>')
      // Preserve the code block as-is.
      result += match[0]
      lastIndex = matchEnd
    }

    // Decode tags in any remaining content after the last code block.
    result += html.slice(lastIndex).replace(encodedTagRegex, '<$1$2$3>')

    return result
  }
}
