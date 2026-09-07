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
})
