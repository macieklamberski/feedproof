import type { DomTransform } from '../../types.js'

// Replaces <br> tags inside <pre> with newlines. Inside <pre>, whitespace is
// already preserved so <br> is redundant and can cause double line breaks.
//
// Walks the DOM directly instead of round-tripping innerHTML — an innerHTML
// round-trip on `<pre><code>` containing `<xmp>` would re-escape entities
// (HTML5 raw-text element rules), corrupting code samples that contain
// `&lt;` and similar. The node walk also leaves `<br>` strings inside
// `<script>` and `<textarea>` (rare but real) untouched, since those are
// raw text rather than real `<br>` elements.
export const replacePreLineBreaks: DomTransform = () => {
  return (document) => {
    const pres = document.querySelectorAll('pre')

    for (const pre of pres) {
      const target = pre.querySelector('code') ?? pre
      for (const br of Array.from(target.querySelectorAll('br'))) {
        br.replaceWith('\n')
      }
    }
  }
}
