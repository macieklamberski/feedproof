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

Inventory of every transform exported from the package. Most are enabled by default; pass a custom `stringTransforms` / `domTransforms` array via `transformContent` options to override. Transforms marked _Heuristic (opt-in)_ make a best-judgement guess and may drop content, so they are excluded from the standard pipeline — enable them with `heuristics: true` (see Options).

| Transform | Description |
| --- | --- |
| `decodeDoubleEncodedTags` | Decode double-escaped tags (`&lt;tag&gt;`) back to real HTML |
| `fixLazyImages` | Promote lazy-loaded `data-src` / `data-original` to real `src` |
| `flattenPictureElements` | Collapse `<picture>` to one `<img>`, keeping the best modern-format source |
| `hoistFigcaptionFromAnchor` | Move a `<figcaption>` out of the figure's click-through link |
| `canonicalizeAlignment` | Normalize media alignment into a single `data-align` hook |
| `mergeConsecutiveOneLinerPres` | Merge consecutive single-line `<pre>` blocks into one |
| `replacePreLineBreaks` | Replace `<br>` with newlines inside `<pre>` |
| `stripInterBlockBreaks` | Remove stray `<br>` tags between block elements |
| `stripBoundaryBreaks` | Remove `<br>` tags at block boundaries |
| `stripDuplicateTitleHeading` | Remove a leading heading that repeats the article title |
| `demoteHeadings` | Shift headings down a level so they sit below the reader's page title |
| `unwrapHeadingBold` | Unwrap redundant bold wrapping a whole heading |
| `cleanAnchorUrls` | Clean anchor hrefs (redirects, tracking params) via the `cleanUrlFn` option |
| `stripDeadAnchors` | Unwrap links with empty, `#`, or `javascript:` hrefs |
| `stripInertElements` | Strip non-content chrome — subscribe/share/related widgets, ads, author bios |
| `removeTrackingPixels` | Strip 1×1 tracking pixels, keeping real images |
| `unwrapEmojiImages` | Replace emoji `<img>` tags with their alt-text glyph |
| `resolveMediaDimensions` | Backfill `width`/`height` on media so aspect ratio survives style stripping |
| `convertBreaksToParagraphs` | Convert `<br><br>` runs into real `<p>` blocks |
| `wrapBareInlineInParagraphs` | Wrap loose inline content in `<p>` blocks |
| `injectEnclosures` | Inject feed enclosures as native media or embed placeholders |
| `surfaceTemplateEmbeds` | Hoist a video embed out of a lazy-load `<template>` (e.g. Better Core Video Embeds) so it renders in a reader |
| `surfaceNoscriptEmbeds` | Hoist a video `<iframe>` out of a `<noscript>` lazy-load fallback (e.g. WP Rocket, a3 Lazy Load); ignores non-video noscript iframes like Google Tag Manager |
| `rebuildLiteVideoEmbeds` | Rebuild a real `<iframe>` from a `lite-youtube` / `lite-vimeo` web component's `videoid`, carrying over `start` and `videotitle` |
| `rebuildLyteEmbeds` | Rebuild a real `<iframe>` from a WP YouTube Lyte facade (`WYL_`/`lyte_` id) |
| `replaceEmbedsWithPlaceholders` | Convert `<iframe>` embeds into placeholders |
| `assignVideoPosters` | _Heuristic (opt-in):_ move a redundant video-poster image (inline or an enclosure) onto the embed as its poster, then drop the standalone image |
| `stripDuplicateEnclosures` | _Heuristic (opt-in):_ remove an injected enclosure that duplicates inline content (image size-variants, exact audio/video/embed) |
| `convertBookmarkCards` | Convert link-preview cards into `data-bookmark-*` placeholders |
| `enrichEmbedPlaceholders` | Fill placeholder metadata via the caller's `enrichEmbedFn` (no-op unless set) |
| `neutralizeUnsafeUrls` | Replace dangerous-scheme URLs (and any the `isSafeUrlFn` option rejects) with an inert sentinel, keeping the element |
| `proxyAssetUrls` | Rewrite media URLs through a caller-supplied proxy |
| `resolveRelativeUrls` | Resolve relative URLs to absolute against the base URL |
| `unwrapWrappers` | Remove redundant outer `<div>` / `<article>` / `<section>` wrappers |
| `unwrapDoublyNestedLists` | Unwrap a list that only wraps a single same-type list |
| `wrapTablesForScroll` | Wrap tables in a horizontal-scroll container |
| `mergeFragmentedLists` | Merge consecutive sibling lists of the same type |
| `paragraphizePlainText` | Wrap bare plain text in `<p>` tags |
| `stripOversizedBase64Sources` | Drop oversized inline base64 media sources before parsing |
| `linkifyUrls` | Wrap bare URLs in links |
| `markTimestamps` | Wrap line-leading timestamps for player seeking |
| `stripLeadingIndentation` | Strip fake leading indentation (nbsp / fixed-width spaces) from block text |
| `trimPreWhitespace` | Remove shared leading indentation from `<pre>` blocks |
| `highlightCode` | Syntax-highlight code blocks that declare a language and expose the language for a badge |
| `stripEmptyTags` | Remove empty elements |
| `stripComments` | Remove HTML comments |
| `unwrapCdataComments` | Unwrap malformed `<!--[CDATA[ … ]]-->` wrappers before parsing |
| `unwrapCdataMarkers` | Unwrap a whole-value `<![CDATA[ … ]]>` marker so content isn't dropped |
| `stripControlChars` | Strip rendering-hostile control characters before parsing |

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
  // Feed item enclosures (audio/video/image), injected into the content. Enable
  // `heuristics` to drop an enclosure that only duplicates inline content (e.g. an
  // image already present in a different size).
  enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
  // Route image/video/audio URLs through a proxy. Return `undefined` to leave a URL untouched.
  assetProxyFn: (url, type) => `https://proxy.example.com/?type=${type}&url=${encodeURIComponent(url)}`,
  // Extra URL safety policy (e.g. SSRF/allowlist); return `false` to neutralize. A dangerous-scheme floor always applies.
  isSafeUrlFn: (url, type) => isSafe(url, type),
  // Populate embed placeholder metadata from a remote source (e.g. YouTube oEmbed).
  enrichEmbedFn: async (embeds) => {
    return new Map(embeds.map(({ provider, id }) => [`${provider}:${id}`, { title: '…' }]))
  },
  // Swap the code highlighter (defaults to highlight.js; may be async).
  highlightFn: (text, language) => myHighlighter.highlight(text, language),
  // Opt into the heuristic transforms (enclosure-duplicate + video-poster stripping). Ignored if domTransforms is set.
  heuristics: true,
  // Run a custom DOM transform pipeline (omit to use defaults).
  domTransforms: [fixLazyImages, resolveRelativeUrls],
})
```

All caller-provided functions (`parseHtmlFn`, `resolveUrlFn`, `cleanUrlFn`, `assetProxyFn`, `isSafeUrlFn`, `enrichEmbedFn`, `highlightFn`, and resolver extracts) must not throw — an exception is not caught and rejects the `transformContent` promise.

Code blocks are highlighted only when they declare a language (`language-*` class, `data-language`, Pandoc/Rouge/Expressive Code/etc.); unlabeled blocks are left plain rather than guessed at. The default highlighter is highlight.js (exported as `defaultHighlightFn` / `hljsHighlightFn`); replace it with `highlightFn`.

The `stringTransforms` and `domTransforms` options each fully replace the corresponding default phase when provided. The `heuristics` flag (default `false`) selects between two exported DOM pipelines: `defaultStandardDomTransforms` (the safe defaults) and `defaultAllDomTransforms` (standard plus `heuristicDomTransforms` spliced in after `injectEnclosures`). Setting `domTransforms` explicitly overrides `heuristics`. Every transform and pipeline is also exported individually from `feedsweep`, so you can compose any pipeline — list transforms explicitly, or spread `defaultStandardDomTransforms` / `heuristicDomTransforms` to extend or filter the defaults.

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
