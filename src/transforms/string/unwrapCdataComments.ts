import type { StringTransform } from '../../types.js'

// WordPress and similar CMSes serialize `<![CDATA[ … ]]>` as `<!--[CDATA[ … ]]-->`
// (HTML5 bogus-comment artifact). Without unwrapping, the comment-stripping
// pass would erase article bodies.
const cdataWrapperRegex = /<!--\s*\[CDATA\[([\s\S]*?)\]\]\s*-->/g

// WordPress writes CDATA as a <!--[CDATA[ … ]]--> comment, which comment stripping erases.
export const unwrapCdataComments: StringTransform = () => {
  return (html) => {
    if (!html.includes('[CDATA[')) {
      return html
    }

    return html.replace(cdataWrapperRegex, (_match, inner: string) => inner)
  }
}
