# Feedproof

[![npm version](https://img.shields.io/npm/v/feedproof.svg)](https://www.npmjs.com/package/feedproof)
[![license](https://img.shields.io/npm/l/feedproof.svg)](https://github.com/macieklamberski/feedproof/blob/main/LICENSE)


Improve and normalize HTML content inside feed entries. Fix feed-specific quirks so content displays in its best possible form.

Feedproof takes raw feed item HTML and runs it through a pipeline that genuinely improves the output: fixing lazy-loaded images so they actually render, resolving relative URLs to absolute, stripping tracking parameters and pixels for privacy, highlighting code blocks, normalizing broken markup from common feed quirks, auto-linking bare URLs, and converting embeds into framework-agnostic placeholders. It ships with sensible defaults and built-in platform support for YouTube, Vimeo, Spotify, and SoundCloud.

## Installation

```bash
npm install feedproof
```

## Quick Start

```typescript
import { transformContent } from 'feedproof'

const result = transformContent('<p>Check <img data-src="photo.jpg"> and visit /about</p>', {
  baseUrl: 'https://example.com/post/1',
})
```

## Transforms

| Transform | Description |
| --- | --- |
| `decodeDoubleEncodedTags` | Decode `&lt;tag&gt;` back to `<tag>` in mixed content |
| `unwrapWrappers` | Remove outer `<div>`, `<article>`, `<section>` wrappers |
| `paragraphizePlainText` | Wrap plain text in `<p>` tags |
| `fixLazyImages` | Move `data-src` / `data-original` to real `src` |
| `resolveRelativeUrls` | Convert relative URLs to absolute using base URL |
| `unwrapRedirectUrls` | Remove Google/Facebook redirect wrappers |
| `stripTrackingParams` | Remove UTM and other tracking parameters |
| `removeTrackingPixels` | Strip 1×1 tracking pixel images |
| `stripInterBlockBreaks` | Remove `<br>` tags between block elements |
| `highlightCode` | Syntax-highlight `<code>` blocks with highlight.js |
| `mergeConsecutiveOneLinerPres` | Merge consecutive single-line `<pre>` tags |
| `replacePreLineBreaks` | Replace `<br>` with `\n` inside `<pre>` |
| `trimPreWhitespace` | Remove common leading indentation from `<pre>` |
| `linkifyUrls` | Wrap bare URLs in `<a>` tags |
| `replaceMediaWithEmbedPlaceholders` | Convert `<iframe>` to embed placeholders |
| `injectEnclosureEmbedPlaceholders` | Add audio/video enclosures to content |

## Options

```typescript
const result = transformContent(html, {
  // Base URL for resolving relative URLs.
  baseUrl: 'https://example.com/post/1',
  // Feed item enclosures (audio/video).
  enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
  // Custom embed resolver (extends built-in YouTube support).
  resolveEmbed: (url) => myResolver(url),
  // Additional embed domains to allow.
  embedDomains: ['custom-player.example.com'],
  // Toggle individual transforms off.
  transforms: { highlightCode: false, linkifyUrls: false },
})
```

## Individual Transforms

Each transform is exported individually for selective use:

```typescript
import { transformHtml, resolveRelativeUrls } from 'feedproof'

const result = transformHtml(html, resolveRelativeUrls({ baseUrl: 'https://example.com' }))
```

## Defaults

All default constants are available for customization:

```typescript
import {
  defaultDomTransforms,
  defaultStringTransforms,
  defaultEmbedDomains,
  defaultResolveEmbed,
} from 'feedproof/defaults'
```
