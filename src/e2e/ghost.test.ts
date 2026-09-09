import { expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'

describeForEachParser('Ghost', (parseHtml) => {
  // ghostMediaResolver rebuilds the kg-video-card and kg-audio-card players and
  // ghostCiteResolver converts kg-bookmark-card bookmarks. kg-file-card has no owner
  // while the file kind stays parked, and galleries are in open PR #129; add that clause
  // when it merges.

  it('should preserve ghost cite placeholders through unwrapWrappers', async () => {
    const value = html`
      <figure class="kg-card kg-bookmark-card">
        <a class="kg-bookmark-container" href="https://example.com/post">
          <div class="kg-bookmark-content">
            <div class="kg-bookmark-title">Post title</div>
            <div class="kg-bookmark-description">Preview text</div>
            <div class="kg-bookmark-metadata">
              <img class="kg-bookmark-icon" src="https://example.com/favicon.ico" alt="">
              <span class="kg-bookmark-author">Publisher name</span>
              <span class="kg-bookmark-publisher">Author name</span>
            </div>
          </div>
          <div class="kg-bookmark-thumbnail">
            <img src="https://example.com/og-image.jpg" alt="">
          </div>
        </a>
      </figure>
    `
    const expected = html`
      <div
        data-cite-provider="ghost"
        data-cite-url="https://example.com/post"
        data-cite-title="Post title"
        data-cite-description="Preview text"
        data-cite-author="Author name"
        data-cite-publisher="Publisher name"
        data-cite-icon="https://example.com/favicon.ico"
        data-cite-thumbnail="https://example.com/og-image.jpg"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The spacer poster and the scripted chrome both go, the figure's own thumbnail becomes the
  // poster, and the author's caption survives beside the player.
  it('should rebuild a video card into a playable video', async () => {
    const value = html`
      <figure
        class="kg-card kg-video-card kg-card-hascaption"
        data-kg-thumbnail="https://example.com/content/images/thumb.jpg"
      >
        <div class="kg-video-container">
          <video
            src="https://example.com/content/media/clip.mp4"
            poster="https://img.spacergif.org/v1/1920x1080/0a/spacer.png"
            width="1920"
            height="1080"
            playsinline
            preload="metadata"
          ></video>
          <div class="kg-video-overlay">
            <button class="kg-video-large-play-icon"></button>
          </div>
          <div class="kg-video-player-container">
            <div class="kg-video-player">
              <span>0:00</span>
            </div>
          </div>
        </div>
        <figcaption>Watch the full demo</figcaption>
      </figure>
    `
    const expected = html`
      <figure
        class="kg-card kg-video-card kg-card-hascaption"
        data-kg-thumbnail="https://example.com/content/images/thumb.jpg"
      >
        <video
          src="https://example.com/content/media/clip.mp4"
          poster="https://example.com/content/images/thumb.jpg"
          width="1920"
          height="1080"
          controls
        ></video>
        <figcaption>Watch the full demo</figcaption>
      </figure>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // Only the player container is replaced, so the cover the author uploaded survives beside the
  // rebuilt player. Ghost prints the track name inside that container, so it comes back as the
  // figcaption. The empty-state icon Ghost hangs beside the cover is an inline SVG in an
  // otherwise empty div, which the pipeline drops on its own.
  it('should rebuild an audio card into a playable audio beside its cover', async () => {
    const value = html`
      <div class="kg-card kg-audio-card">
        <img
          src="https://example.com/content/images/thumb.jpg"
          alt="audio-thumbnail"
          class="kg-audio-thumbnail"
        />
        <div class="kg-audio-thumbnail placeholder kg-audio-hide">
          <svg
            width="24"
            height="24"
            fill="none"
          >
            <path d="M7.5 15.33a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"></path>
          </svg>
        </div>
        <div class="kg-audio-player-container">
          <audio src="https://example.com/content/media/track.mp3" preload="metadata"></audio>
          <div class="kg-audio-title">Episode 17</div>
          <div class="kg-audio-player">
            <button class="kg-audio-play-icon" aria-label="Play audio">
              <svg viewBox="0 0 24 24">
                <path d="M23.14 10.608 2.253.164Z"></path>
              </svg>
            </button>
            <span class="kg-audio-current-time">0:00</span>
            <span class="kg-audio-duration">2:05</span>
          </div>
        </div>
      </div>
    `
    const expected = html`
      <img
        src="https://example.com/content/images/thumb.jpg"
        alt="audio-thumbnail"
        class="kg-audio-thumbnail"
      />
      <figure>
        <audio
          src="https://example.com/content/media/track.mp3"
          controls
        ></audio>
        <figcaption>Episode 17</figcaption>
      </figure>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // Ghost's own RSS cleanup unwraps the player container and adds `controls`, so the card arrives
  // playable with nothing left to rebuild.
  it('should leave a cleaned audio card alone', async () => {
    const value = html`
      <div class="kg-card kg-audio-card">
        <audio src="https://example.com/content/media/track.mp3" preload="metadata" controls></audio>
      </div>
    `
    const expected = html`
      <audio
        src="https://example.com/content/media/track.mp3"
        preload="metadata"
        controls
      ></audio>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
