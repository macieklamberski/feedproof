import { expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, jsonAttrValue } from '../tests.js'

describeForEachParser('Tumblr', (parseHtml) => {
  // tumblrCiteResolver owns both NPF link shapes: the bare .npf_link anchor with its
  // data-npf JSON and the .npf-link-block card painted as markup. Unwrapping the
  // t.umblr.com and href.li redirectors stays with the injected cleanUrlFn on purpose.

  it('should convert an npf_link payload into a cite placeholder', async () => {
    const attrs = jsonAttrValue({
      type: 'link',
      url: 'https://example.com/post',
      display_url: 'https://example.com/post',
      title: 'Page title',
      description: 'Preview text',
      author: 'Author name',
      site_name: 'example.com',
      poster: [{ url: 'https://example.com/cover.jpg', type: 'image/jpeg' }],
    })
    const value = html`
      <p
        class="npf_link"
        data-npf="${attrs}"
      >
        <a href="https://example.com/post">Page title</a>
      </p>
    `
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-title="Page title"
        data-cite-description="Preview text"
        data-cite-author="Author name"
        data-cite-publisher="example.com"
        data-cite-thumbnail="https://example.com/cover.jpg"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // The other shape carries no JSON at all: the card is painted as markup, with the poster
  // as a CSS background-image rather than an <img>.
  it('should convert a rendered link block into a cite placeholder', async () => {
    const value = html`
      <div class="npf-link-block has-poster">
        <a href="https://example.com/post">
          <div class="poster" style="background-image:url(https://example.com/cover.png)">
            <div class="title">Page title</div>
          </div>
          <div class="bottom">
            <div class="description">Preview text</div>
            <div class="site-name">Example</div>
          </div>
        </a>
      </div>
    `
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://example.com/post"
        data-cite-title="Page title"
        data-cite-description="Preview text"
        data-cite-publisher="Example"
        data-cite-thumbnail="https://example.com/cover.png"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })

  // No cleanUrlFn is set here, so the redirector reaches the placeholder whole. That is the
  // contract: the resolver states the url the post carries and unwrapping is the caller's.
  it('should keep a redirector url for the cleanUrlFn to unwrap', async () => {
    const attrs = jsonAttrValue({
      type: 'link',
      url: 'https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fpost&t=abc',
      title: 'Page title',
    })
    const value = html`
      <p
        class="npf_link"
        data-npf="${attrs}"
      >
        <a href="https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fpost&t=abc">Page title</a>
      </p>
    `
    const expected = html`
      <div
        data-cite-provider="tumblr"
        data-cite-url="https://t.umblr.com/redirect?z=https%3A%2F%2Fexample.com%2Fpost&t=abc"
        data-cite-title="Page title"
      ></div>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
