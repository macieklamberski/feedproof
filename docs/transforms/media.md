---
title: "Transforms: Media Recovery"
---

# Media Recovery

Feeds routinely ship images and media that render as nothing: the real URL parked in a lazy-load attribute, an AMP element with no runtime, a tracking pixel posing as an image. These transforms recover the media that should render and remove the images that never should.

### fixLazyImages

Promotes the real image URL from a lazy-load attribute into `src` (and the real `srcset` into `srcset`) on `<img>` and `<source>` elements. Also recovers the full `<img>` from a `<noscript>` fallback that sits next to a lazy placeholder. The attribute names are [built in](/guides/built-in), covering the lazy loaders and image CDNs feeds actually use.

**Before**

```html
<img src="placeholder.gif" data-src="https://example.com/photo.jpg">
```

**After**

```html
<img src="https://example.com/photo.jpg" data-src="https://example.com/photo.jpg">
```

### fixLazyVideos

Promotes a lazy `<video>` clip URL into `src` and a lazy `data-poster` into `poster`, so a reader shows the still frame and can play the clip. Only fires when the element has nothing to play from: a usable `src` or a `<source>` child means the clip already resolves.

**Before**

```html
<video data-src="https://example.com/clip.mp4" data-poster="https://example.com/still.jpg"></video>
```

**After**

```html
<video src="https://example.com/clip.mp4" poster="https://example.com/still.jpg" data-src="…" data-poster="…"></video>
```

### fixLazyAudios

The same promotion for `<audio>`: a clip URL parked in a lazy attribute becomes the real `src`.

**Before**

```html
<audio data-src="https://example.com/episode.mp3"></audio>
```

**After**

```html
<audio src="https://example.com/episode.mp3" data-src="https://example.com/episode.mp3"></audio>
```

### convertLazyImageContainers

Recovers a real `<img>` from a lazy-image container: a `<div>` or `<figure>` that carries an image-shaped lazy URL but wraps no media of its own, the pattern gallery widgets use when they build the `<img>` with JS on load. Containers that already wrap media are layout wrappers and are left alone.

**Before**

```html
<div class="gallery_img" data-src="https://example.com/photo.jpg"></div>
```

**After**

```html
<img src="https://example.com/photo.jpg">
```

### convertAmpNativeElements

Converts AMP custom elements that have a native equivalent into it: `amp-img` and `amp-anim` become `<img>`, `amp-video` becomes `<video>`, `amp-audio` becomes `<audio>`, `amp-iframe` and `amp-video-iframe` become `<iframe>`. AMP elements render nothing without the AMP runtime; the converted elements flow to the image and embed transforms downstream.

The set stops where the provider is known. An AMP element naming a platform (`amp-youtube`, `amp-twitter`, `amp-instagram`, `amp-jwplayer`, `amp-gist`) belongs to that platform's own resolver, which reads its attributes and mints the placeholder directly. `<amp-story>` is a full-page format, not in-content media, and is left alone.

**Before**

```html
<amp-img src="https://example.com/photo.jpg" width="640" height="480"></amp-img>
```

**After**

```html
<img src="https://example.com/photo.jpg" width="640" height="480">
```

### resolveMediaDimensions

Backfills missing `width` / `height` attributes on `<img>` and `<video>` from, in order: the element's inline style, a size encoded in its URL, or (for an image inside a `<picture>`) the wrapping picture or source. Invalid attribute values (percentages, `auto`, zero) are dropped first. The attributes drive the browser's automatic aspect ratio, so space is reserved and the ratio survives reader CSS like `img { height: auto }`.

**Before**

```html
<img src="https://example.com/photo-800x600.jpg">
```

**After**

```html
<img src="https://example.com/photo-800x600.jpg" width="800" height="600">
```

### flattenPictureElements

Collapses each `<picture>` to a single `<img>`. A format-only AVIF or WebP `<source>` is promoted onto the image so the lighter format survives; art-direction sources (with `media` queries) defer to the plain `<img>` fallback. A `<picture>` with no usable image at all is dropped.

**Before**

```html
<picture>
  <source srcset="https://example.com/photo.avif" type="image/avif">
  <img src="https://example.com/photo.jpg">
</picture>
```

**After**

```html
<img src="https://example.com/photo.avif" srcset="https://example.com/photo.avif">
```

### hoistFigcaptionFromAnchor

Moves a `<figcaption>` out of a figure-wide click-through anchor, so the caption is no longer part of the link. The click-through stays on the media alone.

**Before**

```html
<figure><a href="/post"><img src="photo.jpg"><figcaption>Caption</figcaption></a></figure>
```

**After**

```html
<figure><a href="/post"><img src="photo.jpg"></a><figcaption>Caption</figcaption></figure>
```

### canonicalizeAlignment

Resolves the many ways feeds express media alignment into one `data-align="left|center|right"` attribute on the media element: WordPress `aligncenter` / `alignleft` / `alignright` classes, the deprecated `align` attribute, inline `text-align` and auto margins, read from the media itself or from a wrapper whose only content is the media. See [Data Attributes](/output/data-attributes) for how a consumer styles it.

**Before**

```html
<p style="text-align:center"><img src="photo.jpg"></p>
```

**After**

```html
<p style="text-align:center"><img src="photo.jpg" data-align="center"></p>
```

The pass is purely additive: the class or style it read stays where it was, so native rendering keeps working until a renderer adopts `data-align`.

### wrapCargoGalleryImages

Wraps each Cargo portfolio image in its own `<figure>`, so the caption text, the image run, and the trailing navigation get block boundaries instead of being swept into one paragraph. Images already inside a figure, paragraph, or heading are left alone.

**Before**

```html
Project caption
<img src="https://freight.cargo.site/one.jpg">
<img src="https://freight.cargo.site/two.jpg">
```

**After**

```html
Project caption
<figure><img src="https://freight.cargo.site/one.jpg"></figure>
<figure><img src="https://freight.cargo.site/two.jpg"></figure>
```

### fixSubstackImageLinks

Remints the `<img>` inside a Substack lightbox anchor that reached the feed with its image child stripped, using the anchor's own href, which is the full-size image. Without it `stripEmptyTags` deletes the empty anchor and the picture with it.

**Before**

```html
<a class="image-link" href="https://substackcdn.com/image/fetch/photo.jpg"></a>
```

**After**

```html
<a class="image-link" href="https://substackcdn.com/image/fetch/photo.jpg"><img src="https://substackcdn.com/image/fetch/photo.jpg"></a>
```

### unwrapEmojiImages

Replaces platform emoji and smilie images (WordPress, forum engines, editor plugins) with the real Unicode glyph when the image's filename or shortcode resolves to one. An emoji image that cannot be resolved is marked `data-emoji` instead, so a consumer can still size it like text. A [built-in host list](/guides/built-in) names the emoji image sets recognized by URL.

**Before**

```html
<p>Great post <img src="https://s.w.org/images/core/emoji/72x72/1f600.png" alt="😀"></p>
```

**After**

```html
<p>Great post 😀</p>
```

### removeTrackingPixels

Removes tracking pixels and beacon images: images hidden by style or zero opacity, pixel-sized images without a content signal, and images whose URL matches the [built-in tracking host and path-segment lists](/guides/built-in). Raster formats at zero size and images with a `srcset` are treated as content and kept, since trackers are script and GIF endpoints, not real photos.

**Before**

```html
<p>Article text.</p>
<img src="https://stats.example-tracker.com/pixel.gif" width="1" height="1">
```

**After**

```html
<p>Article text.</p>
```
