---
title: "Widgets: Embeds"
---

# Embeds

An embed is content with a platform-hosted viewer: a video player, a podcast episode, an interactive chart. The `convertWidgets` transform replaces each one with a `data-embed-*` placeholder your app renders as it sees fit — typically a thumbnail that click-loads the player, keeping third-party iframes out of the initial view.

## Fields

Attributes are written in this order, and only when a value is present:

| Field | Description |
|-------|-------------|
| `data-embed-src` | The player URL — the one field every embed placeholder carries |
| `data-embed-provider` | Provider name (`youtube`, `vimeo`, …); absent on generic iframes |
| `data-embed-id` | The provider's content id |
| `data-embed-url` | The human-facing page for the content, where the provider has one |
| `data-embed-thumbnail` | Poster image URL |
| `data-embed-width` | Width in pixels |
| `data-embed-height` | Height in pixels |
| `data-embed-title` | Content title |
| `data-embed-description` | Content description |
| `data-embed-author` | Author or channel name |
| `data-embed-avatar` | Author avatar URL |
| `data-embed-duration` | Duration in seconds |

The placeholder's only child is an `<a>` pointing at `data-embed-url` (falling back to `data-embed-src`), so a consumer that ignores the attributes still shows a working link.

## Example

```html
<!-- Input -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" allowfullscreen></iframe>

<!-- Output -->
<div
  data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  data-embed-provider="youtube"
  data-embed-id="dQw4w9WgXcQ"
  data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  data-embed-width="560"
  data-embed-height="315"
>
  <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">https://www.youtube.com/watch?v=dQw4w9WgXcQ</a>
</div>
```

The `src` is rebuilt from the extracted id, so tracking params are dropped while meaningful ones survive (a YouTube `start` offset, a Vimeo unlisted-video `h` token).

## Built-in Providers

Each provider resolver knows how to read the platform's markup and what can be derived from the id alone — no network requests are ever made.

| Provider | Matches | Extracts |
|----------|---------|----------|
| YouTube | `<iframe>` on `youtube.com`, `youtube-nocookie.com`, `youtu.be` | id, watch URL, thumbnail; playlist and channel-live embeds resolve to their playlist/channel URL |
| Vimeo | `<iframe>` on `vimeo.com`, `player.vimeo.com` | id, watch URL; unlisted-video token kept |
| Dailymotion | `<iframe>` on `dailymotion.com`, `dai.ly` | id, watch URL, thumbnail |
| JW Player | `<iframe>` on `jwplayer.com`/`jwplatform.com`, and the script embed (`<script>` + empty div) | id, player URL, thumbnail |
| Buzzsprout | Episode `<iframe>`, and the WordPress shortcode's `<script>` embed | podcast/episode id, player URL, episode URL |
| Brightcove | `<video-js data-video-id>` custom element | id, player URL built from the element's account/player attributes |
| Mediavine | `<div class="mv-video-target" data-video-id>` | id, player URL, dimensions from the aspect ratio |
| SoundCloud | Player `<iframe>`, plus the share snippet's sibling links | id, title, author, and track URL where the snippet or iframe title carries them |

The script and custom-element forms matter because they render nothing at all without JavaScript — resolving them is the difference between the episode appearing and vanishing.

## Media Resolvers

Some platform markup hides a directly playable file rather than a hosted viewer. Those resolvers return a native `<video>` or `<audio>` element instead of a placeholder — see [the placeholder-or-native rule](/widgets#placeholder-or-native-element):

| Platform | Matches | Produces |
|----------|---------|----------|
| Substack | Native video/audio upload divs | `<video>`/`<audio>` pointing at the upload endpoint |
| WeChat | `<mpvoice>` narration elements | `<audio>` with the voice file URL |
| Weebly | Video wrappers with an `about:blank` iframe | `<video>` with poster, rebuilt from the wrapper's own attributes |
| Ghost | Video and audio cards | Fresh `<video>`/`<audio>` with `controls` and the card's thumbnail as poster |
| Discourse | Video placeholder divs | `<video>` with the upload URL and thumbnail poster |

## Unclaimed Embeds

Anything no resolver claims still resolves, through generic tiers:

- An `<iframe>` with a resolvable `src` becomes a provider-less placeholder (just `src` and dimensions).
- An `<iframe>`, `<object>`, or `<embed>` whose URL names a media file becomes a native player instead of a frame.
- A container element parking a media-file URL in a data attribute (see [`mediaSrcAttributes`](/guides/customization/default-lists)) gets a native player prepended, keeping the container's caption text.

> [!NOTE]
> Streaming manifests (`.m3u8`, `.mpd`) are deliberately not promoted to native players — they play natively only in Safari, so promoting one produces a broken player everywhere else. They stay as embed placeholders.

To add your own provider, see [Widget Resolvers](/guides/customization/widget-resolvers). To fill fields the markup does not carry (a Vimeo poster, a playlist title), see [Enrichment](/guides/customization/enrichment).
