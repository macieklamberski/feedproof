---
title: Feedsweep, Tidy HTML Content in Web Feeds
---

# Feedsweep

Tidy up the HTML content in web feeds. Fix feed-specific quirks so content displays in its best possible form.

Feed items arrive with markup written for a JavaScript-enabled browser on the publisher's own site: lazy-loaded images with empty `src` attributes, video embeds that render as blank divs, tracking pixels, subscribe forms, and code blocks flattened into single lines. Feedsweep takes that HTML and runs it through a pipeline of 81 transforms that repairs, cleans, and normalizes it into content a reader can render as-is.

Perfect for feed readers, read-it-later apps, and newsletter digests that render third-party feed content.

## Example

```html
<!-- Input: what the feed delivers -->
<p><img data-src="https://example.com/photo.jpg" src="" class="lazyload"></p>
<lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube>
<img src="https://stats.example.com/pixel.gif" width="1" height="1">
<div class="sharedaddy">Share this: Twitter Facebook</div>
```

```html
<!-- Output: what your reader renders -->
<p><img data-src="https://example.com/photo.jpg" src="https://example.com/photo.jpg" class="lazyload"></p>
<div data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ" data-embed-provider="youtube" data-embed-id="dQw4w9WgXcQ" data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"></div>
```

## Features

### Repair

- **Lazy media.** Promotes real URLs parked in `data-src` and 20+ other lazy-loading attributes back into `src`.
- **JavaScript-only embeds.** Rebuilds real iframes from video facades (WordPress plugins, Elementor, Wistia, lite-youtube, and more) and consent-gated wrappers.
- **Broken markup.** Decodes double-encoded tags, unwraps stray CDATA markers, paragraphizes plain-text bodies.

### Clean

- **Tracking pixels.** Removes 1×1 images and requests to known tracking hosts.
- **Platform chrome.** Strips subscribe forms, share buttons, related-posts blocks, and consent nags.
- **Empty and hidden elements.** Drops what would render as nothing.

### Normalize

- **Embeds and cards.** Converts video embeds and link-preview cards into framework-agnostic [`data-*` placeholders](/output/data-attributes) your app renders however it wants. Fifty-six platforms are recognized out of the box, from YouTube, Vimeo and Spotify to Apple Podcasts, Bluesky, Mastodon and CodePen.
- **Code blocks.** Highlights labeled code with highlight.js and marks blocks with their language.
- **Structure.** Paragraphs from `<br>` runs, demoted headings, merged fragmented lists, scroll-wrapped tables.
- **URLs.** Resolves relative URLs, auto-links bare ones, neutralizes dangerous schemes.

### Integrate

- **Bring your own DOM.** Works with linkedom, jsdom, happy-dom, or the browser's native parser.
- **Composable pipeline.** The transform arrays are options, and every transform is exported individually.
- **Enclosures.** Injects feed enclosure media into the content as native players.

## What Feedsweep Is Not

Feedsweep improves how content renders. It is not an HTML sanitizer, so keep one in your pipeline, and it never makes network requests: every transform works from the markup alone. See [Security](/guides/security).
