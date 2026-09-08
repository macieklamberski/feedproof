---
title: "Transforms: Content Cleanup"
---

# Content Cleanup

Feed content carries things that were never content: platform chrome injected around the article, elements hidden from view, and generator comments. These transforms remove what a static rendering can never use.

### stripNonContentElements

Removes elements matching a curated list of selectors for markup that reads as noise in a reader:

- Subscribe forms and email-signup blocks
- Share-button clusters and social follow prompts
- Related-posts widgets, author bios, read-more links
- Ad slots and sponsor placeholders
- Comment-section mounts and other platform UI left over from the article page
- Cookie-consent notices sitting beside gated embeds

**Before**

```html
<p>The article.</p>
<div class="sharedaddy">Share this: Twitter Facebook</div>
```

**After**

```html
<p>The article.</p>
```

The stripping line is deliberate: chrome and nags are removed, gated content is recovered. When a cookie-consent plugin replaces an embed with a click-to-consent shim, the embed's real URL is parked in an attribute on the iframe. The media transforms promote it back into `src`, and only the consent notice beside it is stripped. See [Embed Recovery](/transforms/embeds).

Every entry in the default list is validated against real feeds before it is added, favoring platform-specific class names over generic words that could match article content. The list is built in, not an option: see [What's Built In](/guides/built-in).

### stripHiddenElements

Removes elements hidden from view: the `hidden` attribute, inline `display:none`, or inline `visibility:hidden`. Email preheaders and JS-only widget shells ship hidden and would otherwise leak into the output as blank or duplicate content. It runs early, so later transforms walk fewer nodes.

**Before**

```html
<div style="display:none">You are reading the preview text.</div>
<p>The article.</p>
```

**After**

```html
<p>The article.</p>
```

> [!NOTE]
> `opacity:0` does not count as hidden here. On a generic element it is usually the start of a fade-in animation; only tracking-pixel images treat it as a hiding signal, in `removeTrackingPixels`.

### stripComments

Removes HTML comments: generator leftovers, template markers, MSO conditionals. Comments inside `<pre>` and `<code>` survive: there they are usually part of a tutorial's example markup.

**Before**

```html
<p>The article.</p><!-- wp:paragraph -->
```

**After**

```html
<p>The article.</p>
```
