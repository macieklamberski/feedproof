---
title: "Output: Rendering"
---

# Rendering

Feedsweep's output is plain HTML that works with no renderer logic at all. The [data attributes](/output/data-attributes) exist for consumers that want more: native players instead of fallback links, styled cards instead of plain anchors, alignment and scroll behavior instead of default block flow. This page shows what a renderer typically does with each hook.

## Graceful degradation

Render the output with nothing but a stylesheet and it stays correct:

- An embed placeholder shows its fallback link — the content is one click away.
- A cite placeholder shows a titled link to the cited page.
- Injected enclosures are native `<audio>`, `<video>`, and `<img>` elements that play as-is.
- `data-align`, `data-table`, `data-pre-*`, `data-timestamp` are inert attributes on otherwise ordinary elements.

Everything below is progressive enhancement on top of that baseline.

## Styling hooks

Alignment and table scroll need only CSS:

```css
[data-align='left'] {
  float: left;
  margin-right: 1rem;
}

[data-align='center'] {
  margin-inline: auto;
  display: block;
}

[data-table] {
  overflow-x: auto;
}
```

`data-pre-label` makes a language badge without any lookup table of your own:

```css
pre[data-pre-label] {
  position: relative;
}

pre[data-pre-label]::before {
  content: attr(data-pre-label);
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  font-size: 0.75rem;
  opacity: 0.6;
}
```

`data-emoji` marks images and fallback spans a renderer may want to size like text:

```css
img[data-emoji] {
  height: 1.25em;
  width: auto;
  vertical-align: text-bottom;
}
```

## Rendering embeds

An embed placeholder carries everything needed for a click-to-load facade: show `data-embed-thumbnail` sized by `data-embed-width` and `data-embed-height`, and swap in an iframe pointing at `data-embed-src` when the reader clicks. Loading the iframe eagerly works too — `data-embed-src` is a plain player URL.

```typescript
for (const placeholder of container.querySelectorAll('[data-embed-src]')) {
  const iframe = document.createElement('iframe')

  iframe.src = placeholder.getAttribute('data-embed-src')
  iframe.width = placeholder.getAttribute('data-embed-width') ?? '640'
  iframe.height = placeholder.getAttribute('data-embed-height') ?? '360'
  iframe.setAttribute('allowfullscreen', '')

  placeholder.replaceChildren(iframe)
}
```

`data-embed-provider` and `data-embed-id` let a renderer special-case a provider — its own SDK player, a privacy-enhanced domain, quality parameters — without parsing the URL. Unrecognized providers still render through the generic path above.

## Rendering cites

A cite placeholder maps directly onto a link-preview card: `data-cite-title` and `data-cite-description` as text, `data-cite-thumbnail` and `data-cite-icon` as images, `data-cite-publisher`, `data-cite-author`, and `data-cite-date` as the byline, all wrapped in a link to `data-cite-url`. Fields are optional; render what is present.

```typescript
for (const placeholder of container.querySelectorAll('[data-cite-url]')) {
  placeholder.replaceChildren(
    renderCard({
      url: placeholder.getAttribute('data-cite-url'),
      title: placeholder.getAttribute('data-cite-title'),
      description: placeholder.getAttribute('data-cite-description'),
      thumbnail: placeholder.getAttribute('data-cite-thumbnail'),
    }),
  )
}
```

`data-cite-kind`, when present, states the author's relation to the cited page (`repost`, `reply`, `like`, ...) — useful for an icon or a lead-in like "Replied to".

## Timestamps

`data-timestamp` carries seconds, so seeking a player is one listener:

```typescript
container.addEventListener('click', (event) => {
  const target = event.target.closest('[data-timestamp]')

  if (target) {
    player.seekTo(Number(target.getAttribute('data-timestamp')))
  }
})
```

## Proxied originals

When [`assetProxyFn`](/guides/customization/url-handling) is in play, every rewritten URL keeps its original in a [`data-proxied-*`](/output/data-attributes#proxied-originals-data-proxied) attribute. A renderer can fall back to the original when the proxy fails, offer it as a download link, or use it to dedupe media across items regardless of proxy parameters.

```typescript
image.addEventListener('error', () => {
  const original = image.getAttribute('data-proxied-src')

  if (original && image.src !== original) {
    image.src = original
  }
})
```

> [!TIP]
> Injected enclosures carry the valueless `data-enclosure` marker. A renderer that shows enclosures in its own UI (a podcast player bar, a lightbox) can hide the injected elements with one selector instead of deduplicating media itself.
