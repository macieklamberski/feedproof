---
title: "Transforms: Heuristics"
---

# Heuristics

Three transforms guess. Each one judges whether two pieces of media are "the same thing", a poster and its video or an enclosure and an inline image, and a wrong guess removes or moves real content. That risk is why they are opt-in: pass `heuristics: true` to enable them.

```typescript
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const html = await transformContent(content, {
  parseHtmlFn: parseHtml,
  heuristics: true,
})
```

The flag splices the three transforms into the standard pipeline right after `injectEnclosures`, in this order. Passing your own `domTransforms` array overrides the flag entirely.

### assignVideoPosters

Moves an image enclosure onto a video embed as its poster when the two demonstrably belong together: a YouTube thumbnail URL carries the video's id, and the embedded player carries the same id. The item stops rendering a lone photo above a player showing the identical frame.

**Before**

```html
<img src="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" data-enclosure>
<div data-embed-provider="youtube" data-embed-id="dQw4w9WgXcQ" data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ">...</div>
```

**After**

```html
<div data-embed-provider="youtube" data-embed-id="dQw4w9WgXcQ" data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ" data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg">...</div>
```

For players without an id-matched thumbnail, a video-led item (its first embed is a known video player) may claim a same-named image enclosure as the poster.

### stripDuplicateEnclosures

Removes an injected enclosure that duplicates media already in the content: an image present in any size variant, or an audio/video/embed with the same URL. Only elements `injectEnclosures` marked with `data-enclosure` are candidates, so author-placed content is never removed.

**Before** (after `injectEnclosures` has added the feed's image enclosure)

```html
<img src="https://example.com/photo-1024x768.jpg" data-enclosure>
<p><img src="https://example.com/photo.jpg"></p>
```

**After**

```html
<p><img src="https://example.com/photo.jpg"></p>
```

Images are compared by fingerprint, which reads the size a URL encodes (`photo-1024x768.jpg`) so scaled variants of one photo match; audio and video compare on the exact cleaned URL, because podcast proxy URLs carry the episode's identity in the query string.

### stripDuplicateLeadingImages

Removes a leading image the body repeats immediately after it. Feed plugins prepend the post's featured image, and when the author already opens with that photo, the reader shows it twice in a row.

**Before**

```html
<img src="https://example.com/photo-300x200.jpg">
<img src="https://example.com/photo.jpg">
<p>The article.</p>
```

**After**

```html
<img src="https://example.com/photo.jpg">
<p>The article.</p>
```

Only the first two images in document order are compared; a repeat deeper in the body can be deliberate and stays. Of the pair, the smaller rendition goes, because dropping by position alone could keep a thumbnail and delete the full image.
