import type { StringTransform } from '../../types.js'

// Some feeds wrap article bodies (or attribute values) in `<!--[CDATA[ … ]]-->`
// — an HTML5 bogus-comment artifact. Origin: WordPress and similar CMSes save
// content from contenteditable editors, where a literal `<![CDATA[` typed by
// the author hits the HTML5 tokenizer's bogus-comment state and serializes
// back as `<!--[CDATA[ … ]]-->` on save. The XML wrapping is fine; the inner
// string is the artifact. Without this transform, HTML5 parsers treat the
// whole construct as one comment node and the downstream comment-stripping
// pass would erase the article. Strip the wrapper before parsing so the
// inner content reaches the DOM as ordinary HTML.
//
// The non-greedy `[\s\S]*?` matches up to the FIRST `]]-->`, which also
// naturally handles split-CDATA cases (article body containing internal
// `-->` sequences) — at the string level there's no parser to confuse.
const cdataWrapperRegex = /<!--\s*\[CDATA\[([\s\S]*?)\]\]\s*-->/g

export const unwrapCdataComments: StringTransform = () => {
  return (html) => html.replace(cdataWrapperRegex, (_match, inner: string) => inner)
}
