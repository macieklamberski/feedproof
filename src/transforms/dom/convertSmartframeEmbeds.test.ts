import { expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { convertSmartframeEmbeds } from './convertSmartframeEmbeds.js'

describeForEachParser('convertSmartframeEmbeds', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [convertSmartframeEmbeds(baseContext)])
  }

  it('should convert the element into the thumbnail image', async () => {
    const value = html`
      <smartframe-embed
        class="smartframe_wp_element"
        customer-id="b0c95bc04383cef69c6b47df872135cf"
        image-id="WmOBDE33lTbF"
        style="width: 100%; aspect-ratio: 5239/3492;"
      ></smartframe-embed>
    `
    const expected =
      '<img src="https://thumbs.smartframe.io/b0c95bc04383cef69c6b47df872135cf/WmOBDE33lTbF.webp">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  // Ids run from six characters to twenty across the corpus, including the archive prefixes
  // some agencies use, so nothing here caps the length.
  it('should take an image id of any length', async () => {
    const value = html`
      <smartframe-embed
        customer-id="1970e2615a4bf4d8c7ab2416a1cc8d79"
        image-id="ARCH180500_00092336"
      ></smartframe-embed>
    `
    const expected =
      '<img src="https://thumbs.smartframe.io/1970e2615a4bf4d8c7ab2416a1cc8d79/ARCH180500_00092336.webp">'

    expect(await transform(value)).toEqualHtml(expected)
  })

  it('should leave an element naming no customer alone', async () => {
    const value = '<smartframe-embed image-id="WmOBDE33lTbF"></smartframe-embed>'

    expect(await transform(value)).toEqualHtml(value)
  })

  // Both halves go straight into a path, so a value that is not the shape the platform issues
  // is left where it is.
  it('should leave a customer id that is not a hash alone', async () => {
    const value = html`
      <smartframe-embed
        customer-id="../../evil"
        image-id="WmOBDE33lTbF"
      ></smartframe-embed>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should leave an image id carrying a path alone', async () => {
    const value = html`
      <smartframe-embed
        customer-id="b0c95bc04383cef69c6b47df872135cf"
        image-id="a/b"
      ></smartframe-embed>
    `

    expect(await transform(value)).toEqualHtml(value)
  })

  // The element arrives inside the paragraph the plugin wraps it in, and the picture has to
  // survive that as an ordinary image the rest of the passes then treat like any other.
  it('should reach the image through the whole pipeline', async () => {
    const value = html`
      <p class="" style="max-width: px">
        <smartframe-embed
          class="smartframe_wp_element"
          customer-id="8afcbf7a9ed3fd6bf7763b62addc7cf8"
          image-id="3He6Wc1nO734"
        ></smartframe-embed>
      </p>
    `
    const expected =
      '<p style="max-width: px"><img src="https://thumbs.smartframe.io/8afcbf7a9ed3fd6bf7763b62addc7cf8/3He6Wc1nO734.webp"></p>'

    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
    })

    expect(result).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const value = html`
      <smartframe-embed
        customer-id="b0c95bc04383cef69c6b47df872135cf"
        image-id="WmOBDE33lTbF"
      ></smartframe-embed>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
