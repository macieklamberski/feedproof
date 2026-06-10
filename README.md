# Feedsweep

[![codecov](https://codecov.io/gh/macieklamberski/feedsweep/branch/main/graph/badge.svg)](https://codecov.io/gh/macieklamberski/feedsweep)
[![npm version](https://img.shields.io/npm/v/feedsweep.svg)](https://www.npmjs.com/package/feedsweep)
[![license](https://img.shields.io/npm/l/feedsweep.svg)](https://github.com/macieklamberski/feedsweep/blob/main/LICENSE)

Tidy up the HTML content in web feeds. Fix feed-specific quirks so content displays in its best possible form.

Feedsweep takes raw feed item HTML and runs it through a pipeline that genuinely improves the output: fixing lazy-loaded images so they actually render, resolving relative URLs to absolute, stripping tracking pixels for privacy (plus tracking params and redirect wrappers via the cleanUrlFn option), highlighting code blocks, normalizing broken markup from common feed quirks, auto-linking bare URLs, and converting embeds into framework-agnostic placeholders. It ships with sensible defaults and built-in support for YouTube and other popular platforms.

## Installation

```bash
npm install feedsweep linkedom
```

`linkedom` is an optional peer dependency. You only need it if you use the bundled `parseHtml` helper — see [DOM library](#dom-library) for jsdom / happy-dom / browser-native alternatives.

## Quick Start

```typescript
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const result = await transformContent('<p>Check <img data-src="photo.jpg"> and visit /about</p>', {
  parseHtmlFn: parseHtml,
  baseUrl: 'https://example.com/post/1',
})
```

## Transforms

Inventory of every transform exported from the package. Most are enabled by default; pass a custom `stringTransforms` / `domTransforms` array via `transformContent` options to override.

| Transform | Description |
| --- | --- |
| `decodeDoubleEncodedTags` | Decode `&lt;tag&gt;` back to `<tag>` in mixed content |
| `fixLazyImages` | Move `data-src` / `data-original` to real `src` |
| `flattenPictureElements` | Collapse `<picture>` to a single `<img>`, promoting the best modern-format (AVIF/WebP) source |
| `hoistFigcaptionFromAnchor` | Move a `<figcaption>` out of a figure's click-through `<a>` so the caption is no longer part of the link |
| `mergeConsecutiveOneLinerPres` | Merge consecutive single-line `<pre>` tags |
| `replacePreLineBreaks` | Replace `<br>` with `\n` inside `<pre>` |
| `stripInterBlockBreaks` | Remove `<br>` tags between block elements |
| `stripBoundaryBreaks` | Remove `<br>` tags adjacent to block-element boundaries (paragraphs, headings, divs, list items, blockquotes, …) |
| `stripDuplicateTitleHeading` | Remove first `<h1>`–`<h6>` matching article title |
| `demoteHeadings` | Shift every heading down by one level (`<h1>`→`<h2>`, …, `<h5>`→`<h6>`) when the body contains an `<h1>`, so it sits below the reader's own page title |
| `unwrapHeadingBold` | Unwrap `<b>`/`<strong>` that wraps the entire content of a heading (redundant — headings are already bold) |
| `cleanAnchorUrls` | Rewrite anchor hrefs with the `cleanUrlFn` option: unwrapping redirect wrappers and stripping tracking params is delegated to a function like urlpurify's `cleanUrl`. No-op when the option is absent |
| `stripDeadAnchors` | Unwrap `<a>` with empty, `#`, or `javascript:` href |
| `stripInertElements` | Remove platform chrome and dead placeholders — subscribe widgets, share buttons, related-posts widgets, ad slots (AdSense / AdThrive), author bio blocks, email preheaders, Substack image controls, and Drupal `<drupal-render-placeholder>` tags. Pass `inertSelectors` to extend or replace |
| `removeTrackingPixels` | Strip 1×1 tracking pixel images, preserving real images that declare `0×0` placeholder dimensions or a `srcset` |
| `unwrapEmojiImages` | Replace WordPress/Facebook/Twitter/GitHub emoji `<img>` tags with their alt-text glyph |
| `convertBreaksToParagraphs` | Convert `<br><br>` runs into semantic `<p>` blocks |
| `wrapBareInlineInParagraphs` | Wrap bare inline runs (delimited by block-level children) in semantic `<p>` blocks |
| `injectEnclosures` | Inject feed enclosures into content as native `<audio>`/`<video>` or iframe placeholders |
| `replaceEmbedsWithPlaceholders` | Convert `<iframe>` to embed placeholders |
| `convertBookmarkCards` | Convert link-preview cards into `data-bookmark-*` placeholders via a registry of per-provider `BookmarkResolver`s (`defaultBookmarkResolvers`: Ghost `kg-bookmark-card`, Substack `embedded-publication-wrap`). Extend via `bookmarkResolvers` |
| `enrichEmbedPlaceholders` | Populate placeholder metadata (`title`, `description`, `duration`, etc.) via a caller-supplied async fn. Opt-in; not in defaults |
| `proxyAssetUrls` | Rewrite image, video, and audio URLs through a caller-supplied proxy |
| `resolveRelativeUrls` | Convert relative URLs to absolute using base URL |
| `unwrapWrappers` | Remove outer `<div>`, `<article>`, `<section>` wrappers |
| `unwrapDoublyNestedLists` | Unwrap `<ul>`/`<ol>` that wrap a single `<li>` containing a same-type list |
| `wrapTablesForScroll` | Wrap each top-level `<table>` in a `<div data-table>` as a horizontal-scroll container |
| `mergeFragmentedLists` | Merge consecutive sibling `<ul>` / `<ol>` lists with matching attributes |
| `paragraphizePlainText` | Wrap plain text in `<p>` tags |
| `stripOversizedBase64Sources` | Drop base64 `src`/`srcset`/`poster` payloads larger than 50 KB before parsing |
| `linkifyUrls` | Wrap bare URLs in `<a>` tags |
| `markTimestamps` | Wrap line-leading timestamps (`MM:SS` / `HH:MM:SS`) in `<span data-timestamp="seconds">` so a player can be seeked to that point |
| `trimPreWhitespace` | Remove common leading indentation from `<pre>` |
| `highlightCode` | Syntax-highlight `<code>` blocks with highlight.js. A declared language uses the full grammar set; a block with no hint is auto-detected against a curated common-language subset, gated by per-language structural signatures and a relevance floor so prose/output is not mis-colored |
| `stripEmptyTags` | Remove empty `<p>`, `<div>`, `<span>` and other tags |
| `stripComments` | Remove HTML `<!-- comments -->` |
| `unwrapCdataComments` | Strip malformed `<!--[CDATA[ … ]]-->` wrappers before parsing so the wrapped article reaches the DOM as real HTML |
| `unwrapCdataMarkers` | Strip a literal `<![CDATA[ … ]]>` wrapper (from entity-escaped CDATA markers) when it spans the whole value, so the content is not erased as a bogus comment. Leaves mid-content markers intact |
| `stripControlChars` | Strip rendering-hostile control characters (NUL, BEL, ESC, DEL, C1 range) before parsing. Preserves tab / LF / CR |

## Options

```typescript
import { fixLazyImages, resolveRelativeUrls, transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'
import { cleanUrl } from 'urlpurify'

const result = transformContent(html, {
  // Required: function that turns an HTML string into a `Document`. See "DOM library".
  parseHtmlFn: parseHtml,
  // Base URL for resolving relative URLs.
  baseUrl: 'https://example.com/post/1',
  // Rewrite anchor hrefs: unwrap redirects and strip tracking params.
  cleanUrlFn: cleanUrl,
  // Feed item enclosures (audio/video).
  enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
  // Route image/video/audio URLs through a proxy. Return `undefined` to leave a URL untouched.
  assetProxyFn: (url, type) => `https://proxy.example.com/?type=${type}&url=${encodeURIComponent(url)}`,
  // Populate embed placeholder metadata from a remote source (e.g. YouTube oEmbed).
  enrichEmbedFn: async (embeds) => {
    return new Map(embeds.map(({ provider, id }) => [`${provider}:${id}`, { title: '…' }]))
  },
  // Run a custom DOM transform pipeline (omit to use defaults).
  domTransforms: [fixLazyImages, resolveRelativeUrls],
})
```

The `stringTransforms` and `domTransforms` options each fully replace the corresponding default phase when provided. Every transform is also exported individually from `feedsweep`, so you can compose any pipeline — list them explicitly to build from scratch, or spread `defaultDomTransforms` (etc.) from `feedsweep/defaults` to extend or filter the defaults.

## DOM library

Feedsweep is parser-agnostic. You provide `parseHtmlFn` — a function that turns an HTML string into a `Document`. Use any DOM library that produces a standards-compliant `Document`. The test suite runs the full pipeline against both linkedom and jsdom.

```typescript
// linkedom (recommended default)
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

await transformContent(html, { parseHtmlFn: parseHtml, baseUrl })

// jsdom
import { transformContent } from 'feedsweep'
import { JSDOM } from 'jsdom'

await transformContent(html, {
  parseHtmlFn: (raw) => new JSDOM(`<!doctype html><body>${raw}</body>`).window.document,
  baseUrl,
})

// happy-dom
import { transformContent } from 'feedsweep'
import { Window } from 'happy-dom'

await transformContent(html, {
  parseHtmlFn: (raw) => {
    const window = new Window()
    window.document.body.innerHTML = raw
    return window.document
  },
  baseUrl,
})
```

The bundled `feedsweep/linkedom` parser bakes in two workarounds for linkedom-specific spec violations (attribute case-folding and SVG XML mode). jsdom and happy-dom do not need them.
