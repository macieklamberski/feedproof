import { expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html } from '../tests.js'

describeForEachParser('Mastodon', (parseHtml) => {
  // Multi-carrier resolvers are in open PR #546; the suite becomes writable when it merges.

  it('should keep the break after a custom emoji image', async () => {
    const value = html`
      <p>
        Nice
        <img src="https://mastodon.example/custom_emojis/images/blob.png" alt=":blob:">
        <br>
        Have fun!
      </p>
    `
    const expected = html`
      <p>
        Nice
        <img src="https://mastodon.example/custom_emojis/images/blob.png" alt=":blob:" data-emoji="">
        <br>
        Have fun!
      </p>
    `

    expect(await transformContent(value, { parseHtmlFn: parseHtml })).toEqualHtml(expected)
  })
})
