---
title: "Guides: Enclosures"
---

# Enclosures

Feeds often carry an item's media outside the HTML: podcast audio in an `<enclosure>` tag, video metadata in Media RSS, artwork as an attached image. The `enclosures` option hands that metadata to Feedsweep, and the `injectEnclosures` transform turns it into elements at the top of the content — so the episode player or lead image renders even when the HTML body never mentions it.

```typescript
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const html = await transformContent('<p>Show notes for episode 42.</p>', {
  parseHtmlFn: parseHtml,
  enclosures: [{ url: 'https://cdn.example.com/ep42.mp3', type: 'audio/mpeg' }],
})

// '<audio src="https://cdn.example.com/ep42.mp3" controls preload="none" data-enclosure></audio>
//  <p>Show notes for episode 42.</p>'
```

## The Enclosure Type

Every field is optional — enclosures come from untrusted feed data, and Feedsweep guards each one before use.

```typescript
type Enclosure = {
  url?: string
  type?: string // MIME type, e.g. 'audio/mpeg'.
  medium?: string // Media RSS medium: 'audio', 'video', or 'image'.
  width?: number
  height?: number
  duration?: number // Seconds.
  title?: string
  description?: string
  thumbnails?: Array<EnclosureThumbnail> // { url, width?, height? } each.
  playerUrl?: string // A hosted player page for the same media.
  playerEmbed?: string // Raw player HTML instead of a URL.
}
```

## What Each Enclosure Becomes

Enclosures inject in feed order, ahead of the existing content. Each one takes the first matching branch:

1. **Embed placeholder** — when a [widget resolver](/widgets/embeds) claims the URL (a YouTube enclosure, for example), or when the enclosure carries an explicit `playerUrl`. The placeholder's display fields prefer the feed's own metadata: the resolver only derives guesses from the URL, while the feed carries the publisher's real thumbnail, title, dimensions, and duration.
2. **`<audio>`** — when `medium` is `audio` or `type` starts with `audio/`. The element gets `controls` and `preload="none"`.
3. **`<video>`** — when `medium` is `video` or `type` starts with `video/`, with `width`, `height`, and the first thumbnail as `poster` when present.
4. **`<img>`** — for image enclosures, but only when the content has no image of its own. An image enclosure is almost always a scaled copy of the lead content image on a different URL, so injecting it next to one would stack a visible duplicate. Avatar images (hosts in [`avatarImageHosts`](/reference/transform-content#options), `gravatar.com` by default) never inject — an author photo is not post imagery.

An enclosure whose URL is missing or unresolvable is skipped rather than rendered broken.

## Deduplication

Feeds frequently describe one piece of media several times. Three collapses run before anything is injected:

- **Image variants** — image enclosures that are the same picture at a different size or render (a scaled copy, a CDN-proxied variant, a `?w=` query) collapse into one. The largest variant wins; a URL with no size encoded in it counts as the full-resolution original and outranks any sized copy. Audio and video never collapse this way — their query strings often carry identity.
- **Player pairs** — a feed sometimes lists the raw file plus a player page carrying the file URL in a query param (`player.example.com/?media_url=<file>`). The pair merges into the file entry with the player page as its `playerUrl`, so the item renders one embedded player instead of a player iframe next to a bare audio element. Any URL-shaped param value counts, since the param name varies by host.
- **Repeat runs** — every injected element is marked with the `data-enclosure` attribute. A later run over the same content skips enclosures whose source already appears on a marked element, so running the pipeline twice never stacks duplicates.

## Raw Player Embeds

Some feeds supply the player as raw HTML rather than a URL. When `playerEmbed` is set, Feedsweep parses it with the active DOM, reads the first `iframe[src]` or `embed[src]`, and treats the entry as a plain player page (URL plus display size) that then pairs with its media file as above. Markup with no frame in it — a native `<audio>` wrapper, plain text — falls through, and the file enclosure still renders natively.

> [!NOTE]
> Enclosure `title` and `description` are used where an element can carry them (`alt` on images, placeholder metadata on embeds), but native `<audio>` and `<video>` have no caption slot, so those fields are not rendered there.

## Next Steps

- **[Heuristics](/transforms/heuristics)** — the opt-in `stripDuplicateEnclosures` pass removes an injected enclosure when the item's own content already shows the same media.
- **[Widget Embeds](/widgets/embeds)** — how embed placeholders are structured and which providers resolve.
